'use client';

import React from 'react';

interface PeerStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'room_full';
}

export const PeerStatus: React.FC<PeerStatusProps> = ({ status }) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'connected':
        return { label: 'Peer Connected', color: '#10b981', pulse: true };
      case 'connecting':
        return { label: 'Waiting for Peer to Join...', color: '#f59e0b', pulse: true };
      case 'disconnected':
        return { label: 'Peer Disconnected', color: '#6b7280', pulse: false };
      case 'failed':
        return { label: 'Connection Failed', color: '#ef4444', pulse: false };
      case 'room_full':
        return { label: 'Room Full (Max 2)', color: '#ef4444', pulse: false };
    }
  };

  const { label, color, pulse } = getStatusDetails();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '8px 16px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--card-border)',
        borderRadius: '999px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          boxShadow: pulse ? `0 0 8px ${color}` : 'none',
          animation: pulse ? 'pulse 1.5s infinite' : 'none',
        }}
      />
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-main)' }}>
        {label}
      </span>
      <style jsx>{`
        @keyframes pulse {
          0% {
            opacity: 1;
            transform: scale(1);
          }
          50% {
            opacity: 0.4;
            transform: scale(1.2);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
};
