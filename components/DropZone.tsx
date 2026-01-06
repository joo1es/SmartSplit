import React, { useCallback, useState } from 'react';
import { Upload, ImagePlus } from 'lucide-react';

interface DropZoneProps {
  onFilesDropped: (files: File[]) => void;
  compact?: boolean;
}

export const DropZone: React.FC<DropZoneProps> = ({ onFilesDropped, compact }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'));
    if (files.length > 0) onFilesDropped(files);
  }, [onFilesDropped]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files).filter(f => f.type.startsWith('image/'));
      if (files.length > 0) onFilesDropped(files);
    }
  }, [onFilesDropped]);

  if (compact) {
    return (
      <div className="relative group">
         <input
          type="file"
          multiple
          accept="image/*"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          onChange={handleInputChange}
        />
        <button className="flex items-center justify-center w-full p-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-brand-500 hover:text-brand-500 transition-colors">
          <ImagePlus size={20} className="mr-2" />
          <span className="text-sm font-medium">Add Images</span>
        </button>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        relative flex flex-col items-center justify-center w-full h-64 md:h-96 
        rounded-2xl border-2 border-dashed transition-all duration-300 ease-out
        ${isDragging 
          ? 'border-brand-500 bg-brand-50 scale-[0.99]' 
          : 'border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50'
        }
      `}
    >
      <input
        type="file"
        multiple
        accept="image/*"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        onChange={handleInputChange}
      />
      
      <div className="flex flex-col items-center pointer-events-none">
        <div className={`p-4 rounded-full mb-4 ${isDragging ? 'bg-brand-100 text-brand-600' : 'bg-slate-100 text-slate-400'}`}>
          <Upload size={32} />
        </div>
        <h3 className="text-xl font-semibold text-slate-700 mb-2">
          {isDragging ? 'Drop images now' : 'Drag & Drop Images'}
        </h3>
        <p className="text-slate-500 text-center max-w-xs">
          Supports JPG, PNG, WEBP. Paste (Ctrl+V) also supported anywhere.
        </p>
      </div>
    </div>
  );
};
