'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { PeerStatus } from '@/components/PeerStatus';
import { FileDropZone } from '@/components/FileDropZone';
import { FileCard } from '@/components/FileCard';
import { Copy, Check, ArrowLeft, ShieldCheck, Zap, AlertTriangle } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase() || '';
  const [copied, setCopied] = useState(false);

  // Validate room code format: /^[A-Z0-9]{6}$/
  const isValidCode = /^[A-Z0-9]{6}$/.test(roomCode);

  const { peerStatus, isPeerConnected, files, roomError, sendFile } = useWebRTC(isValidCode ? roomCode : '');

  const handleCopyLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFilesSelected = (selectedFiles: File[]) => {
    sendFile(selectedFiles);
  };

  if (!isValidCode) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          textAlign: 'center',
          backgroundColor: 'var(--bg-primary)',
        }}
      >
        <AlertTriangle size={48} color="#ef4444" style={{ marginBottom: '16px' }} />
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: '28px', color: 'var(--text-main)', marginBottom: '8px' }}>
          Invalid Room Code
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '15px', marginBottom: '24px', maxWidth: '400px' }}>
          Room codes must be exactly 6 uppercase letters or numbers (e.g. A3X9K2).
        </p>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '12px 24px',
            backgroundColor: 'var(--btn-primary-bg)',
            color: 'var(--btn-primary-text)',
            borderRadius: '12px',
            fontWeight: 500,
          }}
        >
          Return Home
        </button>
      </div>
    );
  }

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

        {/* 2-Device Room Cap Error Notice */}
        {roomError && (
          <div
            style={{
              marginBottom: '24px',
              padding: '16px 20px',
              borderRadius: '16px',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.3)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              fontSize: '15px',
              fontWeight: 500,
            }}
          >
            <AlertTriangle size={20} />
            <span>{roomError}</span>
          </div>
        )}

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
            <span>Strict 2-Device Limit</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px' }}>
            <Zap size={16} color="var(--text-main)" />
            <span>Max 100 MB / File</span>
          </div>
        </div>

        {/* File Dropzone */}
        <FileDropZone
          onFilesSelected={handleFilesSelected}
          disabled={!isPeerConnected || peerStatus === 'room_full'}
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
