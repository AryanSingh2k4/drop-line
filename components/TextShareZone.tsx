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
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-xl)',
          padding: '24px',
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
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-main)',
              }}
            >
              <Code size={16} />
            </div>
            <h3
              style={{
                color: 'var(--text-main)',
                fontSize: '16px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                margin: 0,
              }}
            >
              Share Code & Text Snippets
            </h3>
          </div>

          {inputText.length > 0 && (
            <span
              style={{
                color: 'var(--text-dim)',
                fontSize: '12px',
                fontFamily: 'var(--font-mono)',
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
              backgroundColor: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              borderRadius: 'var(--radius-md)',
              padding: '14px 16px',
              color: 'var(--text-main)',
              fontSize: '13.5px',
              fontFamily: 'var(--font-mono)',
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
                backgroundColor: disabled || !inputText.trim() ? 'var(--bg-secondary)' : 'var(--button-primary)',
                color: disabled || !inputText.trim() ? 'var(--text-muted)' : 'var(--button-primary-text)',
                border: disabled || !inputText.trim() ? '1px solid var(--border)' : 'none',
                borderRadius: 'var(--radius-md)',
                fontSize: '14px',
                fontFamily: 'var(--font-sans)',
                fontWeight: 500,
                cursor: disabled || !inputText.trim() ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Send size={14} /> Send Snippet
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
              fontSize: '22px',
              fontWeight: 400,
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
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '18px 20px',
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
                        fontWeight: 500,
                        fontFamily: 'var(--font-sans)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.8px',
                        padding: '4px 10px',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border)',
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
                        fontFamily: 'var(--font-sans)',
                      }}
                    >
                      <Clock size={12} /> {formattedTime}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopy(item.id, item.content)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: 'var(--bg-secondary)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      color: 'var(--text-main)',
                      fontSize: '12px',
                      fontFamily: 'var(--font-sans)',
                      fontWeight: 500,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={13} color="var(--success)" /> Copied!
                      </>
                    ) : (
                      <>
                        <Copy size={13} /> Copy Code
                      </>
                    )}
                  </button>
                </div>

                {/* Pre / Code Block */}
                <pre
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px',
                    margin: 0,
                    color: 'var(--text-main)',
                    fontFamily: 'var(--font-mono)',
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
