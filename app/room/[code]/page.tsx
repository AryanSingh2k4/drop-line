'use client';

import React, { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { PeerStatus } from '@/components/PeerStatus';
import { FileDropZone } from '@/components/FileDropZone';
import { FileCard } from '@/components/FileCard';
import { TextShareZone } from '@/components/TextShareZone';
import { Copy, Check, ArrowLeft, ShieldCheck, Zap, FileUp, Code2 } from 'lucide-react';
import styles from './room.module.css';

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
    <div className={styles.pageWrapper}>
      <main className={styles.mainContainer}>
        {/* Top Header Bar */}
        <div className={styles.headerBar}>
          <button
            onClick={() => router.push('/')}
            className={styles.leaveButton}
          >
            <ArrowLeft size={16} /> Leave Room
          </button>

          <PeerStatus status={peerStatus} />
        </div>

        {/* Room Code Main Card */}
        <div className={styles.roomCard}>
          <div>
            <span className={styles.roomCodeLabel}>
              Room Code
            </span>
            <h1 className={styles.roomCodeValue}>
              {roomCode}
            </h1>
          </div>

          <button
            onClick={handleCopyLink}
            className={styles.shareButton}
          >
            {copied ? (
              <>
                <Check size={16} color="var(--success)" /> <span>Link Copied!</span>
              </>
            ) : (
              <>
                <Copy size={16} /> <span>Share Room Link</span>
              </>
            )}
          </button>
        </div>

        {/* Security & Info Banner */}
        <div className={styles.infoBanner}>
          <div className={styles.infoItem}>
            <ShieldCheck size={16} color="var(--text-main)" />
            <span>End-to-End Peer-to-Peer</span>
          </div>
          <div className={styles.infoItem}>
            <Zap size={16} color="var(--text-main)" />
            <span>Zero Storage / Direct Speed</span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className={styles.tabContainer}>
          <button
            onClick={() => setActiveTab('files')}
            className={`${styles.tabButton} ${activeTab === 'files' ? styles.tabActive : styles.tabInactive}`}
          >
            <FileUp size={16} /> File Sharing {files.length > 0 && `(${files.length})`}
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`${styles.tabButton} ${activeTab === 'text' ? styles.tabActive : styles.tabInactive}`}
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
                <h2 className={styles.transfersTitle}>
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
