import React from 'react';
import { ProcessedImage, ImageSegment } from '../types';
import { Download, CheckSquare, Square, X } from 'lucide-react';
import JSZip from 'jszip';
import saveAs from 'file-saver';

interface ResultPanelProps {
  image: ProcessedImage;
  onUpdateSegment: (imgId: string, segmentId: string, updates: Partial<ImageSegment>) => void;
  onClose: () => void;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({ image, onUpdateSegment, onClose }) => {
  
  const toggleSelect = (segId: string, current: boolean) => {
    onUpdateSegment(image.id, segId, { selected: !current });
  };

  const selectedCount = image.segments.filter(s => s.selected).length;

  const handleDownload = async () => {
    const zip = new JSZip();
    const folder = zip.folder(`split_${image.id.substring(0,6)}`);
    
    image.segments.forEach((seg, idx) => {
      if (seg.selected) {
        // Pads index: 001, 002...
        const fileName = `part_${(idx + 1).toString().padStart(3, '0')}.jpg`;
        folder?.file(fileName, seg.blob);
      }
    });

    const content = await zip.generateAsync({ type: 'blob' });
    
    // FileSaver compatibility handling
    // Some builds export the function as default, others as a named property of default
    const saveFunction = (saveAs as any).saveAs || saveAs;
    saveFunction(content, `split-images-${image.file.name.split('.')[0]}.zip`);
  };

  return (
    <div className="h-full flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
        <div>
          <h3 className="font-semibold text-slate-800">Results</h3>
          <p className="text-xs text-slate-500">{image.segments.length} segments generated</p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded text-slate-500">
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {image.segments.map((seg, idx) => (
            <div 
              key={seg.id} 
              className={`
                group relative border-2 rounded-lg overflow-hidden transition-all cursor-pointer
                ${seg.selected ? 'border-brand-500 shadow-md' : 'border-slate-100 opacity-60 hover:opacity-100'}
              `}
              onClick={() => toggleSelect(seg.id, seg.selected)}
            >
              <div className="aspect-[3/4] bg-slate-100 relative">
                <img src={seg.url} alt={`Part ${idx}`} className="w-full h-full object-contain" />
              </div>
              <div className="absolute top-2 left-2">
                 {seg.selected 
                    ? <CheckSquare className="text-brand-600 bg-white rounded-sm" size={20} />
                    : <Square className="text-slate-400 bg-white rounded-sm" size={20} />
                 }
              </div>
              <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] p-1 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                {seg.height}px
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50">
        <button 
          onClick={handleDownload}
          disabled={selectedCount === 0}
          className="w-full flex items-center justify-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium shadow transition-all"
        >
          <Download size={18} />
          Download {selectedCount} Images (ZIP)
        </button>
      </div>
    </div>
  );
};
