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
          isDragging ? 'var(--text-primary)' : 'var(--border-subtle)'
        }`,
        borderRadius: 'var(--radius-xl)',
        padding: 'var(--spacing-48) var(--spacing-24)',
        backgroundColor: isDragging
          ? 'var(--surface-elevated)'
          : 'var(--surface-white)',
        textAlign: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.6 : 1,
        boxShadow: isDragging ? '0 4px 20px rgba(0,0,0,0.06)' : 'none',
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
          gap: 'var(--spacing-16)',
          marginBottom: 'var(--spacing-16)',
          color: 'var(--text-secondary)',
        }}
      >
        <Upload size={32} />
        <ImageIcon size={32} />
        <FileText size={32} />
      </div>

      <h3
        className="display-sub"
        style={{
          color: 'var(--text-primary)',
          marginBottom: 'var(--spacing-8)',
          fontSize: '20px',
        }}
      >
        {disabled
          ? 'Waiting for Peer to Connect...'
          : 'Drag & Drop files here or click to browse'}
      </h3>

      <p className="ui-body" style={{ color: 'var(--text-secondary)' }}>
        Supports PDFs, PNGs, JPGs, GIFs & WebP images
      </p>

      {!disabled && (
        <button
          type="button"
          className="ui-medium"
          style={{
            marginTop: 'var(--spacing-20)',
            padding: 'var(--spacing-12) var(--spacing-24)',
            backgroundColor: 'var(--action-fill)',
            color: 'var(--surface-base)',
            borderRadius: 'var(--radius-md)',
            display: 'inline-block',
          }}
        >
          Select Files
        </button>
      )}
    </div>
  );
};
