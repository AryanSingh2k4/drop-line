'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { rtcConfig } from '@/lib/rtc-config';

export interface FileItem {
  id: string;
  name: string;
  size: number;
  type: string;
  progress: number;
  status: 'pending' | 'transferring' | 'completed' | 'error';
  direction: 'sent' | 'received';
  url?: string;
  speed?: string;
}

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks for high reliability

export function useWebRTC(roomCode: string) {
  const [peerStatus, setPeerStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'failed'
  >('connecting');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const myPeerIdRef = useRef<string>('');
  
  // Storage for incoming chunks being reassembled
  const incomingFileMetaRef = useRef<{
    id: string;
    name: string;
    size: number;
    type: string;
    receivedBytes: number;
    chunks: ArrayBuffer[];
    startTime: number;
  } | null>(null);

  // Initialize peer ID once
  if (!myPeerIdRef.current) {
    myPeerIdRef.current = Math.random().toString(36).substring(2, 9);
  }

  // Setup DataChannel listeners
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      setPeerStatus('connected');
      setIsPeerConnected(true);
    };

    channel.onclose = () => {
      setPeerStatus('disconnected');
      setIsPeerConnected(false);
    };

    channel.onerror = (err) => {
      console.error('DataChannel error:', err);
      setPeerStatus('failed');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        // Control message (JSON)
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file-header') {
            incomingFileMetaRef.current = {
              id: msg.id,
              name: msg.name,
              size: msg.size,
              type: msg.fileType || 'application/octet-stream',
              receivedBytes: 0,
              chunks: [],
              startTime: Date.now(),
            };

            setFiles((prev) => [
              ...prev,
              {
                id: msg.id,
                name: msg.name,
                size: msg.size,
                type: msg.fileType || 'application/octet-stream',
                progress: 0,
                status: 'transferring',
                direction: 'received',
              },
            ]);
          }
        } catch (e) {
          console.error('Error parsing control message:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        // Binary Chunk received
        const meta = incomingFileMetaRef.current;
        if (!meta) return;

        meta.chunks.push(event.data);
        meta.receivedBytes += event.data.byteLength;

        const progress = Math.min(Math.round((meta.receivedBytes / meta.size) * 100), 100);
        const elapsedTime = (Date.now() - meta.startTime) / 1000; // in seconds
        const speedKBps = elapsedTime > 0 ? (meta.receivedBytes / 1024 / elapsedTime).toFixed(1) : '0';
        const speedStr = `${speedKBps} KB/s`;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === meta.id
              ? {
                  ...f,
                  progress,
                  speed: speedStr,
                  status: meta.receivedBytes >= meta.size ? 'completed' : 'transferring',
                }
              : f
          )
        );

        // When full file is assembled
        if (meta.receivedBytes >= meta.size) {
          const blob = new Blob(meta.chunks, { type: meta.type });
          const url = URL.createObjectURL(blob);

          setFiles((prev) =>
            prev.map((f) => (f.id === meta.id ? { ...f, url, status: 'completed' } : f))
          );

          // Reset meta
          incomingFileMetaRef.current = null;
        }
      }
    };
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Create Data Channel if initiator
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dc);

    // Accept incoming Data Channel if remote creates it
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setPeerStatus('connected');
        setIsPeerConnected(true);
      } else if (
        pc.iceConnectionState === 'disconnected' ||
        pc.iceConnectionState === 'closed'
      ) {
        setPeerStatus('disconnected');
        setIsPeerConnected(false);
      } else if (pc.iceConnectionState === 'failed') {
        setPeerStatus('failed');
        setIsPeerConnected(false);
      }
    };

    // Join Supabase Realtime channel for signaling
    const channel = supabase.channel(`room:${roomCode.toUpperCase()}`, {
      config: { broadcast: { self: false } },
    });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice',
            candidate: event.candidate,
            senderId: myPeerIdRef.current,
          },
        });
      }
    };

    channel
      .on('broadcast', { event: 'signal' }, async ({ payload }) => {
        if (!payload || payload.senderId === myPeerIdRef.current) return;

        try {
          if (payload.type === 'offer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'answer',
                sdp: answer,
                senderId: myPeerIdRef.current,
              },
            });
          } else if (payload.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          } else if (payload.type === 'ice' && payload.candidate) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else if (payload.type === 'peer-joined') {
            // Initiate offer when peer joins
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'offer',
                sdp: offer,
                senderId: myPeerIdRef.current,
              },
            });
          }
        } catch (err) {
          console.error('Signaling error:', err);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence so peer can trigger offer
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'peer-joined',
              senderId: myPeerIdRef.current,
            },
          });
        }
      });

    return () => {
      dc.close();
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [roomCode, setupDataChannel]);

  // Send a file over DataChannel with chunking & backpressure
  const sendFile = useCallback(async (file: File) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      alert('Peer connection not ready yet!');
      return;
    }

    const fileId = Math.random().toString(36).substring(2, 9);
    const newFileItem: FileItem = {
      id: fileId,
      name: file.name,
      size: file.size,
      type: file.type || 'application/octet-stream',
      progress: 0,
      status: 'transferring',
      direction: 'sent',
    };

    setFiles((prev) => [...prev, newFileItem]);

    // 1. Send Header
    dc.send(
      JSON.stringify({
        type: 'file-header',
        id: fileId,
        name: file.name,
        size: file.size,
        fileType: file.type,
      })
    );

    // 2. Read and Send Chunks
    let offset = 0;
    const startTime = Date.now();

    const readAndSendNextChunk = () => {
      if (offset >= file.size) {
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f))
        );
        return;
      }

      // Check buffer threshold (backpressure)
      if (dc.bufferedAmount > 64 * 1024) {
        setTimeout(readAndSendNextChunk, 20);
        return;
      }

      const slice = file.slice(offset, offset + CHUNK_SIZE);
      const reader = new FileReader();

      reader.onload = (e) => {
        if (e.target?.result instanceof ArrayBuffer) {
          try {
            dc.send(e.target.result);
            offset += e.target.result.byteLength;

            const progress = Math.min(Math.round((offset / file.size) * 100), 100);
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speedKBps = elapsedTime > 0 ? (offset / 1024 / elapsedTime).toFixed(1) : '0';

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      progress,
                      speed: `${speedKBps} KB/s`,
                      status: offset >= file.size ? 'completed' : 'transferring',
                    }
                  : f
              )
            );

            // Continue sending
            setTimeout(readAndSendNextChunk, 0);
          } catch (err) {
            console.error('Chunk send error:', err);
            setFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, status: 'error' } : f))
            );
          }
        }
      };

      reader.readAsArrayBuffer(slice);
    };

    readAndSendNextChunk();
  }, []);

  return {
    peerStatus,
    isPeerConnected,
    files,
    sendFile,
  };
}
