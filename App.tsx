import React, { useState, useEffect, useCallback } from 'react';
import { Upload, Image as ImageIcon, Github, Scissors } from 'lucide-react';
import { DropZone } from './components/DropZone';
import { Workspace } from './components/Workspace';
import { SettingsPanel } from './components/SettingsPanel';
import { ResultPanel } from './components/ResultPanel';
import { ProcessedImage, AppSettings } from './types';
import { loadImage, detectSplitPoints, sliceImage, uuid } from './utils/imageHelper';

const DEFAULT_SETTINGS: AppSettings = {
  sensitivity: 50,
  fastMode: true,
  minSegmentHeight: 100, // 100px min
};

export default function App() {
  const [images, setImages] = useState<ProcessedImage[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  
  // Computed active image
  const activeImage = images.find(img => img.id === activeId);

  // --- Handlers ---

  const handleFiles = async (files: File[]) => {
    const newImages: ProcessedImage[] = [];

    for (const file of files) {
      try {
        const imgEl = await loadImage(file);
        const id = uuid();
        const newImg: ProcessedImage = {
          id,
          file,
          originalUrl: imgEl.src,
          width: imgEl.width,
          height: imgEl.height,
          splitPoints: [],
          segments: [],
          status: 'idle'
        };
        newImages.push(newImg);
      } catch (e) {
        console.error("Failed to load image", file.name, e);
      }
    }

    if (newImages.length > 0) {
      setImages(prev => [...prev, ...newImages]);
      // Auto select the first new one if none selected
      if (!activeId) setActiveId(newImages[0].id);
      
      // Auto-run detection for new images
      setTimeout(() => {
        newImages.forEach(img => runDetection(img.id, settings));
      }, 100);
    }
  };

  const runDetection = async (id: string, currentSettings: AppSettings) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'analyzing' } : img));
    
    // Allow UI to update before heavy calc
    await new Promise(r => setTimeout(r, 50));

    try {
      // Find current image state
      const target = images.find(img => img.id === id) || 
                     (await new Promise<ProcessedImage | undefined>(resolve => {
                        // Tricky: we need the latest state if called from upload immediately
                        // In a real app we might pass the object directly, but ID is safer for state updates
                        // We will rely on functional updates mostly, but here we need the HTMLImage element
                        // We can re-create it from URL
                        resolve(undefined);
                     }));
                     
      // Re-fetch image element for processing
      // We grab it from DOM or create new one? Creating new is safer/cleaner logic
      const currentImgState = images.find(i => i.id === id); 
      if (!currentImgState) return;

      const imgEl = new Image();
      imgEl.src = currentImgState.originalUrl;
      await new Promise(r => imgEl.onload = r);

      const points = detectSplitPoints(imgEl, currentSettings);
      
      setImages(prev => prev.map(img => 
        img.id === id ? { ...img, splitPoints: points, status: 'done', segments: [] } : img
      ));

    } catch (e) {
      console.error(e);
      setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'error' } : img));
    }
  };

  const handleUpdateSplitPoints = (id: string, points: number[]) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, splitPoints: points, segments: [] } : img));
  };

  const handleConfirmSplits = async (id: string) => {
    const target = images.find(i => i.id === id);
    if (!target) return;

    setImages(prev => prev.map(img => img.id === id ? { ...img, status: 'analyzing' } : img));
    await new Promise(r => setTimeout(r, 50));

    const imgEl = new Image();
    imgEl.src = target.originalUrl;
    await new Promise(r => imgEl.onload = r);

    const segments = await sliceImage(imgEl, target.splitPoints);
    
    setImages(prev => prev.map(img => 
      img.id === id ? { ...img, segments, status: 'done' } : img
    ));
  };

  const handlePaste = useCallback((e: ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const files: File[] = [];
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) files.push(file);
      }
    }
    if (files.length > 0) handleFiles(files);
  }, [images]); // dependencies needed to safely update state if used inside effect without refs, but handleFiles uses setImages functional update

  useEffect(() => {
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [handlePaste]);


  // --- Render ---

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900">
      
      {/* Header */}
      <header className="flex-none h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-brand-600 p-2 rounded-lg text-white">
            <Scissors size={20} />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-brand-600 to-indigo-600">
            SmartSplit
          </h1>
        </div>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-600">
          <a href="#" className="hover:text-brand-600 flex items-center gap-1"><Github size={16}/> GitHub</a>
        </div>
      </header>

      {/* Main Layout */}
      <main className="flex-1 flex overflow-hidden">
        
        {/* Sidebar (Thumbnails) */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col flex-none">
          <div className="p-4 border-b border-slate-100">
            <DropZone onFilesDropped={handleFiles} compact />
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
            {images.map(img => (
              <div 
                key={img.id}
                onClick={() => setActiveId(img.id)}
                className={`
                  flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors border
                  ${activeId === img.id ? 'bg-brand-50 border-brand-200' : 'hover:bg-slate-50 border-transparent'}
                `}
              >
                <img src={img.originalUrl} className="w-10 h-10 object-cover rounded bg-slate-200" />
                <div className="overflow-hidden">
                  <p className="text-sm font-medium truncate text-slate-700">{img.file.name}</p>
                  <p className="text-xs text-slate-400">{img.status}</p>
                </div>
              </div>
            ))}
            {images.length === 0 && (
              <div className="text-center p-8 text-slate-400 text-xs">
                No images yet.
              </div>
            )}
          </div>
        </aside>

        {/* Center Workspace */}
        <section className="flex-1 flex flex-col min-w-0 bg-slate-50/50 p-4 relative">
          {activeImage ? (
            <Workspace 
              image={activeImage} 
              settings={settings}
              onUpdateSplitPoints={handleUpdateSplitPoints}
              onConfirmSplits={handleConfirmSplits}
            />
          ) : (
             <div className="flex-1 flex flex-col items-center justify-center">
               {images.length === 0 ? (
                 <div className="w-full max-w-xl">
                   <DropZone onFilesDropped={handleFiles} />
                 </div>
               ) : (
                 <p className="text-slate-400">Select an image from the sidebar to edit.</p>
               )}
             </div>
          )}
        </section>

        {/* Right Settings/Results Panel */}
        {activeImage && (
          <aside className="w-80 bg-white border-l border-slate-200 flex flex-col p-4 gap-4 overflow-y-auto shadow-xl z-20">
             {activeImage.segments.length > 0 ? (
               <ResultPanel 
                 image={activeImage}
                 onUpdateSegment={(imgId, segId, updates) => {
                   setImages(prev => prev.map(img => 
                     img.id === imgId ? { 
                       ...img, 
                       segments: img.segments.map(s => s.id === segId ? { ...s, ...updates } : s)
                     } : img
                   ));
                 }}
                 onClose={() => handleConfirmSplits(activeImage.id).then(() => {
                    // Hacky way to reset segments if needed or just clear them
                    // Actually, let's keep them but maybe just show settings again?
                    // For now, if user closes results, we clear segments to re-edit
                    setImages(prev => prev.map(i => i.id === activeImage.id ? { ...i, segments: [] } : i));
                 })}
               />
             ) : (
               <SettingsPanel 
                  settings={settings}
                  onChange={setSettings}
                  onReRun={() => runDetection(activeImage.id, settings)}
               />
             )}
          </aside>
        )}

      </main>
    </div>
  );
}