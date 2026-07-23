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
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '16px',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)',
      }}
    >
      {/* Thumbnail or Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '10px',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          border: '1px solid var(--card-border)',
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
          <ImageIcon size={22} color="var(--text-muted)" />
        ) : (
          <FileText size={22} color="var(--text-muted)" />
        )}
      </div>

      {/* Main Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              color: 'var(--text-main)',
              fontSize: '14px',
              fontWeight: 500,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: '70%',
            }}
          >
            {file.name}
          </span>
          <span
            style={{
              padding: '2px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--card-border)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontWeight: 500,
            }}
          >
            {file.direction === 'sent' ? 'Sent' : 'Received'}
          </span>
        </div>

        {/* Progress Bar & Meta */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              flex: 1,
              height: '5px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              borderRadius: '4px',
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
                    : 'var(--text-main)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          <span style={{ color: 'var(--text-dim)', fontSize: '12px', minWidth: '55px', textAlign: 'right' }}>
            {file.status === 'transferring' ? `${file.progress}%` : formatSize(file.size)}
          </span>
        </div>

        {file.status === 'transferring' && file.speed && (
          <div style={{ color: 'var(--text-dim)', fontSize: '11px', marginTop: '4px' }}>
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
            style={{
              padding: '8px 14px',
              backgroundColor: 'var(--btn-primary-bg)',
              color: 'var(--btn-primary-text)',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 500,
            }}
          >
            <Download size={14} /> Save
          </a>
        )}
        {file.status === 'completed' && !file.url && (
          <CheckCircle2 size={22} color="#10b981" />
        )}
        {file.status === 'transferring' && (
          <Loader2 size={22} className="spin" color="var(--text-muted)" />
        )}
        {file.status === 'error' && (
          <AlertCircle size={22} color="#ef4444" />
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
