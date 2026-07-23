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

const CHUNK_SIZE = 16 * 1024;
const MAX_FILE_SIZE = 100 * 1024 * 1024;

function log(msg: string, ...args: unknown[]) {
  console.log(`[Dropline] ${msg}`, ...args);
}

export function useWebRTC(roomCode: string) {
  const [peerStatus, setPeerStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'failed' | 'room_full'
  >('connecting');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isPeerConnected, setIsPeerConnected] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const myPeerIdRef = useRef<string>('');
  const remotePeerIdRef = useRef<string>('');
  const iceBufferRef = useRef<RTCIceCandidateInit[]>([]);
  const hasCreatedOfferRef = useRef(false);

  // Sequential Queue state
  const fileQueueRef = useRef<{ file: File; id: string }[]>([]);
  const isSendingRef = useRef(false);

  // Incoming file buffer
  const incomingFileMetaRef = useRef<{
    id: string;
    name: string;
    size: number;
    type: string;
    receivedBytes: number;
    chunks: ArrayBuffer[];
    startTime: number;
  } | null>(null);

  // Initialize peer ID
  if (!myPeerIdRef.current) {
    myPeerIdRef.current = Math.random().toString(36).substring(2, 10);
    log('My Peer ID:', myPeerIdRef.current);
  }

  // Sequential Queue Processor
  const processNextInQueue = useCallback(() => {
    if (isSendingRef.current || fileQueueRef.current.length === 0) return;
    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') return;

    isSendingRef.current = true;
    const { file, id: fileId } = fileQueueRef.current.shift()!;

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
        dc.send(JSON.stringify({ type: 'file-complete', id: fileId }));
        setFiles(prev => prev.map(f =>
          f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f
        ));
        isSendingRef.current = false;
        setTimeout(processNextInQueue, 50);
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
            const progress = Math.min(Math.round((offset / file.size) * 100), 99);
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = elapsed > 0 ? (offset / 1024 / elapsed).toFixed(1) : '0';
            setFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, progress, speed: `${speed} KB/s`, status: 'transferring' } : f
            ));
            setTimeout(readAndSendNextChunk, 0);
          } catch (err) {
            console.error('Chunk send error:', err);
            setFiles(prev => prev.map(f =>
              f.id === fileId ? { ...f, status: 'error' } : f
            ));
            isSendingRef.current = false;
            setTimeout(processNextInQueue, 50);
          }
        }
      };
      reader.readAsArrayBuffer(slice);
    };

    readAndSendNextChunk();
  }, []);

  // Setup DataChannel
  const setupDataChannel = useCallback((channel: RTCDataChannel) => {
    log('Setting up DataChannel:', channel.label, 'readyState:', channel.readyState);
    dataChannelRef.current = channel;
    channel.binaryType = 'arraybuffer';

    channel.onopen = () => {
      log('DataChannel OPEN');
      setPeerStatus('connected');
      setIsPeerConnected(true);
      processNextInQueue();
    };

    channel.onclose = () => {
      log('DataChannel CLOSED');
      setPeerStatus('disconnected');
      setIsPeerConnected(false);
    };

    channel.onerror = (err) => {
      console.error('DataChannel error:', err);
      setPeerStatus('failed');
    };

    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'file-header') {
            incomingFileMetaRef.current = {
              id: msg.id, name: msg.name, size: msg.size,
              type: msg.fileType || 'application/octet-stream',
              receivedBytes: 0, chunks: [], startTime: Date.now(),
            };
            setFiles(prev => [...prev, {
              id: msg.id, name: msg.name, size: msg.size,
              type: msg.fileType || 'application/octet-stream',
              progress: 0, status: 'transferring', direction: 'received',
            }]);
          } else if (msg.type === 'file-complete') {
            const meta = incomingFileMetaRef.current;
            if (meta && meta.id === msg.id) {
              const blob = new Blob(meta.chunks, { type: meta.type });
              const url = URL.createObjectURL(blob);
              setFiles(prev => prev.map(f =>
                f.id === meta.id ? { ...f, url, progress: 100, status: 'completed' } : f
              ));
              incomingFileMetaRef.current = null;
            }
          }
        } catch (e) {
          console.error('Error parsing control message:', e);
        }
      } else if (event.data instanceof ArrayBuffer) {
        const meta = incomingFileMetaRef.current;
        if (!meta) return;
        meta.chunks.push(event.data);
        meta.receivedBytes += event.data.byteLength;
        const progress = Math.min(Math.round((meta.receivedBytes / meta.size) * 100), 99);
        const elapsed = (Date.now() - meta.startTime) / 1000;
        const speed = elapsed > 0 ? (meta.receivedBytes / 1024 / elapsed).toFixed(1) : '0';
        setFiles(prev => prev.map(f =>
          f.id === meta.id ? { ...f, progress, speed: `${speed} KB/s`, status: 'transferring' } : f
        ));
      }
    };
  }, [processNextInQueue]);

  // Flush buffered ICE candidates
  const flushIceCandidates = async (pc: RTCPeerConnection) => {
    log(`Flushing ${iceBufferRef.current.length} buffered ICE candidates`);
    while (iceBufferRef.current.length > 0) {
      const candidate = iceBufferRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding buffered ICE:', e);
        }
      }
    }
  };

  // Initiate WebRTC offer
  const initiateOffer = useCallback(async (pc: RTCPeerConnection, channel: ReturnType<typeof supabase.channel>) => {
    if (hasCreatedOfferRef.current) return;
    hasCreatedOfferRef.current = true;

    log('Creating WebRTC Offer...');
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    log('Offer created, sending via signaling');

    channel.send({
      type: 'broadcast',
      event: 'signal',
      payload: { type: 'offer', sdp: offer, senderId: myPeerIdRef.current },
    });
  }, []);

  useEffect(() => {
    if (!roomCode) return;

    log('Joining room:', roomCode);
    hasCreatedOfferRef.current = false;
    iceBufferRef.current = [];

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Create outgoing DataChannel
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dc);

    // Accept incoming DataChannel from remote
    pc.ondatachannel = (event) => {
      log('Received remote DataChannel');
      setupDataChannel(event.channel);
    };

    pc.oniceconnectionstatechange = () => {
      log('ICE connection state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setPeerStatus('connected');
        setIsPeerConnected(true);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        setPeerStatus('disconnected');
        setIsPeerConnected(false);
      } else if (pc.iceConnectionState === 'failed') {
        setPeerStatus('failed');
        setIsPeerConnected(false);
      }
    };

    pc.onconnectionstatechange = () => {
      log('Connection state:', pc.connectionState);
    };

    // Supabase Realtime channel
    const channelName = `room:${roomCode.toUpperCase()}`;
    log('Subscribing to Supabase channel:', channelName);

    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerIdRef.current },
      },
    });

    // Send ICE candidates as they arrive
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        log('Sending ICE candidate');
        channel.send({
          type: 'broadcast',
          event: 'signal',
          payload: {
            type: 'ice',
            candidate: event.candidate.toJSON(),
            senderId: myPeerIdRef.current,
          },
        });
      } else {
        log('All ICE candidates gathered');
      }
    };

    // Presence for 2-device limit
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const peers = Object.keys(state);
      log('Presence sync — peers in room:', peers.length, peers);

      if (peers.length > 2 && !peers.slice(0, 2).includes(myPeerIdRef.current)) {
        setPeerStatus('room_full');
        setRoomError('This room already has two devices.');
        setIsPeerConnected(false);
        pc.close();
      }
    });

    // When a new peer joins via presence
    channel.on('presence', { event: 'join' }, ({ key }) => {
      if (key === myPeerIdRef.current) return;
      log('Presence JOIN from:', key);
      remotePeerIdRef.current = key;

      // Lower ID initiates
      if (myPeerIdRef.current < key) {
        log('I have lower ID, initiating offer');
        initiateOffer(pc, channel);
      } else {
        log('I have higher ID, waiting for offer from:', key);
      }
    });

    // Handle broadcast signaling messages
    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (!payload || payload.senderId === myPeerIdRef.current) return;

      log('Received signal:', payload.type, 'from:', payload.senderId);

      try {
        if (payload.type === 'offer') {
          remotePeerIdRef.current = payload.senderId;
          log('Received Offer, setting remote description');
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushIceCandidates(pc);

          log('Creating Answer');
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);

          log('Sending Answer');
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'answer', sdp: answer, senderId: myPeerIdRef.current },
          });
        } else if (payload.type === 'answer') {
          log('Received Answer, setting remote description');
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushIceCandidates(pc);
        } else if (payload.type === 'ice' && payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            log('Adding ICE candidate directly');
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            log('Buffering ICE candidate (no remote description yet)');
            iceBufferRef.current.push(payload.candidate);
          }
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });

    channel.subscribe(async (status) => {
      log('Supabase channel status:', status);

      if (status === 'SUBSCRIBED') {
        log('Channel SUBSCRIBED — tracking presence');
        await channel.track({ online_at: new Date().toISOString() });
      } else if (status === 'CHANNEL_ERROR') {
        console.error('Supabase channel error — check your API key and URL');
        setPeerStatus('failed');
        setRoomError('Could not connect to signaling server. Check your Supabase credentials.');
      } else if (status === 'TIMED_OUT') {
        console.error('Supabase channel timed out');
        setPeerStatus('failed');
        setRoomError('Signaling server connection timed out.');
      }
    });

    return () => {
      log('Cleaning up room:', roomCode);
      dc.close();
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [roomCode, setupDataChannel, initiateOffer]);

  const addFilesToQueue = useCallback((selectedFiles: File[]) => {
    const validFilesToQueue: { file: File; id: string }[] = [];
    for (const file of selectedFiles) {
      if (file.size > MAX_FILE_SIZE) {
        alert(`File "${file.name}" exceeds the 100 MB limit.`);
        continue;
      }
      const fileId = Math.random().toString(36).substring(2, 9);
      setFiles(prev => [...prev, {
        id: fileId, name: file.name, size: file.size,
        type: file.type || 'application/octet-stream',
        progress: 0, status: 'pending', direction: 'sent',
      }]);
      validFilesToQueue.push({ file, id: fileId });
    }
    fileQueueRef.current.push(...validFilesToQueue);
    processNextInQueue();
  }, [processNextInQueue]);

  return {
    peerStatus,
    isPeerConnected,
    files,
    roomError,
    sendFile: addFilesToQueue,
  };
}
