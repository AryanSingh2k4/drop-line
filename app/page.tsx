'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { ArrowRight, Shield, Zap, Lock, Sparkles, AlertCircle } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Requirement 5: Move room-code generation to server route (/api/room/create) with rate limit
  const handleCreateRoom = async () => {
    setErrorMsg(null);
    setIsCreating(true);

    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        setErrorMsg(data.error || 'Failed to create room.');
        setIsCreating(false);
        return;
      }

      router.push(`/room/${data.code}`);
    } catch (err) {
      console.error('Room creation error:', err);
      setErrorMsg('Network error while creating room. Please try again.');
      setIsCreating(false);
    }
  };

  // Requirement 4: Require exactly six valid code characters (/^[A-Z0-9]{6}$/)
  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanCode = roomCode.trim().toUpperCase();
    const isValidCode = /^[A-Z0-9]{6}$/.test(cleanCode);

    if (!isValidCode) {
      setErrorMsg('Room code must be exactly 6 uppercase letters or numbers.');
      return;
    }

    router.push(`/room/${cleanCode}`);
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Hero Header */}
      <section className={styles.heroSection}>
        <div className={styles.badge}>
          <Sparkles size={14} />
          <span>Dropline P2P Protocol</span>
        </div>

        <h1 className={styles.title}>
          Share files directly<br />device to device.
        </h1>
        <p className={styles.subtitle}>
          No cloud uploads. Max 100 MB per file. Completely free and private peer-to-peer WebRTC transfer.
        </p>
      </section>

      {/* Main Action Cards */}
      <section className={styles.cardsGrid}>
        {/* Create Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Start a New Room</h2>
            <p className={styles.cardDesc}>
              Generate a unique room code via our secure rate-limited API and share files with any device.
            </p>
          </div>
          <button
            className={styles.primaryButton}
            onClick={handleCreateRoom}
            disabled={isCreating}
          >
            {isCreating ? 'Creating Room...' : 'Create Room'} <ArrowRight size={18} />
          </button>
        </div>

        {/* Join Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Join a Room</h2>
            <p className={styles.cardDesc}>
              Enter a valid 6-character room code to establish a direct P2P connection.
            </p>
          </div>
          <form onSubmit={handleJoinRoom} className={styles.formGroup}>
            <input
              type="text"
              placeholder="Enter 6-character code (e.g. A3X9K2)"
              className={styles.input}
              value={roomCode}
              onChange={(e) => {
                setErrorMsg(null);
                setRoomCode(e.target.value.toUpperCase());
              }}
              maxLength={6}
            />
            <button
              type="submit"
              className={styles.secondaryButton}
              disabled={!roomCode.trim()}
            >
              Connect to Room
            </button>
          </form>
        </div>
      </section>

      {/* Error Notice */}
      {errorMsg && (
        <div
          style={{
            maxWidth: '600px',
            width: '100%',
            marginBottom: '32px',
            padding: '14px 20px',
            borderRadius: '12px',
            backgroundColor: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid rgba(239, 68, 68, 0.3)',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontSize: '14px',
          }}
        >
          <AlertCircle size={18} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Value Proposition Features */}
      <section className={styles.featuresGrid}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Zap size={20} />
          </div>
          <h3 className={styles.featureTitle}>100% Peer-to-Peer</h3>
          <p className={styles.featureDesc}>
            Data transfers directly between browsers over encrypted WebRTC channels without touching any cloud storage.
          </p>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Shield size={20} />
          </div>
          <h3 className={styles.featureTitle}>Zero Logs & Storage</h3>
          <p className={styles.featureDesc}>
            Your files never leave your device memory. Rooms are strictly capped at 2 devices.
          </p>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Lock size={20} />
          </div>
          <h3 className={styles.featureTitle}>Cross-Network</h3>
          <p className={styles.featureDesc}>
            Connect devices across different Wi-Fi networks or cellular data using automatic STUN/TURN NAT traversal.
          </p>
        </div>
      </section>
    </div>
  );
}
