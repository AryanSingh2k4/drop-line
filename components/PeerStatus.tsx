'use client';

import React from 'react';

interface PeerStatusProps {
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
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
    }
  };

  const { label, color, pulse } = getStatusDetails();

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--spacing-8)',
        padding: 'var(--spacing-6) var(--spacing-16)',
        backgroundColor: 'var(--surface-white)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-3xl)',
        boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
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
      <span className="ui-medium" style={{ color: 'var(--text-primary)' }}>
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
