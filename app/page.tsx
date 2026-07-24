'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { ArrowRight, Shield, Zap, Lock, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = async () => {
    try {
      const res = await fetch('/api/room/create', { method: 'POST' });
      if (!res.ok) {
        alert('Rate limit exceeded. Try again in a minute.');
        return;
      }
      const data = await res.json();
      router.push(`/room/${data.code}`);
    } catch (e) {
      alert('Error creating room');
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const formattedCode = roomCode.trim().toUpperCase();
    if (/^[A-Z0-9]{6}$/.test(formattedCode)) {
      router.push(`/room/${formattedCode}`);
    } else {
      alert('Room code must be exactly 6 letters or numbers.');
    }
  };

  return (
    <div className={styles.pageWrapper}>
      {/* Hero Header */}
      <section className={styles.heroSection}>
        <div className={styles.badge}>
          <Sparkles size={13} />
          <span>Dropline P2P Protocol</span>
        </div>

        <h1 className={styles.title}>
          Send it. Simply.
        </h1>
        <p className={styles.subtitle}>
          Your private line for peer-to-peer file sharing.
        </p>
      </section>

      {/* Main Action Cards */}
      <section className={styles.cardsGrid}>
        {/* Create Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Start a New Room</h2>
            <p className={styles.cardDesc}>
              Generate a 6-character room code to establish an instant end-to-end encrypted connection.
            </p>
          </div>
          <button className={styles.primaryButton} onClick={handleCreateRoom}>
            Create Room <ArrowRight size={16} />
          </button>
        </div>

        {/* Join Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Join a Room</h2>
            <p className={styles.cardDesc}>
              Have a 6-digit code? Enter it below to connect directly with the other device.
            </p>
          </div>
          <form onSubmit={handleJoinRoom} className={styles.formGroup}>
            <input
              type="text"
              placeholder="Enter 6-character code"
              className={styles.input}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
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

      {/* Value Proposition Features */}
      <section className={styles.featuresGrid}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Zap size={18} />
          </div>
          <h3 className={styles.featureTitle}>100% Peer-to-Peer</h3>
          <p className={styles.featureDesc}>
            Data transfers directly between browsers over WebRTC channels without touching any cloud servers.
          </p>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Shield size={18} />
          </div>
          <h3 className={styles.featureTitle}>Zero Storage & Logs</h3>
          <p className={styles.featureDesc}>
            Files exist only in device memory during transfer. Once the session ends, metadata vanishes.
          </p>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Lock size={18} />
          </div>
          <h3 className={styles.featureTitle}>Cross-Network</h3>
          <p className={styles.featureDesc}>
            Connect devices across different Wi-Fi networks, mobile data, or strict firewalls seamlessly.
          </p>
        </div>
      </section>
    </div>
  );
}
