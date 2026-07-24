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

export interface TextItem {
  id: string;
  content: string;
  timestamp: number;
  direction: 'sent' | 'received';
}

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks

// Generate a stable peer ID per browser tab (survives React StrictMode double-mount)
let _tabPeerId: string | null = null;
function getTabPeerId(): string {
  if (!_tabPeerId) {
    _tabPeerId = Math.random().toString(36).substring(2, 9);
  }
  return _tabPeerId;
}

export function useWebRTC(roomCode: string) {
  const [peerStatus, setPeerStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed' | 'full'>('connecting');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const myPeerId = useRef<string>(getTabPeerId());
  const remotePeerIdRef = useRef<string | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);
  const makingOfferRef = useRef<boolean>(false);
  const ignoreOfferRef = useRef<boolean>(false);
  const isCleanedUpRef = useRef<boolean>(false);
  const politeRef = useRef<boolean>(false);

  // Send Queue
  const sendQueue = useRef<File[]>([]);
  const isSending = useRef<boolean>(false);

  const incomingFileMetaRef = useRef<{
    id: string;
    name: string;
    size: number;
    type: string;
    receivedBytes: number;
    chunks: ArrayBuffer[];
    startTime: number;
  } | null>(null);

  // ─── Data Channel Setup ─────────────────────────────────────────────
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    dataChannelRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      console.log('[DC] Data channel opened');
      setPeerStatus('connected');
      setIsPeerConnected(true);
    };

    channel.onclose = () => {
      console.log('[DC] Data channel closed');
    };

    channel.onerror = (err) => {
      console.error('[DC] Data channel error:', err);
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
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
          } else if (msg.type === 'file-eof') {
            const meta = incomingFileMetaRef.current;
            if (meta && meta.id === msg.id) {
              const blob = new Blob(meta.chunks, { type: meta.type });
              const url = URL.createObjectURL(blob);

              setFiles((prev) =>
                prev.map((f) => (f.id === meta.id ? { ...f, url, progress: 100, status: 'completed' } : f))
              );
              incomingFileMetaRef.current = null;
            }
          } else if (msg.type === 'text-snippet') {
            setTextItems((prev) => [
              {
                id: msg.id,
                content: msg.content,
                timestamp: msg.timestamp || Date.now(),
                direction: 'received',
              },
              ...prev,
            ]);
          }
        } catch (e) {
          console.error('[DC] Error parsing control message:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const meta = incomingFileMetaRef.current;
        if (!meta) return;

        meta.chunks.push(event.data);
        meta.receivedBytes += event.data.byteLength;

        const progress = Math.min(Math.round((meta.receivedBytes / meta.size) * 100), 100);
        const elapsedTime = (Date.now() - meta.startTime) / 1000;
        const speedKBps = elapsedTime > 0 ? (meta.receivedBytes / 1024 / elapsedTime).toFixed(1) : '0';

        setFiles((prev) =>
          prev.map((f) =>
            f.id === meta.id
              ? {
                  ...f,
                  progress,
                  speed: `${speedKBps} KB/s`,
                }
              : f
          )
        );
      }
    };
  }, []);

  // ─── Create a Fresh Peer Connection ────────────────────────────────
  const createPeerConnection = useCallback((): RTCPeerConnection => {
    // Tear down existing connection if any
    if (peerConnectionRef.current) {
      peerConnectionRef.current.onicecandidate = null;
      peerConnectionRef.current.oniceconnectionstatechange = null;
      peerConnectionRef.current.onnegotiationneeded = null;
      peerConnectionRef.current.ondatachannel = null;
      try { peerConnectionRef.current.close(); } catch {}
    }

    // Reset signaling state
    iceCandidateBuffer.current = [];
    makingOfferRef.current = false;
    ignoreOfferRef.current = false;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Create data channel
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dc);

    // Handle remote data channel
    pc.ondatachannel = (event) => {
      console.log('[RTC] Received remote data channel');
      setupDataChannel(event.channel);
    };

    // ICE connection state changes
    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      console.log('[RTC] ICE state:', state);

      if (state === 'connected' || state === 'completed') {
        setPeerStatus('connected');
        setIsPeerConnected(true);
      } else if (state === 'disconnected') {
        setPeerStatus('disconnected');
        setIsPeerConnected(false);
      } else if (state === 'failed') {
        console.log('[RTC] ICE failed — attempting restart');
        setPeerStatus('failed');
        setIsPeerConnected(false);
        try { pc.restartIce(); } catch {}
      } else if (state === 'closed') {
        setPeerStatus('disconnected');
        setIsPeerConnected(false);
      }
    };

    // Send ICE candidates via Supabase broadcast
    pc.onicecandidate = (event) => {
      if (event.candidate && channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice',
            candidate: event.candidate.toJSON(),
            senderId: myPeerId.current,
          },
        });
      }
    };

    return pc;
  }, [setupDataChannel]);

  // ─── Send an Offer ─────────────────────────────────────────────────
  const sendOffer = useCallback(async () => {
    const pc = peerConnectionRef.current;
    const channel = channelRef.current;
    if (!pc || !channel) return;

    try {
      makingOfferRef.current = true;
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      channel.send({
        type: 'broadcast',
        event: 'signal',
        payload: {
          type: 'description',
          sdp: pc.localDescription,
          senderId: myPeerId.current,
        },
      });
    } catch (err) {
      console.error('[RTC] Error sending offer:', err);
    } finally {
      makingOfferRef.current = false;
    }
  }, []);

  // ─── Main Effect: Supabase Channel + Signaling ────────────────────
  useEffect(() => {
    if (!roomCode) return;

    isCleanedUpRef.current = false;
    remotePeerIdRef.current = null;
    politeRef.current = false;
    const normalizedRoom = roomCode.toUpperCase();

    // Create peer connection (ready for signaling)
    createPeerConnection();

    // Remove any existing channel for this room to avoid 'cannot add callbacks after subscribe' error
    const existingChannels = supabase.getChannels();
    existingChannels.forEach((ch) => {
      if (ch.topic.endsWith(`:${normalizedRoom}`)) {
        supabase.removeChannel(ch);
      }
    });

    const channel = supabase.channel(`room:${normalizedRoom}`, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerId.current },
      },
    });
    channelRef.current = channel;

    // ─── 1. Register ALL handlers BEFORE subscribe ──────────

    // Handle signaling messages (offers, answers, ICE candidates)
    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (isCleanedUpRef.current) return;
      if (!payload || payload.senderId === myPeerId.current) return;

      const pc = peerConnectionRef.current;
      if (!pc) return;

      try {
        if (payload.type === 'description') {
          const description = payload.sdp;

          // Perfect negotiation: detect offer collision
          const offerCollision =
            description.type === 'offer' &&
            (makingOfferRef.current || pc.signalingState !== 'stable');

          ignoreOfferRef.current = !politeRef.current && offerCollision;
          if (ignoreOfferRef.current) {
            console.log('[RTC] Ignoring colliding offer (I am impolite)');
            return;
          }

          // Polite peer rolls back on collision
          if (offerCollision && politeRef.current) {
            console.log('[RTC] Rolling back (I am polite)');
            await pc.setLocalDescription({ type: 'rollback' });
          }

          await pc.setRemoteDescription(description);

          // Flush buffered ICE candidates
          while (iceCandidateBuffer.current.length > 0) {
            const candidate = iceCandidateBuffer.current.shift();
            if (candidate) {
              try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
              } catch {
                // Ignore stale candidates
              }
            }
          }

          // If it was an offer, send back an answer
          if (description.type === 'offer') {
            await pc.setLocalDescription();
            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: {
                type: 'description',
                sdp: pc.localDescription,
                senderId: myPeerId.current,
              },
            });
          }
        } else if (payload.type === 'ice' && payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } catch (e) {
              console.warn('[RTC] Failed to add ICE candidate:', e);
            }
          } else {
            iceCandidateBuffer.current.push(payload.candidate);
          }
        }
      } catch (err) {
        console.error('[RTC] Signaling error:', err);
      }
    });

    // Handle presence sync (peer discovery)
    channel.on('presence', { event: 'sync' }, () => {
      if (isCleanedUpRef.current) return;
      const state = channel.presenceState();
      const peerIds = Object.keys(state).filter((id) => id !== myPeerId.current);

      console.log('[Presence] Sync — peers in room:', peerIds);

      if (peerIds.length > 0) {
        // If there are already 2 or more OTHER peers in the room when I join, the room is full.
        if (peerIds.length >= 2 && !remotePeerIdRef.current) {
          console.warn('[Presence] This room already has two devices.');
          setPeerStatus('full');
          setIsPeerConnected(false);
          return;
        }

        const remotePeerId = peerIds[0];

        if (peerIds.length > 1) {
          console.warn('[Presence] Room is full (more than 2 peers). Ignoring extras.');
        }

        // Only initiate connection if this is a new peer
        if (remotePeerIdRef.current !== remotePeerId) {
          remotePeerIdRef.current = remotePeerId;
          politeRef.current = myPeerId.current < remotePeerId;
          console.log(`[Presence] Discovered peer: ${remotePeerId}. I am ${politeRef.current ? 'polite' : 'impolite'}`);

          // Impolite peer (higher ID) initiates the offer
          if (!politeRef.current) {
            sendOffer();
          }
        }
      } else {
        // All peers left — prepare for next peer
        if (remotePeerIdRef.current) {
          console.log('[Presence] Peer left. Resetting for next peer...');
          remotePeerIdRef.current = null;
          setPeerStatus('connecting');
          setIsPeerConnected(false);
          // Create fresh peer connection for next peer
          createPeerConnection();
        }
      }
    });

    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (isCleanedUpRef.current || key === myPeerId.current) return;
      console.log(`[Presence] Peer joined: ${key}`);
    });

    channel.on('presence', { event: 'leave' }, ({ key }) => {
      if (isCleanedUpRef.current || key === myPeerId.current) return;
      console.log(`[Presence] Peer left: ${key}`);
    });

    // ─── 2. Subscribe AFTER all handlers are registered ──────
    channel.subscribe(async (status) => {
      if (isCleanedUpRef.current) return;
      if (status === 'SUBSCRIBED') {
        console.log('[Channel] Subscribed to room:', normalizedRoom);
        await channel.track({ peerId: myPeerId.current, joinedAt: Date.now() });
      }
    });

    // ─── 3. Cleanup ──────────────────────────────────────────
    return () => {
      console.log('[Cleanup] Tearing down WebRTC and Supabase channel');
      isCleanedUpRef.current = true;
      remotePeerIdRef.current = null;
      iceCandidateBuffer.current = [];
      makingOfferRef.current = false;
      ignoreOfferRef.current = false;

      if (dataChannelRef.current) {
        dataChannelRef.current.onopen = null;
        dataChannelRef.current.onclose = null;
        dataChannelRef.current.onmessage = null;
        dataChannelRef.current.onerror = null;
        try { dataChannelRef.current.close(); } catch {}
        dataChannelRef.current = null;
      }

      if (peerConnectionRef.current) {
        peerConnectionRef.current.onicecandidate = null;
        peerConnectionRef.current.oniceconnectionstatechange = null;
        peerConnectionRef.current.onnegotiationneeded = null;
        peerConnectionRef.current.ondatachannel = null;
        try { peerConnectionRef.current.close(); } catch {}
        peerConnectionRef.current = null;
      }

      channel.untrack().then(() => {
        supabase.removeChannel(channel);
      }).catch(() => {
        supabase.removeChannel(channel);
      });
      channelRef.current = null;
    };
  }, [roomCode, setupDataChannel, createPeerConnection, sendOffer]);

  // ─── File Send Queue ──────────────────────────────────────────────
  const processQueue = useCallback(() => {
    if (isSending.current || sendQueue.current.length === 0) return;
    const file = sendQueue.current.shift();
    if (!file) return;

    isSending.current = true;
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      alert('Peer connection not ready!');
      isSending.current = false;
      return;
    }

    const fileId = Math.random().toString(36).substring(2, 9);

    setFiles((prev) => [
      ...prev,
      {
        id: fileId,
        name: file.name,
        size: file.size,
        type: file.type || 'application/octet-stream',
        progress: 0,
        status: 'transferring',
        direction: 'sent',
      },
    ]);

    dc.send(JSON.stringify({
      type: 'file-header',
      id: fileId,
      name: file.name,
      size: file.size,
      fileType: file.type,
    }));

    let offset = 0;
    const startTime = Date.now();

    const readAndSendNextChunk = () => {
      if (offset >= file.size) {
        dc.send(JSON.stringify({ type: 'file-eof', id: fileId }));

        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f))
        );
        isSending.current = false;
        processQueue();
        return;
      }

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
                  ? { ...f, progress, speed: `${speedKBps} KB/s`, status: 'transferring' }
                  : f
              )
            );

            setTimeout(readAndSendNextChunk, 0);
          } catch (err) {
            console.error('[Send] Chunk send error:', err);
            setFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, status: 'error' } : f))
            );
            isSending.current = false;
            processQueue();
          }
        }
      };

      reader.readAsArrayBuffer(slice);
    };

    readAndSendNextChunk();
  }, []);

  const sendFile = useCallback((file: File) => {
    sendQueue.current.push(file);
    processQueue();
  }, [processQueue]);

  const sendTextMessage = useCallback((content: string) => {
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') {
      alert('Peer connection not ready!');
      return;
    }

    const id = Math.random().toString(36).substring(2, 9);
    const timestamp = Date.now();

    dc.send(
      JSON.stringify({
        type: 'text-snippet',
        id,
        content,
        timestamp,
      })
    );

    setTextItems((prev) => [
      {
        id,
        content,
        timestamp,
        direction: 'sent',
      },
      ...prev,
    ]);
  }, []);

  return {
    peerStatus,
    isPeerConnected,
    files,
    sendFile,
    textItems,
    sendTextMessage,
  };
}
