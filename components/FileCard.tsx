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
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-lg)',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        marginBottom: '12px',
      }}
    >
      {/* Thumbnail or Icon */}
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border)',
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
              fontFamily: 'var(--font-sans)',
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
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)',
              fontSize: '11px',
              fontFamily: 'var(--font-sans)',
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
              height: '4px',
              backgroundColor: 'var(--bg-secondary)',
              borderRadius: '2px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                width: `${file.progress}%`,
                height: '100%',
                backgroundColor:
                  file.status === 'error'
                    ? 'var(--error)'
                    : file.status === 'completed'
                    ? 'var(--success)'
                    : 'var(--text-main)',
                transition: 'width 0.2s ease',
              }}
            />
          </div>

          <span style={{ color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-sans)', minWidth: '55px', textAlign: 'right' }}>
            {file.status === 'transferring' ? `${file.progress}%` : formatSize(file.size)}
          </span>
        </div>

        {file.status === 'transferring' && file.speed && (
          <div style={{ color: 'var(--text-dim)', fontSize: '11px', fontFamily: 'var(--font-sans)', marginTop: '4px' }}>
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
              backgroundColor: 'var(--button-primary)',
              color: 'var(--button-primary-text)',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
            }}
          >
            <Download size={14} /> Save
          </a>
        )}
        {file.status === 'completed' && !file.url && (
          <CheckCircle2 size={20} color="var(--success)" />
        )}
        {file.status === 'transferring' && (
          <Loader2 size={20} className="spin" color="var(--text-muted)" />
        )}
        {file.status === 'error' && (
          <AlertCircle size={20} color="var(--error)" />
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
