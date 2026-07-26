'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { PeerStatus } from '@/components/PeerStatus';
import { FileDropZone } from '@/components/FileDropZone';
import { FileCard } from '@/components/FileCard';
import { TextShareZone } from '@/components/TextShareZone';
import { Copy, Check, ArrowLeft, ShieldCheck, Zap, FileUp, Code2, QrCode, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './room.module.css';

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase() || '';
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'files' | 'text'>('files');
  const [showQrModal, setShowQrModal] = useState(false);
  const [roomUrl, setRoomUrl] = useState('');

  const { peerStatus, isPeerConnected, files, sendFile, textItems, sendTextMessage } = useWebRTC(roomCode);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setRoomUrl(window.location.href);
    }
  }, []);

  const handleCopyLink = () => {
    const url = roomUrl || window.location.href;
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

          <div className={styles.buttonGroup}>
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
                  <Copy size={16} /> <span>Share Link</span>
                </>
              )}
            </button>

            <button
              onClick={() => setShowQrModal(true)}
              className={styles.qrButton}
              title="Show QR Code"
            >
              <QrCode size={16} />
              <span>QR Code</span>
            </button>
          </div>
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

        {/* QR Code Modal */}
        {showQrModal && (
          <div className={styles.modalOverlay} onClick={() => setShowQrModal(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <button
                className={styles.modalClose}
                onClick={() => setShowQrModal(false)}
              >
                <X size={18} />
              </button>

              <h3 style={{ color: 'var(--text-main)', fontSize: '20px', margin: '0 0 8px 0', fontFamily: 'var(--font-serif)' }}>
                Scan to Join Room
              </h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '13px', margin: 0, fontFamily: 'var(--font-sans)' }}>
                Point your phone camera at this QR code to connect instantly.
              </p>

              <div className={styles.qrBox}>
                <QRCodeSVG
                  value={roomUrl || `https://droplinegg.vercel.app/room/${roomCode}`}
                  size={190}
                  level="M"
                  marginSize={1}
                />
              </div>

              <div style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', padding: '8px 12px', borderRadius: 'var(--radius-md)', color: 'var(--text-dim)', fontSize: '12px', fontFamily: 'var(--font-mono)', letterSpacing: '2px' }}>
                {roomCode}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
