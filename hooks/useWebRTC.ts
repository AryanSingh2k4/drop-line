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

const CHUNK_SIZE = 16 * 1024; // 16 KB chunks
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100 MB Limit

export function useWebRTC(roomCode: string) {
  const [peerStatus, setPeerStatus] = useState<
    'connecting' | 'connected' | 'disconnected' | 'failed' | 'room_full'
  >('connecting');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);
  const [roomError, setRoomError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  const myPeerIdRef = useRef<string>('');
  const iceBufferRef = useRef<RTCIceCandidateInit[]>([]);
  
  // Sequential Queue state
  const fileQueueRef = useRef<{ file: File; id: string }[]>([]);
  const isSendingRef = useRef<boolean>(false);

  // Storage for incoming file buffer reassembly
  const incomingFileMetaRef = useRef<{
    id: string;
    name: string;
    size: number;
    type: string;
    receivedBytes: number;
    chunks: ArrayBuffer[];
    startTime: number;
  } | null>(null);

  // Initialize unique random Peer ID once
  if (!myPeerIdRef.current) {
    myPeerIdRef.current = Math.random().toString(36).substring(2, 10);
  }

  // Sequential File Queue Processor
  const processNextInQueue = useCallback(() => {
    if (isSendingRef.current || fileQueueRef.current.length === 0) return;

    const dc = dataChannelRef.current;
    if (!dc || dc.readyState !== 'open') return;

    isSendingRef.current = true;
    const { file, id: fileId } = fileQueueRef.current.shift()!;

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

    let offset = 0;
    const startTime = Date.now();

    const readAndSendNextChunk = () => {
      // If done sending all chunks, send explicit 'file-complete' control message
      if (offset >= file.size) {
        dc.send(
          JSON.stringify({
            type: 'file-complete',
            id: fileId,
          })
        );

        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f))
        );

        // Mark current file finished and trigger next in queue
        isSendingRef.current = false;
        setTimeout(processNextInQueue, 50);
        return;
      }

      // Check buffer threshold (backpressure management)
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
            const elapsedTime = (Date.now() - startTime) / 1000;
            const speedKBps = elapsedTime > 0 ? (offset / 1024 / elapsedTime).toFixed(1) : '0';

            setFiles((prev) =>
              prev.map((f) =>
                f.id === fileId
                  ? {
                      ...f,
                      progress,
                      speed: `${speedKBps} KB/s`,
                      status: 'transferring',
                    }
                  : f
              )
            );

            setTimeout(readAndSendNextChunk, 0);
          } catch (err) {
            console.error('Chunk send error:', err);
            setFiles((prev) =>
              prev.map((f) => (f.id === fileId ? { ...f, status: 'error' } : f))
            );
            isSendingRef.current = false;
            setTimeout(processNextInQueue, 50);
          }
        }
      };

      reader.readAsArrayBuffer(slice);
    };

    readAndSendNextChunk();
  }, []);

  // Setup DataChannel listeners
  const setupDataChannel = useCallback(
    (channel: RTCDataChannel) => {
      dataChannelRef.current = channel;
      channel.binaryType = 'arraybuffer';

      channel.onopen = () => {
        setPeerStatus('connected');
        setIsPeerConnected(true);
        processNextInQueue();
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
            } else if (msg.type === 'file-complete') {
              // Explicit completion signal received!
              const meta = incomingFileMetaRef.current;
              if (meta && meta.id === msg.id) {
                const blob = new Blob(meta.chunks, { type: meta.type });
                const url = URL.createObjectURL(blob);

                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === meta.id
                      ? { ...f, url, progress: 100, status: 'completed' }
                      : f
                  )
                );

                incomingFileMetaRef.current = null;
              }
            }
          } catch (e) {
            console.error('Error parsing control message:', e);
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary Chunk
          const meta = incomingFileMetaRef.current;
          if (!meta) return;

          meta.chunks.push(event.data);
          meta.receivedBytes += event.data.byteLength;

          const progress = Math.min(Math.round((meta.receivedBytes / meta.size) * 100), 99);
          const elapsedTime = (Date.now() - meta.startTime) / 1000;
          const speedKBps = elapsedTime > 0 ? (meta.receivedBytes / 1024 / elapsedTime).toFixed(1) : '0';

          setFiles((prev) =>
            prev.map((f) =>
              f.id === meta.id
                ? {
                    ...f,
                    progress,
                    speed: `${speedKBps} KB/s`,
                    status: 'transferring',
                  }
                : f
            )
          );
        }
      };
    },
    [processNextInQueue]
  );

  // Helper to flush buffered ICE candidates once remote description is ready
  const flushIceCandidates = async (pc: RTCPeerConnection) => {
    while (iceBufferRef.current.length > 0) {
      const candidate = iceBufferRef.current.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (e) {
          console.error('Error adding buffered ICE candidate:', e);
        }
      }
    }
  };

  useEffect(() => {
    if (!roomCode) return;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    // Create DataChannel
    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dc);

    // Accept incoming DataChannel if remote creates it
    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
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

    // Join Supabase Realtime channel for signaling and presence tracking
    const channelName = `room:${roomCode.toUpperCase()}`;
    const channel = supabase.channel(channelName, {
      config: {
        broadcast: { self: false },
        presence: { key: myPeerIdRef.current },
      },
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

    // Presence tracking for 2-device limit
    channel.on('presence', { event: 'sync' }, () => {
      const state = channel.presenceState();
      const presentPeers = Object.keys(state);

      if (presentPeers.length > 2 && !presentPeers.slice(0, 2).includes(myPeerIdRef.current)) {
        setPeerStatus('room_full');
        setRoomError('This room already has two devices.');
        setIsPeerConnected(false);
        pc.close();
        return;
      }
    });

    channel.on('broadcast', { event: 'signal' }, async ({ payload }) => {
      if (!payload || payload.senderId === myPeerIdRef.current) return;

      try {
        const remotePeerId = payload.senderId;

        if (payload.type === 'peer-joined') {
          // Send announcement back so both peers learn each other's IDs immediately
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: {
              type: 'peer-announce',
              senderId: myPeerIdRef.current,
            },
          });

          // Check lower ID rule
          if (myPeerIdRef.current < remotePeerId) {
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
        } else if (payload.type === 'peer-announce') {
          // Peer B receives announcement from Peer A
          if (myPeerIdRef.current < remotePeerId && !pc.localDescription) {
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
        } else if (payload.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
          await flushIceCandidates(pc);

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
          await flushIceCandidates(pc);
        } else if (payload.type === 'ice' && payload.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          } else {
            // Buffer candidate until remote description is set
            iceBufferRef.current.push(payload.candidate);
          }
        }
      } catch (err) {
        console.error('Signaling error:', err);
      }
    });

    channel.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await channel.track({ online_at: new Date().toISOString() });

        // Announce presence to room
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

  // Queue files sequentially & enforce 100 MB Limit
  const addFilesToQueue = useCallback(
    (selectedFiles: File[]) => {
      const validFilesToQueue: { file: File; id: string }[] = [];

      for (const file of selectedFiles) {
        if (file.size > MAX_FILE_SIZE) {
          alert(`File "${file.name}" exceeds the 100 MB limit. Files must be 100 MB or smaller.`);
          continue;
        }

        const fileId = Math.random().toString(36).substring(2, 9);
        const newFileItem: FileItem = {
          id: fileId,
          name: file.name,
          size: file.size,
          type: file.type || 'application/octet-stream',
          progress: 0,
          status: 'pending',
          direction: 'sent',
        };

        setFiles((prev) => [...prev, newFileItem]);
        validFilesToQueue.push({ file, id: fileId });
      }

      fileQueueRef.current.push(...validFilesToQueue);
      processNextInQueue();
    },
    [processNextInQueue]
  );

  return {
    peerStatus,
    isPeerConnected,
    files,
    roomError,
    sendFile: addFilesToQueue,
  };
}
