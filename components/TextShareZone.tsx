'use client';

import React, { useState } from 'react';
import { Send, Code, Copy, Check, FileCode2, Clock } from 'lucide-react';
import { TextItem } from '@/hooks/useWebRTC';

interface TextShareZoneProps {
  onSendText: (content: string) => void;
  disabled?: boolean;
  textItems: TextItem[];
}

export const TextShareZone: React.FC<TextShareZoneProps> = ({
  onSendText,
  disabled = false,
  textItems,
}) => {
  const [inputText, setInputText] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || disabled) return;
    onSendText(inputText.trim());
    setInputText('');
  };

  const handleCopy = (id: string, content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const lineCount = inputText ? inputText.split('\n').length : 0;
  const charCount = inputText.length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Input / Composer Card */}
      <div
        style={{
          backgroundColor: 'var(--card-bg)',
          border: '1px solid var(--card-border)',
          borderRadius: '20px',
          padding: '24px',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
              }}
            >
              <Code size={18} />
            </div>
            <div>
              <h3
                style={{
                  color: 'var(--text-main)',
                  fontSize: '16px',
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                Share Code & Text Snippets
              </h3>
            </div>
          </div>

          {inputText.length > 0 && (
            <span
              style={{
                color: 'var(--text-dim)',
                fontSize: '12px',
                fontFamily: 'monospace',
              }}
            >
              {lineCount} {lineCount === 1 ? 'line' : 'lines'} • {charCount} chars
            </span>
          )}
        </div>

        <form onSubmit={handleSend}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={disabled}
            placeholder={
              disabled
                ? 'Waiting for peer to connect before sending snippets...'
                : 'Paste or type code snippets, URLs, formatted text, or raw data here...'
            }
            rows={5}
            style={{
              width: '100%',
              backgroundColor: 'rgba(0, 0, 0, 0.2)',
              border: '1px solid var(--card-border)',
              borderRadius: '12px',
              padding: '14px 16px',
              color: 'var(--text-main)',
              fontSize: '13.5px',
              fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
              lineHeight: '1.6',
              outline: 'none',
              resize: 'vertical',
              boxSizing: 'border-box',
              transition: 'border-color 0.2s ease',
              opacity: disabled ? 0.6 : 1,
            }}
          />

          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '12px',
            }}
          >
            <button
              type="submit"
              disabled={disabled || !inputText.trim()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                backgroundColor: disabled || !inputText.trim() ? 'rgba(255, 255, 255, 0.1)' : 'var(--btn-primary-bg)',
                color: disabled || !inputText.trim() ? 'var(--text-muted)' : 'var(--btn-primary-text)',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: disabled || !inputText.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Send size={15} /> Send Snippet
            </button>
          </div>
        </form>
      </div>

      {/* Snippets Stream */}
      {textItems.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <h2
            style={{
              color: 'var(--text-main)',
              fontSize: '18px',
              fontWeight: 500,
              margin: 0,
              fontFamily: 'var(--font-serif)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <FileCode2 size={20} /> Shared Code & Text ({textItems.length})
          </h2>

          {textItems.map((item) => {
            const isSent = item.direction === 'sent';
            const isCopied = copiedId === item.id;
            const formattedTime = new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={item.id}
                style={{
                  backgroundColor: 'var(--card-bg)',
                  border: '1px solid var(--card-border)',
                  borderRadius: '16px',
                  padding: '18px 20px',
                  backdropFilter: 'blur(16px)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                }}
              >
                {/* Card Top Info */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 600,
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        padding: '4px 10px',
                        borderRadius: '20px',
                        backgroundColor: isSent ? 'rgba(59, 130, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
                        color: isSent ? '#60a5fa' : '#34d399',
                        border: `1px solid ${isSent ? 'rgba(59, 130, 246, 0.3)' : 'rgba(16, 185, 129, 0.3)'}`,
                      }}
                    >
                      {isSent ? 'Sent by You' : 'Received'}
                    </span>

                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        color: 'var(--text-dim)',
                        fontSize: '12px',
                      }}
                    >
                      <Clock size={13} /> {formattedTime}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(item.id, item.content)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: 'rgba(255, 255, 255, 0.06)',
                      border: '1px solid var(--card-border)',
                      borderRadius: '8px',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={14} color="#10b981" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={14} /> Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Pre / Code Block */}
                <pre
                  style={{
                    backgroundColor: 'rgba(0, 0, 0, 0.35)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '10px',
                    padding: '14px 16px',
                    margin: 0,
                    color: '#e2e8f0',
                    fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                    fontSize: '13px',
                    lineHeight: '1.5',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    maxHeight: '300px',
                    overflowY: 'auto',
                  }}
                >
                  {item.content}
                </pre>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
