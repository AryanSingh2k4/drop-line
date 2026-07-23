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
      if (file.size > 100 * 1024 * 1024) {
        alert(`File "${file.name}" is too large. Files must be 100 MB or smaller.`);
        return;
      }
      sendFile(file);
    });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: 'var(--bg-primary)',
        background: 'radial-gradient(circle at 50% 0%, var(--bg-secondary) 0%, var(--bg-primary) 70%)',
        padding: '48px 24px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      <main style={{ maxWidth: '760px', width: '100%' }}>
        {/* Top Header Bar */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '32px',
          }}
        >
          <button
            onClick={() => router.push('/')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              color: 'var(--text-muted)',
              fontSize: '14px',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: '10px',
              backgroundColor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              backdropFilter: 'blur(12px)',
              transition: 'all 0.2s ease',
            }}
          >
            <ArrowLeft size={16} /> Leave Room
          </button>

          <PeerStatus status={peerStatus} />
        </div>

        {/* Room Code Main Card */}
        <div
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            borderRadius: '20px',
            padding: '28px 32px',
            backdropFilter: 'blur(16px)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
          }}
        >
          <div>
            <span
              style={{
                color: 'var(--text-dim)',
                fontSize: '12px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '1.5px',
                display: 'block',
                marginBottom: '4px',
              }}
            >
              Room Code
            </span>
            <h1
              style={{
                color: 'var(--text-main)',
                fontSize: '36px',
                fontFamily: 'monospace',
                fontWeight: 700,
                letterSpacing: '6px',
                margin: 0,
              }}
            >
              {roomCode}
            </h1>
          </div>

          <button
            onClick={handleCopyLink}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '12px 20px',
              backgroundColor: 'var(--btn-secondary-bg)',
              border: '1px solid var(--btn-secondary-border)',
              borderRadius: '12px',
              color: 'var(--btn-secondary-text)',
              fontSize: '14px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {copied ? (
              <>
                <Check size={16} color="#10b981" /> Link Copied!
              </>
            ) : (
              <>
                <Copy size={16} /> Share Room Link
              </>
            )}
          </button>
        </div>

        {/* Security & Info Banner */}
        <div
          style={{
            display: 'flex',
            gap: '24px',
            marginBottom: '24px',
            padding: '14px 20px',
            borderRadius: '12px',
            backgroundColor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            backdropFilter: 'blur(12px)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <ShieldCheck size={16} color="var(--text-main)" />
            <span>End-to-End Peer-to-Peer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Zap size={16} color="var(--text-main)" />
            <span>Zero Storage / Direct Speed</span>
          </div>
        </div>

        {/* File Dropzone */}
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={!isPeerConnected}
        />

        {/* Files List Section */}
        {files.length > 0 && (
          <div style={{ marginTop: '32px' }}>
            <h2
              style={{
                color: 'var(--text-main)',
                fontSize: '18px',
                fontWeight: 500,
                marginBottom: '16px',
                fontFamily: 'var(--font-serif)',
              }}
            >
              Transfers ({files.length})
            </h2>
            {files.map((file) => (
              <FileCard key={file.id} file={file} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
