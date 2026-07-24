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

export function useWebRTC(roomCode: string) {
  const [peerStatus, setPeerStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'failed'>('connecting');
  const [files, setFiles] = useState<FileItem[]>([]);
  const [textItems, setTextItems] = useState<TextItem[]>([]);
  const [isPeerConnected, setIsPeerConnected] = useState<boolean>(false);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const dataChannelRef = useRef<RTCDataChannel | null>(null);
  
  const myPeerIdRef = useRef<string>('');
  const remotePeerIdRef = useRef<string | null>(null);
  const iceCandidateBuffer = useRef<RTCIceCandidateInit[]>([]);

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

  if (!myPeerIdRef.current) {
    myPeerIdRef.current = Math.random().toString(36).substring(2, 9);
  }

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
          console.error('Error parsing control message:', e);
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

  useEffect(() => {
    if (!roomCode) return;

    const pc = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = pc;

    const dc = pc.createDataChannel('fileTransfer', { ordered: true });
    setupDataChannel(dc);

    pc.ondatachannel = (event) => {
      setupDataChannel(event.channel);
    };

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'connected') {
        setPeerStatus('connected');
        setIsPeerConnected(true);
      } else if (pc.iceConnectionState === 'disconnected' || pc.iceConnectionState === 'closed') {
        setPeerStatus('disconnected');
        setIsPeerConnected(false);
        remotePeerIdRef.current = null;
      } else if (pc.iceConnectionState === 'failed') {
        setPeerStatus('failed');
        setIsPeerConnected(false);
        remotePeerIdRef.current = null;
      }
    };

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
        
        // Room cap limit: Reject third peer ONLY if we are already connected to someone else
        const isConnected = pc.iceConnectionState === 'connected';
        if (isConnected && remotePeerIdRef.current && remotePeerIdRef.current !== payload.senderId) {
          if (payload.type === 'peer-joined') {
            console.log('A third device tried to join, but this room is full.');
          }
          return; // Ignore all signals from a third peer
        }

        try {
          if (payload.type === 'peer-joined' || payload.type === 'peer-announce') {
            remotePeerIdRef.current = payload.senderId;

            // Reply with peer-announce if we received peer-joined so both sides know each other's ID
            if (payload.type === 'peer-joined') {
              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'peer-announce', senderId: myPeerIdRef.current },
              });
            }

            // Perfect Negotiation (Polite Peer): Lower ID initiates the offer
            if (myPeerIdRef.current < payload.senderId) {
              const offer = await pc.createOffer();
              await pc.setLocalDescription(offer);

              channel.send({
                type: 'broadcast',
                event: 'signal',
                payload: { type: 'offer', sdp: offer, senderId: myPeerIdRef.current },
              });
            }
          } else if (payload.type === 'offer') {
            remotePeerIdRef.current = payload.senderId;
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            
            // Apply buffered ICE candidates
            while (iceCandidateBuffer.current.length > 0) {
              const candidate = iceCandidateBuffer.current.shift();
              if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            channel.send({
              type: 'broadcast',
              event: 'signal',
              payload: { type: 'answer', sdp: answer, senderId: myPeerIdRef.current },
            });
          } else if (payload.type === 'answer') {
            await pc.setRemoteDescription(new RTCSessionDescription(payload.sdp));
            // Apply buffered ICE candidates
            while (iceCandidateBuffer.current.length > 0) {
              const candidate = iceCandidateBuffer.current.shift();
              if (candidate) await pc.addIceCandidate(new RTCIceCandidate(candidate));
            }
          } else if (payload.type === 'ice' && payload.candidate) {
            if (pc.remoteDescription) {
              await pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
            } else {
              iceCandidateBuffer.current.push(payload.candidate);
            }
          }
        } catch (err) {
          console.error('Signaling error:', err);
        }
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // Announce presence to room
          channel.send({
            type: 'broadcast',
            event: 'signal',
            payload: { type: 'peer-joined', senderId: myPeerIdRef.current },
          });
        }
      });

    return () => {
      dc.close();
      pc.close();
      supabase.removeChannel(channel);
    };
  }, [roomCode, setupDataChannel]);

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
        // Send explicit EOF
        dc.send(JSON.stringify({ type: 'file-eof', id: fileId }));
        
        setFiles((prev) =>
          prev.map((f) => (f.id === fileId ? { ...f, progress: 100, status: 'completed' } : f))
        );
        isSending.current = false;
        processQueue(); // start next file
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
            console.error('Chunk send error:', err);
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
