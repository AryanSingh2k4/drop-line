'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { ArrowRight, Shield, Zap, Lock, Sparkles } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState('');

  const handleCreateRoom = () => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    router.push(`/room/${code}`);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (roomCode.trim().length > 0) {
      router.push(`/room/${roomCode.trim().toUpperCase()}`);
    }
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
          No cloud uploads. No size limits. Completely free and private peer-to-peer WebRTC file transfer.
        </p>
      </section>

      {/* Main Action Cards */}
      <section className={styles.cardsGrid}>
        {/* Create Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Start a New Room</h2>
            <p className={styles.cardDesc}>
              Generate a unique room code and share files instantly with any device nearby or remote.
            </p>
          </div>
          <button className={styles.primaryButton} onClick={handleCreateRoom}>
            Create Room <ArrowRight size={18} />
          </button>
        </div>

        {/* Join Room Card */}
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2 className={styles.cardTitle}>Join a Room</h2>
            <p className={styles.cardDesc}>
              Have a 6-digit code? Enter it below to establish a direct P2P connection.
            </p>
          </div>
          <form onSubmit={handleJoinRoom} className={styles.formGroup}>
            <input
              type="text"
              placeholder="Enter 6-digit code (e.g. A3X9K2)"
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
            Your files never leave your device memory. Once the room session ends, all connection metadata vanishes.
          </p>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Lock size={20} />
          </div>
          <h3 className={styles.featureTitle}>Cross-Network</h3>
          <p className={styles.featureDesc}>
            Seamlessly connect devices across different Wi-Fi networks, mobile data, or strict firewalls with STUN/TURN traversal.
          </p>
        </div>
      </section>
    </div>
  );
}
