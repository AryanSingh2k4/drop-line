'use client';

import React from 'react';
import { Download, FileText, Image as ImageIcon, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';
import { FileItem } from '@/hooks/useWebRTC';

interface FileCardProps {
  file: FileItem;
}

export const FileCard: React.FC<FileCardProps> = ({ file }) => {
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const isImage = file.type.startsWith('image/');

  return (
    <div
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-16)',
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--spacing-16)',
        marginBottom: 'var(--spacing-12)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      }}
    >
      {/* Thumbnail or Icon */}
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--surface-elevated)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {isImage && file.url ? (
          /* eslint-disable-next-link @next/next/no-img-element */
          <img
            src={file.url}
            alt={file.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        ) : isImage ? (
          <ImageIcon size={24} color="var(--text-secondary)" />
        ) : (
          <FileText size={24} color="var(--text-secondary)" />
        )}
      </div>

      {/* Main Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 'var(--spacing-4)',
          }}
        >
          <span
            className="ui-medium"
            style={{
              color: 'var(--text-primary)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '70%',
            }}
          >
            {file.name}
          </span>
          <span
            className="ui-small"
            style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-xs)',
              backgroundColor:
                file.direction === 'sent'
                  ? 'var(--surface-elevated)'
                  : 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            {file.direction === 'sent' ? 'Sent' : 'Received'}
          </span>
        </div>

        {/* Progress Bar & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-12)' }}>
          <div
            style={{
              flex: 1,
              height: '6px',
              backgroundColor: 'var(--border-subtle)',
              borderRadius: 'var(--radius-xs)',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${file.progress}%`,
                height: '100%',
                backgroundColor:
                  file.status === 'error'
                    ? '#ef4444'
                    : file.status === 'completed'
                    ? '#10b981'
                    : 'var(--text-primary)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          <span className="ui-xsmall" style={{ color: 'var(--text-tertiary)', minWidth: '60px', textAlign: 'right' }}>
            {file.status === 'transferring' ? `${file.progress}%` : formatSize(file.size)}
          </span>
        </div>

        {file.status === 'transferring' && file.speed && (
          <div className="ui-xsmall" style={{ color: 'var(--text-tertiary)', marginTop: '4px' }}>
            Speed: {file.speed}
          </div>
        )}
      </div>

      {/* Action / Status Icon */}
      <div>
        {file.status === 'completed' && file.url && (
          <a
            href={file.url}
            download={file.name}
            className="ui-medium"
            style={{
              padding: 'var(--spacing-8) var(--spacing-12)',
              backgroundColor: 'var(--button-primary-bg)',
              color: 'var(--button-primary-text)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              textDecoration: 'none',
            }}
          >
            <Download size={16} /> Save
          </a>
        )}
        {file.status === 'completed' && !file.url && (
          <CheckCircle2 size={24} color="#10b981" />
        )}
        {file.status === 'transferring' && (
          <Loader2 size={24} className="spin" color="var(--text-secondary)" />
        )}
        {file.status === 'error' && (
          <AlertCircle size={24} color="#ef4444" />
        )}
      </div>

      <style jsx>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};
