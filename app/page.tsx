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
    <main className={styles.container}>
      {/* Left Action Panel */}
      <div className={styles.leftPanel}>
        <div className={styles.header}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 'var(--spacing-8)',
              padding: 'var(--spacing-6) var(--spacing-12)',
              borderRadius: 'var(--radius-3xl)',
              backgroundColor: 'var(--surface-elevated)',
              border: '1px solid var(--border-subtle)',
              marginBottom: 'var(--spacing-24)',
            }}
          >
            <Sparkles size={14} color="var(--text-secondary)" />
            <span className="ui-small" style={{ color: 'var(--text-secondary)' }}>
              Dropline P2P Protocol v1.0
            </span>
          </div>

          <h1 className={`${styles.title} display-hero`}>
            Share files directly device to device.
          </h1>
          <p className={`${styles.subtitle} ui-body`}>
            No cloud uploads. No size limits. Completely free and secure WebRTC transfer.
          </p>
        </div>

        <div className={styles.card}>
          <button 
            className={`${styles.primaryButton} ui-large`}
            onClick={handleCreateRoom}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-8)',
            }}
          >
            Create New Room <ArrowRight size={18} />
          </button>

          <div className={`${styles.divider} ui-small`}>or enter a room code</div>

          <form className={styles.inputGroup} onSubmit={handleJoinRoom}>
            <label htmlFor="code" className={`${styles.label} ui-medium`}>
              Room Code
            </label>
            <input
              id="code"
              type="text"
              placeholder="e.g. A3X9K2"
              className={`${styles.input} ui-body`}
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={6}
            />
            <button 
              type="submit"
              className={`${styles.secondaryButton} ui-large`}
              style={{ marginTop: 'var(--spacing-8)' }}
              disabled={!roomCode.trim()}
            >
              Join Room
            </button>
          </form>
        </div>
      </div>

      {/* Right Editorial Info Panel */}
      <div className={styles.rightPanel}>
        <div style={{ maxWidth: '420px', padding: 'var(--spacing-32)' }}>
          <h2 className="display-section" style={{ color: 'var(--text-primary)', marginBottom: 'var(--spacing-24)' }}>
            How Dropline Works
          </h2>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-28)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-16)' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-white)', border: '1px solid var(--border-subtle)', height: 'fit-content' }}>
                <Zap size={24} />
              </div>
              <div>
                <h3 className="ui-large" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>100% Peer-to-Peer</h3>
                <p className="ui-body" style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '20px' }}>
                  Files flow straight between your devices through WebRTC DataChannels. They never touch our servers.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-16)' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-white)', border: '1px solid var(--border-subtle)', height: 'fit-content' }}>
                <Shield size={24} />
              </div>
              <div>
                <h3 className="ui-large" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Zero Storage & Private</h3>
                <p className="ui-body" style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '20px' }}>
                  No file logs or persistent database records. Once you close the tab, the room vanishes.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-16)' }}>
              <div style={{ padding: '12px', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--surface-white)', border: '1px solid var(--border-subtle)', height: 'fit-content' }}>
                <Lock size={24} />
              </div>
              <div>
                <h3 className="ui-large" style={{ color: 'var(--text-primary)', marginBottom: '4px' }}>Cross-Network Connections</h3>
                <p className="ui-body" style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '20px' }}>
                  Connect devices on different Wi-Fi networks or cellular data using automatic STUN/TURN NAT traversal.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
