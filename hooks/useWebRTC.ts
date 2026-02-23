import { useState, useRef, useCallback, useEffect } from 'react';
import { api } from '../services/api';

// Added reliable STUN and free TURN servers (Metered) to ensure stable connections
// even behind strict firewalls and NATs.
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ]
};

const CALL_TIMEOUT_MS = 45000;
const RECONNECT_ATTEMPTS = 3;
const ICE_GATHERING_TIMEOUT = 15000;

export const CALL_STATES = {
  IDLE: 'idle',
  RINGING: 'ringing', // Outgoing
  CONNECTING: 'connecting',
  ACTIVE: 'active',
  RECONNECTING: 'reconnecting',
  ENDED: 'ended',
  INCOMING: 'incoming'
};

export function useWebRTC(userId: number | undefined) {
  // === State ===
  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [callId, setCallId] = useState<number | null>(null);
  const [callType, setCallType] = useState<'video' | 'audio'>('video');
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [securityCode, setSecurityCode] = useState<string | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [remoteVideoActive, setRemoteVideoActive] = useState(false);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  
  // === Refs ===
  const peerConnection = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream>(new MediaStream());
  const callIdRef = useRef<number | null>(null);
  const callStateRef = useRef(CALL_STATES.IDLE);
  const pollIntervalRef = useRef<any>(null);
  const callTimerRef = useRef<any>(null);
  const callTimeoutRef = useRef<any>(null);
  const reconnectAttemptsRef = useRef(0);
  const handledCallIds = useRef(new Set<number>());
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);
  const sdpFailureCount = useRef(0);
  
  // Lock to prevent double clicks / race conditions
  const operationLock = useRef(false);

  // Sync refs
  useEffect(() => { callStateRef.current = callState; }, [callState]);
  useEffect(() => { callIdRef.current = callId; }, [callId]);

  // === Ringtones ===
  useEffect(() => {
    ringtoneRef.current = new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.m4a');
    ringtoneRef.current.loop = true;
    return () => { if (ringtoneRef.current) { ringtoneRef.current.pause(); ringtoneRef.current = null; } };
  }, []);

  const playRingtone = useCallback(() => { 
      if (ringtoneRef.current && (callStateRef.current === CALL_STATES.RINGING || callStateRef.current === CALL_STATES.INCOMING)) {
          ringtoneRef.current.play().catch(() => {}); 
      }
  }, []);
  
  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
    }
  }, []);

  // === Timer ===
  const startCallTimer = useCallback(() => {
    setCallDuration(0);
    if(callTimerRef.current) clearInterval(callTimerRef.current);
    callTimerRef.current = setInterval(() => setCallDuration(p => p + 1), 1000);
  }, []);

  const stopCallTimer = useCallback(() => {
    if (callTimerRef.current) { clearInterval(callTimerRef.current); callTimerRef.current = null; }
    setCallDuration(0);
  }, []);

  // === Security Fingerprint ===
  const generateSecurityCode = useCallback((pc: RTCPeerConnection) => {
    if (!pc?.currentLocalDescription?.sdp || !pc?.currentRemoteDescription?.sdp) return null;
    try {
        const extractFingerprint = (sdp: string) => {
          const line = sdp.split('\r\n').find((l) => l.startsWith('a=fingerprint:'));
          return line ? line.split(' ').slice(1).join(' ') : '';
        };
        const localFP = extractFingerprint(pc.currentLocalDescription.sdp);
        const remoteFP = extractFingerprint(pc.currentRemoteDescription.sdp);
        if (!localFP || !remoteFP) return null;
        const combined = [localFP, remoteFP].sort().join('|');
        let hash = 0;
        for (let i = 0; i < combined.length; i++) {
          hash = ((hash << 5) - hash) + combined.charCodeAt(i);
          hash = hash & hash;
        }
        return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0') + combined.length;
    } catch(e) { return null; }
  }, []);

  // === Permissions ===
  const checkPermissions = useCallback(async (type: 'video' | 'audio') => {
    try {
      const constraints = {
        audio: { 
            echoCancellation: true, 
            noiseSuppression: true, 
            autoGainControl: true,
            channelCount: 1,
            sampleRate: 48000
        },
        video: type === 'video' ? { 
            facingMode: 'user', 
            width: { ideal: 640, max: 1280 }, 
            height: { ideal: 480, max: 720 },
            frameRate: { ideal: 24, max: 30 }
        } : false,
      };
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err: any) {
      let errorMsg = 'Could not access media devices.';
      if (err.name === 'NotAllowedError') errorMsg = 'Permission denied. Enable camera/mic in browser settings.';
      else if (err.name === 'NotFoundError') errorMsg = 'No camera or microphone found.';
      else if (err.name === 'NotReadableError') errorMsg = 'Camera is in use by another app.';
      else if (err.name === 'OverconstrainedError') errorMsg = 'Device does not satisfy criteria.';
      
      console.warn("Media Error:", err.name, errorMsg);
      setError(errorMsg);
      return null;
    }
  }, []);

  // === Cleanup ===
  const cleanup = useCallback(() => {
    stopRingtone();
    stopCallTimer();
    if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); track.enabled = false; } catch (e) {}
      });
      localStreamRef.current = null;
    }

    if (remoteStreamRef.current) {
      remoteStreamRef.current.getTracks().forEach((track) => {
        try { track.stop(); } catch (e) {}
      });
      remoteStreamRef.current = new MediaStream();
    }

    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }

    reconnectAttemptsRef.current = 0;
    sdpFailureCount.current = 0;
    operationLock.current = false;

    setLocalStream(null);
    setRemoteStream(null);
    setCallState(CALL_STATES.IDLE);
    setCallId(null);
    setSecurityCode(null);
    setIsMuted(false);
    setIsCameraOff(false);
    setIsSpeakerOn(true);
    setFacingMode('user');
    setError(null);
    setRemoteVideoActive(false);
    setIncomingCall(null);
  }, [stopRingtone, stopCallTimer]);

  const waitForIceGathering = useCallback((pc: RTCPeerConnection, timeout = ICE_GATHERING_TIMEOUT) => {
    return new Promise<void>((resolve) => {
      if (pc.iceGatheringState === 'complete') { resolve(); return; }
      const timer = setTimeout(resolve, timeout);
      pc.onicegatheringstatechange = () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(timer); resolve(); }
      };
    });
  }, []);

  // === WebRTC Logic ===
  const createPeerConnection = useCallback((stream: MediaStream) => {
      remoteStreamRef.current = new MediaStream();
      setRemoteStream(null);

      const pc = new RTCPeerConnection(ICE_SERVERS);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));

      pc.ontrack = (event) => {
        event.streams[0]?.getTracks().forEach((track) => remoteStreamRef.current.addTrack(track));
        const newStream = new MediaStream(remoteStreamRef.current.getTracks());
        setRemoteStream(newStream);
        
        const videoTrack = newStream.getVideoTracks()[0];
        setRemoteVideoActive(!!(videoTrack && !videoTrack.muted && videoTrack.enabled));
        if (videoTrack) {
            videoTrack.onmute = () => setRemoteVideoActive(false);
            videoTrack.onunmute = () => setRemoteVideoActive(true);
        }
      };

      const handleConnectionFailure = () => {
        if (reconnectAttemptsRef.current < RECONNECT_ATTEMPTS) {
            setCallState(CALL_STATES.RECONNECTING);
            reconnectAttemptsRef.current++;
            try {
                if (pc.signalingState !== 'closed') {
                   try { pc.restartIce(); } catch (e) {}
                }
            } catch (e) {}
        } else {
            setError("Connection failed. Please check your network.");
            cleanup();
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
            setCallState(CALL_STATES.ACTIVE);
            reconnectAttemptsRef.current = 0;
            stopRingtone(); 
        } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
            handleConnectionFailure();
        }
      };
      
      pc.onconnectionstatechange = () => {
          if (pc.connectionState === 'failed') handleConnectionFailure();
      };

      peerConnection.current = pc;
      return pc;
    }, [cleanup, stopRingtone]);

  const endCall = useCallback(async () => {
    const id = callIdRef.current;
    if (id) { handledCallIds.current.add(id); await api.endCall(id).catch(() => {}); }
    cleanup();
  }, [cleanup]);

  const startPolling = useCallback(() => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    
    const _doPoll = async () => {
      const cid = callIdRef.current;
      if (!cid) return;

      try {
        const result = await api.pollCallStatus(cid);
        if (!result) return;

        if (result.status === 'active' && result.sdp_answer) {
          const pc = peerConnection.current;
          if (pc && pc.signalingState === 'have-local-offer') {
            try {
              const answer = JSON.parse(result.sdp_answer);
              await pc.setRemoteDescription(new RTCSessionDescription(answer));
              setCallState(CALL_STATES.ACTIVE);
              startCallTimer();
              stopRingtone();
              const code = generateSecurityCode(pc);
              if (code) setSecurityCode(code);
              sdpFailureCount.current = 0;
            } catch (e) { 
                console.error("SDP Parsing Error:", e);
                sdpFailureCount.current++;
                if (sdpFailureCount.current >= 3) {
                    setError("Connection failed (Protocol Error).");
                    endCall();
                }
            }
          }
        } else if (result.status === 'ended' || result.status === 'rejected') {
          handledCallIds.current.add(cid);
          endCall();
        } else if (result.status === 'timeout') {
          handledCallIds.current.add(cid);
          setError("No answer.");
          endCall();
        }
      } catch (e) {}
    };

    _doPoll();
    pollIntervalRef.current = setInterval(_doPoll, 800);
  }, [startCallTimer, stopRingtone, generateSecurityCode, endCall]);

  // === Actions ===
  const startCall = useCallback(async (callerId: number, targetUserId: number, type: 'video' | 'audio' = 'video') => {
      if (operationLock.current) return false;
      if (callStateRef.current !== CALL_STATES.IDLE) return false;
      
      operationLock.current = true;
      setError(null);

      let stream = await checkPermissions(type);
      let finalType = type;

      if (!stream && type === 'video') {
          setError(null); 
          stream = await checkPermissions('audio');
          if (stream) {
              finalType = 'audio';
          }
      }

      if (!stream) {
          operationLock.current = false;
          return false;
      }

      setCallType(finalType);
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (finalType === 'audio') { setIsCameraOff(true); setIsSpeakerOn(true); }
      
      setCallState(CALL_STATES.RINGING);
      playRingtone();

      const pc = createPeerConnection(stream);
      try {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: finalType === 'video' });
        await pc.setLocalDescription(offer);
        await waitForIceGathering(pc);

        const result = await api.initiateCall(callerId, targetUserId, JSON.stringify(pc.localDescription), finalType);
        
        if (result.success && result.call_id) {
          setCallId(result.call_id);
          callTimeoutRef.current = setTimeout(() => {
            if (callStateRef.current === CALL_STATES.RINGING) { 
                setError('No answer.'); 
                endCall(); 
            }
          }, CALL_TIMEOUT_MS);
          startPolling();
          return true;
        } else {
          setError('Failed to reach server.');
          cleanup();
          return false;
        }
      } catch (e) { 
          setError('Connection error.'); 
          cleanup(); 
          return false; 
      } finally {
          operationLock.current = false;
      }
    }, [checkPermissions, createPeerConnection, waitForIceGathering, startPolling, cleanup, playRingtone, endCall]);

  const answerIncomingCall = useCallback(async () => {
      if (operationLock.current) return false;
      const call = incomingCall;
      if (!call) return false;

      operationLock.current = true;
      setError(null);
      
      if (peerConnection.current) {
          try { peerConnection.current.close(); } catch(e){}
          peerConnection.current = null;
      }
      
      let type = call.call_type || 'video';
      setCallId(call.id);

      let stream = await checkPermissions(type);
      
      if (!stream && type === 'video') {
          setError(null);
          stream = await checkPermissions('audio');
          if (stream) type = 'audio';
      }

      if (!stream) { 
          await api.endCall(call.id); 
          cleanup(); 
          return false; 
      }

      setCallType(type);
      localStreamRef.current = stream;
      setLocalStream(stream);
      if (type === 'audio') { setIsCameraOff(true); setIsSpeakerOn(true); }

      setCallState(CALL_STATES.CONNECTING);
      stopRingtone();

      const pc = createPeerConnection(stream);
      try {
        const offer = JSON.parse(call.sdp_offer);
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await waitForIceGathering(pc);

        await api.answerCall(call.id, JSON.stringify(pc.localDescription));
        
        startPolling();
        setIncomingCall(null);
        startCallTimer(); 
        const code = generateSecurityCode(pc);
        if (code) setSecurityCode(code);
        
        return true;
      } catch (e) { 
          setError('Failed to connect.'); 
          cleanup(); 
          return false; 
      } finally {
          operationLock.current = false;
      }
    }, [incomingCall, checkPermissions, createPeerConnection, waitForIceGathering, startPolling, cleanup, stopRingtone, startCallTimer, generateSecurityCode]);

  const rejectCall = useCallback(async () => {
      const id = incomingCall?.id || callIdRef.current;
      if (id) { handledCallIds.current.add(id); await api.endCall(id).catch(() => {}); }
      stopRingtone();
      setIncomingCall(null);
      if (callIdRef.current === id) cleanup();
    }, [incomingCall, stopRingtone, cleanup]);


  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setIsMuted(p => !p);
    }
  }, []);

  const toggleCamera = useCallback(() => {
    if (localStreamRef.current && callType === 'video') {
      localStreamRef.current.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setIsCameraOff(p => !p);
    }
  }, [callType]);

  const switchCamera = useCallback(async () => {
    if (!localStreamRef.current || callType !== 'video') return;
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    localStreamRef.current.getVideoTracks().forEach(t => t.stop());

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: newFacing, width: { ideal: 640 }, height: { ideal: 480 } },
        audio: false,
      });
      const newVideoTrack = newStream.getVideoTracks()[0];
      const combinedStream = new MediaStream([...localStreamRef.current.getAudioTracks(), newVideoTrack]);
      localStreamRef.current = combinedStream;
      setLocalStream(combinedStream);

      if (peerConnection.current) {
        const sender = peerConnection.current.getSenders().find((s) => s.track?.kind === 'video');
        if (sender) await sender.replaceTrack(newVideoTrack);
      }
      setFacingMode(newFacing);
    } catch (e) { setError('Cannot switch camera.'); }
  }, [facingMode, callType]);

  const toggleSpeaker = useCallback(() => setIsSpeakerOn(p => !p), []);

  // === Incoming Call Polling ===
  useEffect(() => {
    if (!userId) return;
    const checkIncoming = async () => {
      if (callStateRef.current === CALL_STATES.RINGING) {
          try {
            const result = await api.checkForCalls(userId);
            if (result?.incoming && result?.call && !handledCallIds.current.has(result.call.id)) {
                handledCallIds.current.add(result.call.id);
                await api.endCall(result.call.id);
            }
          } catch(e) {}
          return;
      }

      if (callStateRef.current !== CALL_STATES.IDLE && callStateRef.current !== CALL_STATES.INCOMING) return;

      try {
        const result = await api.checkForCalls(userId);
        if (result?.incoming && result?.call && !handledCallIds.current.has(result.call.id)) {
          if (callStateRef.current !== CALL_STATES.IDLE) return;
          
          setIncomingCall(result.call);
          setCallType(result.call.call_type || 'video');
          setCallState(CALL_STATES.INCOMING);
          playRingtone();
        }
      } catch (e) {}
    };
    
    const interval = setInterval(checkIncoming, 2000);
    return () => clearInterval(interval);
  }, [userId, playRingtone]);

  return {
    callState, callType, callId, localStream, remoteStream,
    isMuted, isCameraOff, isSpeakerOn, facingMode, securityCode,
    callDuration, error, remoteVideoActive, incomingCall,
    startCall, answerIncomingCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera, toggleSpeaker,
  };
}