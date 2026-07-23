'use client';

import React, { useRef, useState } from 'react';
import { Upload, FileText, Image as ImageIcon } from 'lucide-react';

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

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (disabled) return;
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const droppedFiles = Array.from(e.dataTransfer.files);
      onFilesSelected(droppedFiles);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      onFilesSelected(selectedFiles);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      style={{
        border: `2px dashed ${
          isDragging ? 'var(--text-main)' : 'var(--card-border)'
        }`,
        borderRadius: '20px',
        padding: '48px 24px',
        backgroundColor: isDragging ? 'rgba(255, 255, 255, 0.06)' : 'var(--card-bg)',
        backdropFilter: 'blur(16px)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.25s ease',
        opacity: disabled ? 0.6 : 1,
        boxShadow: isDragging ? '0 8px 32px rgba(0,0,0,0.2)' : 'none',
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.png,.jpg,.jpeg,.gif,.webp"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
        disabled={disabled}
      />

      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '16px',
          marginBottom: '16px',
          color: 'var(--text-muted)',
        }}
      >
        <Upload size={28} />
        <ImageIcon size={28} />
        <FileText size={28} />
      </div>

      <h3
        style={{
          color: 'var(--text-main)',
          marginBottom: '8px',
          fontSize: '18px',
          fontFamily: 'var(--font-serif)',
          fontWeight: 400,
        }}
      >
        {disabled
          ? 'Waiting for Peer to Connect...'
          : 'Drag & Drop files here or click to browse'}
      </h3>

      <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
        Supports PDFs, PNGs, JPGs, GIFs & WebP images
      </p>

      {!disabled && (
        <button
          type="button"
          style={{
            marginTop: '20px',
            padding: '12px 24px',
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            borderRadius: '12px',
            fontSize: '14px',
            fontWeight: 500,
            display: 'inline-block',
          }}
        >
          Select Files
        </button>
      )}
    </div>
  );
};
