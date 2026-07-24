'use client';

import React from 'react';

interface PeerStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed' | 'full';
}

export const PeerStatus: React.FC<PeerStatusProps> = ({ status }) => {
  const getStatusDetails = () => {
    switch (status) {
      case 'connected':
        return { label: 'Peer Connected', color: 'var(--success)', pulse: true };
      case 'connecting':
        return { label: 'Waiting for Peer to Join...', color: 'var(--warning)', pulse: true };
      case 'disconnected':
        return { label: 'Peer Disconnected', color: 'var(--text-dim)', pulse: false };
      case 'failed':
        return { label: 'Connection Failed', color: 'var(--error)', pulse: false };
      case 'full':
        return { label: 'This room already has two devices.', color: 'var(--error)', pulse: false };
    }
  };

  const { label, color, pulse } = getStatusDetails();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        padding: '6px 14px',
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border)',
        borderRadius: '999px',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          display: 'inline-block',
          animation: pulse ? 'pulse-dot 1.8s infinite ease-in-out' : 'none',
        }}
      />
      <span
        style={{
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--text-main)',
          fontFamily: 'var(--font-sans)',
        }}
      >
        {label}
      </span>
    </div>
  );
};
