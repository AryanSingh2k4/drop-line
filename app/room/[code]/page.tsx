'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { PeerStatus } from '@/components/PeerStatus';
import { FileDropZone } from '@/components/FileDropZone';
import { FileCard } from '@/components/FileCard';
import { Copy, Check, ArrowLeft, ShieldCheck, Zap } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase() || '';
  const [copied, setCopied] = useState(false);

  const { peerStatus, isPeerConnected, files, sendFile } = useWebRTC(roomCode);

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    selectedFiles.forEach((file) => {
      sendFile(file);
    });
  };

  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: 'var(--surface-base)',
        padding: 'var(--spacing-32) var(--spacing-24)',
        maxWidth: '800px',
        margin: '0 auto',
      }}
    >
      {/* Top Bar */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-32)',
        }}
      >
        <button
          onClick={() => router.push('/')}
          className="ui-medium"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-8)',
            color: 'var(--text-secondary)',
          }}
        >
          <ArrowLeft size={18} /> Leave Room
        </button>

        <PeerStatus status={peerStatus} />
      </div>

      {/* Room Code Card */}
      <div
        style={{
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: 'var(--spacing-24)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 'var(--spacing-24)',
        }}
      >
        <div>
          <span className="ui-small" style={{ color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '1px' }}>
            Room Code
          </span>
          <h1
            className="display-section"
            style={{
              color: 'var(--text-primary)',
              margin: 'var(--spacing-4) 0 0 0',
              fontFamily: 'monospace',
              letterSpacing: '4px',
            }}
          >
            {roomCode}
          </h1>
        </div>

        <button
          onClick={handleCopyLink}
          className="ui-medium"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-8)',
            padding: 'var(--spacing-12) var(--spacing-20)',
            backgroundColor: 'var(--button-secondary-bg)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            color: 'var(--button-secondary-text)',
            transition: 'all 0.2s ease',
          }}
        >
          {copied ? (
            <>
              <Check size={18} color="#10b981" /> Link Copied!
            </>
          ) : (
            <>
              <Copy size={18} /> Share Room Link
            </>
          )}
        </button>
      </div>

      {/* Security & Info Banner */}
      <div
        style={{
          display: 'flex',
          gap: 'var(--spacing-24)',
          marginBottom: 'var(--spacing-24)',
          padding: 'var(--spacing-16)',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--surface-card)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <ShieldCheck size={18} />
          <span className="ui-small">End-to-End Peer-to-Peer</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
          <Zap size={18} />
          <span className="ui-small">Zero Storage / Unlimited Speed</span>
        </div>
      </div>

      {/* File Dropzone */}
      <FileDropZone
        onFilesSelected={handleFilesSelected}
        disabled={!isPeerConnected}
      />

      {/* Files List Section */}
      {files.length > 0 && (
        <div style={{ marginTop: 'var(--spacing-32)' }}>
          <h2
            className="display-small"
            style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-16)' }}
          >
            Transfers ({files.length})
          </h2>
          {files.map((file) => (
            <FileCard key={file.id} file={file} />
          ))}
        </div>
      )}
    </main>
  );
}
