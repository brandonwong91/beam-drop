import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, 
  FolderUp, 
  Plus, 
  Sparkles, 
  UploadCloud, 
  Zap 
} from 'lucide-react';

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
}

export const FileDropZone: React.FC<FileDropZoneProps> = ({
  onFilesSelected,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dragCounter = useRef(0);

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      onFilesSelected(filesArray);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = Array.from(e.target.files);
      onFilesSelected(filesArray);
      // Reset input so re-selecting the same file fires onChange again
      e.target.value = '';
    }
  };

  // Support clipboard paste for screenshots or files
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (disabled) return;
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const filesArray = Array.from(e.clipboardData.files);
        onFilesSelected(filesArray);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [onFilesSelected, disabled]);

  return (
    <div
      id="file-drop-zone"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      className={`relative group cursor-pointer border-2 border-dashed rounded-2xl p-8 sm:p-10 text-center transition-all duration-200 ${
        isDragging
          ? 'border-blue-500 bg-blue-50/60 scale-[1.01]'
          : 'border-slate-300 hover:border-blue-500 bg-white hover:bg-slate-50/60 shadow-xs'
      } ${disabled ? 'opacity-60 pointer-events-none' : ''}`}
    >
      <input
        ref={fileInputRef}
        id="file-picker-input"
        type="file"
        multiple
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Center Icon */}
      <div className="mx-auto w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-4 group-hover:scale-105 group-hover:bg-blue-100 transition duration-200">
        <UploadCloud className="w-7 h-7" />
      </div>

      {/* Primary Action Text */}
      <h3 className="text-base sm:text-lg font-bold text-slate-900 mb-1">
        {isDragging ? 'Drop files to send immediately' : 'Choose files to share via P2P'}
      </h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto mb-4">
        Drag & drop any file, paste from clipboard (<kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-slate-100 rounded border border-slate-200 text-slate-700">Ctrl+V</kbd>), or click to browse.
      </p>

      {/* Feature tags */}
      <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-slate-600">
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-50/80 border border-orange-200 text-orange-700 font-medium">
          <Zap className="w-3 h-3 text-orange-600" /> HTML Live Interactive Preview
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-medium">
          <Sparkles className="w-3 h-3 text-blue-600" /> End-to-End Encrypted
        </span>
        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 font-medium">
          <Zap className="w-3 h-3 text-amber-500" /> Direct P2P Stream
        </span>
      </div>
    </div>
  );
};
