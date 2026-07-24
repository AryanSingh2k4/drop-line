'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { PeerStatus } from '@/components/PeerStatus';
import { FileDropZone } from '@/components/FileDropZone';
import { FileCard } from '@/components/FileCard';
import { TextShareZone } from '@/components/TextShareZone';
import { Copy, Check, ArrowLeft, ShieldCheck, Zap, FileUp, Code2 } from 'lucide-react';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase() || '';
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');

  const { peerStatus, isPeerConnected, files, sendFile, textItems, sendTextMessage } = useWebRTC(roomCode);

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
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              padding: '8px 14px',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border)',
              transition: 'background-color 0.2s ease',
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
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-xl)',
            padding: '28px 32px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div>
            <span
              style={{
                color: 'var(--text-dim)',
                fontSize: '12px',
                fontFamily: 'var(--font-sans)',
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
                fontSize: '32px',
                fontFamily: 'var(--font-mono)',
                fontWeight: 700,
                letterSpacing: '4px',
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
              borderRadius: 'var(--radius-md)',
              color: 'var(--btn-secondary-text)',
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'background-color 0.2s ease',
            }}
          >
            {copied ? (
              <>
                <Check size={16} color="var(--success)" /> Link Copied!
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
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-secondary)',
            border: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
            <ShieldCheck size={16} color="var(--text-main)" />
            <span>End-to-End Peer-to-Peer</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-muted)', fontSize: '13px', fontFamily: 'var(--font-sans)' }}>
            <Zap size={16} color="var(--text-main)" />
            <span>Zero Storage / Direct Speed</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div
          style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '20px',
            backgroundColor: 'var(--bg-secondary)',
            padding: '6px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border)',
          }}
        >
          <button
            onClick={() => setActiveTab('files')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'files' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'files' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 500,
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderWidth: activeTab === 'files' ? '1px' : '0px',
              borderStyle: 'solid',
              borderColor: activeTab === 'files' ? 'var(--border)' : 'transparent',
            }}
          >
            <FileUp size={16} /> File Sharing {files.length > 0 && `(${files.length})`}
          </button>

          <button
            onClick={() => setActiveTab('text')}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              borderRadius: 'var(--radius-sm)',
              border: 'none',
              backgroundColor: activeTab === 'text' ? 'var(--card-bg)' : 'transparent',
              color: activeTab === 'text' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 500,
              fontSize: '14px',
              fontFamily: 'var(--font-sans)',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              borderWidth: activeTab === 'text' ? '1px' : '0px',
              borderStyle: 'solid',
              borderColor: activeTab === 'text' ? 'var(--border)' : 'transparent',
            }}
          >
            <Code2 size={16} /> Code & Text {textItems.length > 0 && `(${textItems.length})`}
          </button>
        </div>

        {/* Tab Contents */}
        {activeTab === 'files' ? (
          <div>
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
                    fontSize: '22px',
                    fontWeight: 400,
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
          </div>
        ) : (
          <TextShareZone
            onSendText={sendTextMessage}
            disabled={!isPeerConnected}
            textItems={textItems}
          />
        )}
      </main>
    </div>
  );
}
