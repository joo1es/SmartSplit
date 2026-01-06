import React, { useEffect, useRef, useState } from 'react';
import { ProcessedImage, AppSettings } from '../types';
import { ZoomIn, ZoomOut, Scissors, AlertCircle, CheckCircle2 } from 'lucide-react';

interface WorkspaceProps {
  image: ProcessedImage;
  settings: AppSettings;
  onUpdateSplitPoints: (id: string, points: number[]) => void;
  onConfirmSplits: (id: string) => void;
}

export const Workspace: React.FC<WorkspaceProps> = ({ 
  image, 
  settings,
  onUpdateSplitPoints,
  onConfirmSplits 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [zoom, setZoom] = useState(1);
  const [hoverY, setHoverY] = useState<number | null>(null);

  // Auto-fit zoom on load
  useEffect(() => {
    if (containerRef.current && image.width) {
      const containerWidth = containerRef.current.clientWidth - 48; // padding
      if (image.width > containerWidth) {
        setZoom(containerWidth / image.width);
      } else {
        setZoom(1);
      }
    }
  }, [image.id, image.width]);

  const handleImageClick = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / zoom;
    
    // Check if clicking near an existing point to remove it
    const clickThreshold = 10 / zoom;
    const existingIndex = image.splitPoints.findIndex(p => Math.abs(p - relativeY) < clickThreshold);

    let newPoints = [...image.splitPoints];
    if (existingIndex !== -1) {
      newPoints.splice(existingIndex, 1);
    } else {
      newPoints.push(Math.round(relativeY));
      newPoints.sort((a, b) => a - b);
    }
    onUpdateSplitPoints(image.id, newPoints);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!imgRef.current) return;
    const rect = imgRef.current.getBoundingClientRect();
    const relativeY = (e.clientY - rect.top) / zoom;
    setHoverY(Math.max(0, Math.min(image.height, relativeY)));
  };

  const handleMouseLeave = () => {
    setHoverY(null);
  };

  return (
    <div className="flex flex-col h-full bg-slate-100 rounded-xl overflow-hidden shadow-inner relative">
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 bg-white/90 backdrop-blur shadow-sm p-1.5 rounded-full border border-slate-200">
        <button onClick={() => setZoom(z => Math.max(0.1, z - 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ZoomOut size={16} /></button>
        <span className="text-xs font-mono w-12 text-center text-slate-500">{Math.round(zoom * 100)}%</span>
        <button onClick={() => setZoom(z => Math.min(3, z + 0.1))} className="p-2 hover:bg-slate-100 rounded-full text-slate-600"><ZoomIn size={16} /></button>
      </div>

      <div className="absolute top-4 right-4 z-20">
         <button 
          onClick={() => onConfirmSplits(image.id)}
          disabled={image.status === 'analyzing'}
          className="flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {image.status === 'analyzing' ? (
             <>Analyzing...</>
          ) : (
             <><Scissors size={18} /> Slice It</>
          )}
        </button>
      </div>

      {/* Canvas Area */}
      <div 
        ref={containerRef}
        className="flex-1 overflow-auto p-8 flex justify-center custom-scrollbar"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <div 
          className="relative shadow-2xl bg-white"
          style={{ width: image.width * zoom, height: image.height * zoom }}
        >
            {/* Base Image */}
            <img 
              ref={imgRef}
              src={image.originalUrl}
              alt="Workspace"
              className="absolute top-0 left-0 w-full h-full select-none cursor-crosshair"
              style={{ width: '100%', height: '100%' }}
              draggable={false}
              onClick={handleImageClick}
            />

            {/* Split Lines Overlay */}
            {image.splitPoints.map((y, i) => (
              <div 
                key={y}
                className="absolute left-0 w-full h-0 border-t-2 border-red-500 z-10 hover:border-4 transition-all pointer-events-none group"
                style={{ top: y * zoom }}
              >
                <div className="absolute right-0 -top-3 bg-red-500 text-white text-[10px] px-1 rounded opacity-0 group-hover:opacity-100">
                   Cut #{i+1}
                </div>
              </div>
            ))}

            {/* Hover Guide */}
            {hoverY !== null && (
               <div 
                className="absolute left-0 w-full h-0 border-t border-brand-400 border-dashed z-0 pointer-events-none opacity-50"
                style={{ top: hoverY * zoom }}
               />
            )}
        </div>
      </div>
      
      {/* Help Text */}
      <div className="bg-white px-4 py-2 border-t border-slate-200 text-xs text-slate-500 flex items-center justify-between">
         <span className="flex items-center gap-1"><AlertCircle size={12}/> Click on image to add manual cut points. Click existing red lines to remove them.</span>
         <span>Dimensions: {image.width} x {image.height}px</span>
      </div>
    </div>
  );
};
