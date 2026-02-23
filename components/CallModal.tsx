
import React, { useEffect, useRef, useState } from 'react';
import {
  Phone, PhoneOff, Mic, MicOff, Video, VideoOff,
  Volume2, VolumeX, SwitchCamera, Lock, ShieldCheck,
  X, Loader2
} from 'lucide-react';

interface CallModalProps {
  callId: number;
  isIncoming: boolean;
  callerName: string;
  avatar: string;
  type: 'video' | 'audio';
  onAccept?: () => void;
  onReject: () => void;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  status: string;
  securityCode: string | null;
  remoteVideoEnabled: boolean;
  duration?: number;
  error?: string | null;
  onSwitchCamera?: () => void;
  onToggleSpeaker?: () => void;
}

// === HELPER: Format Duration ===
const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// === HELPER: Security Emojis ===
const getSecurityEmojis = (code: string) => {
  const emojis = [
    '🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯',
    '🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆',
    '🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋',
    '🐌','🐞','🐜','🐢','🐍','🦎','🐙','🦑','🐠','🐟',
    '🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🐘','🦛',
    '🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖',
  ];
  let hash = 0;
  for (let i = 0; i < code.length; i++) {
    hash = ((hash << 5) - hash) + code.charCodeAt(i);
    hash = hash & 0xFFFFFFFF; // Convert to 32bit integer
  }
  const result = [];
  for (let i = 0; i < 4; i++) {
    result.push(emojis[Math.abs((hash + i * 1234567) % emojis.length)]);
  }
  return result;
};

// === COMPONENT: Error Toast ===
const ErrorToast = ({ message }: { message: string }) => (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top fade-in duration-300 pointer-events-none">
        <div className="bg-red-500/90 backdrop-blur-md text-white px-6 py-3 rounded-full shadow-2xl text-sm font-medium flex items-center gap-2 border border-red-400/30">
            <PhoneOff size={16} />
            {message}
        </div>
    </div>
);

// === COMPONENT: VideoPlayer ===
const VideoPlayer = React.memo(({ 
    stream, 
    isLocal, 
    className, 
    muted = false 
}: { 
    stream: MediaStream | null, 
    isLocal: boolean, 
    className: string, 
    muted?: boolean 
}) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        if (stream && stream.active) {
            if (video.srcObject !== stream) video.srcObject = stream;
            
            video.play().then(() => setIsReady(true)).catch(err => {
                if (err.name === 'NotAllowedError') {
                    video.muted = true;
                    video.play().then(() => setIsReady(true)).catch(console.warn);
                }
            });
        } else {
            video.srcObject = null;
            setIsReady(false);
        }
    }, [stream]);

    return (
        <div className={`relative ${className} overflow-hidden bg-black`}>
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted={muted || isLocal}
                style={isLocal ? { transform: 'scaleX(-1)' } : undefined}
            />
            {(!isReady && stream) && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm z-10">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}
        </div>
    );
});

// === COMPONENT: AudioPlayer ===
const AudioPlayer = React.memo(({ stream, isSpeakerOn }: { stream: MediaStream | null, isSpeakerOn: boolean }) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        if (audioRef.current && stream) {
            audioRef.current.srcObject = stream;
            audioRef.current.play().catch(console.warn);
        }
    }, [stream]);

    useEffect(() => {
        const switchOutput = async () => {
             const audioEl = audioRef.current as any;
             if (audioEl && typeof audioEl.setSinkId === 'function') {
                 try {
                     const devices = await navigator.mediaDevices.enumerateDevices();
                     const audioOutputs = devices.filter(d => d.kind === 'audiooutput');
                     let targetDeviceId = ""; 
                     
                     if (isSpeakerOn) {
                         const speaker = audioOutputs.find(d => d.label.toLowerCase().includes('speaker') || d.label.toLowerCase().includes('loud'));
                         if (speaker) targetDeviceId = speaker.deviceId;
                         else targetDeviceId = "communications"; // fallback
                     } else {
                         const receiver = audioOutputs.find(d => 
                             d.label.toLowerCase().includes('receiver') || 
                             d.label.toLowerCase().includes('earpiece') || 
                             d.label.toLowerCase().includes('headset')
                         );
                         if (receiver) targetDeviceId = receiver.deviceId;
                     }
                     try { await audioEl.setSinkId(targetDeviceId); } catch(e) {}
                 } catch(e) {}
             }
        };
        switchOutput();
    }, [isSpeakerOn]);

    return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
});

// === COMPONENT: Control Button ===
const ControlButton = ({ onClick, active, disabled, icon: Icon, danger, className = '', title }: any) => (
  <button
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`
      p-3.5 rounded-full transition-all duration-200 active:scale-90 shrink-0
      ${danger
          ? 'bg-red-500 text-white hover:bg-red-600 shadow-lg shadow-red-500/20 p-4'
          : active
          ? 'bg-white text-gray-900 shadow-lg'
          : disabled
          ? 'bg-gray-800/30 text-gray-600 cursor-not-allowed'
          : 'bg-gray-800/50 text-white hover:bg-gray-700 backdrop-blur-md'
      }
      ${className}
    `}
  >
    <Icon size={danger ? 28 : 22} />
  </button>
);

// === COMPONENT: Security Panel ===
const SecurityPanel = ({ code, callerName, onClose }: { code: string, callerName: string, onClose: () => void }) => (
  <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in zoom-in duration-200">
    <div className="bg-gray-900 border border-white/10 w-full max-w-xs rounded-3xl p-6 text-center relative shadow-2xl">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-gray-400 hover:text-white p-2 rounded-full hover:bg-white/10 transition"
      >
        <X size={20} />
      </button>

      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-green-500/30">
        <ShieldCheck size={32} className="text-green-500" />
      </div>

      <h3 className="text-white font-bold text-xl mb-2">Secure Call</h3>

      <div className="bg-white/5 rounded-2xl p-5 mb-4 border border-white/5">
        <p className="text-gray-500 text-[10px] uppercase tracking-wider font-bold mb-3">Identity Verification</p>
        <div className="flex justify-center gap-4 text-4xl mb-2">
          {getSecurityEmojis(code).map((emoji, i) => (
            <span
              key={i}
              className="animate-in zoom-in duration-300 hover:scale-125 transition cursor-default"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              {emoji}
            </span>
          ))}
        </div>
        <p className="text-gray-400 text-xs mt-2">
            Compare these emojis with {callerName}. If they match, the connection is 100% secure.
        </p>
      </div>
    </div>
  </div>
);

// === SCREEN: Incoming Call ===
const IncomingCallScreen = ({ callerName, avatar, type, onAccept, onReject }: any) => {
    const [isAccepting, setIsAccepting] = useState(false);

    const handleAccept = () => {
        if (isAccepting) return;
        setIsAccepting(true);
        if (onAccept) onAccept();
    };

    return (
      <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-900/95 backdrop-blur-xl px-4 font-sans">
        <div className="flex flex-col items-center gap-8 w-full max-w-sm animate-in fade-in zoom-in duration-300">
          <div className="relative">
            <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-blue-500 shadow-2xl shadow-blue-500/20">
              <img src={avatar} alt={callerName} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 rounded-full border-4 border-blue-400 animate-ping opacity-20" />
            <div className="absolute inset-0 rounded-full border-2 border-blue-300 animate-ping opacity-10" style={{ animationDelay: '0.5s' }} />
          </div>

          <div className="text-center space-y-2">
            <h3 className="text-3xl font-bold text-white tracking-tight">{callerName}</h3>
            <p className="text-blue-300 font-medium">Incoming {type} call...</p>
            <div className="flex items-center justify-center gap-2 text-xs text-green-400 bg-green-500/10 border border-green-500/20 py-1.5 px-4 rounded-full mx-auto w-fit">
              <ShieldCheck size={14} /> End-to-End Encrypted
            </div>
          </div>

          <div className="flex items-center gap-16 mt-8">
            <button onClick={onReject} disabled={isAccepting} className="flex flex-col items-center gap-2 group disabled:opacity-50">
              <div className="p-5 bg-red-500 rounded-full hover:bg-red-600 transition shadow-lg shadow-red-500/30 group-active:scale-95">
                <PhoneOff size={32} className="text-white" />
              </div>
              <span className="text-white/70 text-sm">Decline</span>
            </button>

            <button onClick={handleAccept} disabled={isAccepting} className="flex flex-col items-center gap-2 group disabled:opacity-80">
              <div className={`p-5 rounded-full transition shadow-lg shadow-green-500/30 group-active:scale-95 ${isAccepting ? 'bg-green-600 animate-pulse' : 'bg-green-500 hover:bg-green-600'}`}>
                {isAccepting ? <Loader2 size={32} className="text-white animate-spin" /> : <Phone size={32} className="text-white" />}
              </div>
              <span className="text-white/70 text-sm">{isAccepting ? 'Connecting...' : 'Accept'}</span>
            </button>
          </div>
        </div>
      </div>
    );
};

// === SCREEN: Audio Call ===
const AudioCallScreen = ({
  callerName, avatar, status, duration = 0,
  isMuted, isSpeakerOn, securityCode, remoteStream,
  onToggleMute, onToggleSpeaker, onEnd, onShowSecurity,
}: any) => (
  <div className="fixed inset-0 z-[50] bg-gradient-to-b from-slate-900 to-slate-950 flex flex-col items-center justify-between py-12 font-sans">
    {remoteStream && <AudioPlayer stream={remoteStream} isSpeakerOn={isSpeakerOn} />}

    <div className="w-full flex justify-center px-6 min-h-[40px]">
      {status === 'active' && securityCode && (
        <button onClick={onShowSecurity} className="flex items-center gap-2 bg-slate-800/50 border border-slate-700 text-green-400 px-3 py-1.5 rounded-full text-xs hover:bg-slate-800 transition">
          <Lock size={12} /> Secure Call
        </button>
      )}
    </div>

    <div className="flex flex-col items-center justify-center space-y-6 flex-1">
      <div className="relative">
        <div className="w-36 h-36 rounded-full border-2 border-slate-600 p-1 shadow-2xl">
          <img src={avatar} className="w-full h-full rounded-full object-cover bg-slate-800" />
        </div>
        {status === 'active' && <div className="absolute inset-0 rounded-full border border-green-500/30 animate-pulse" />}
      </div>

      <div className="text-center">
        <h2 className="text-2xl font-bold text-white mb-1">{callerName}</h2>
        <p className="text-slate-400 text-sm font-medium tracking-wide">
          {status === 'active' ? formatDuration(duration) : (status === 'reconnecting' ? 'Reconnecting...' : (status === 'ringing' ? 'Ringing...' : 'Connecting...'))}
        </p>
      </div>
    </div>

    <div className="w-full max-w-sm px-6">
      <div className="flex items-center justify-center gap-5 bg-slate-800/60 rounded-full px-8 py-4 border border-white/10 backdrop-blur-md shadow-2xl shadow-black/40">
        <ControlButton onClick={onToggleSpeaker} active={isSpeakerOn} icon={isSpeakerOn ? Volume2 : VolumeX} title="Speaker" />
        <ControlButton onClick={onToggleMute} active={isMuted} icon={isMuted ? MicOff : Mic} title={isMuted ? "Unmute" : "Mute"} />
        <ControlButton onClick={onEnd} danger icon={PhoneOff} title="End Call" />
      </div>
    </div>
  </div>
);

// === SCREEN: Video Call ===
const VideoCallScreen = ({
  callerName, avatar, status, duration = 0,
  localStream, remoteStream, remoteVideoActive,
  isMuted, isCameraOff, isSpeakerOn, securityCode,
  onToggleMute, onToggleCamera, onToggleSpeaker,
  onSwitchCamera, onEnd, onShowSecurity
}: any) => {
  return (
    <div className="fixed inset-0 z-[50] bg-gray-950 overflow-hidden flex items-center justify-center font-sans">
      {remoteStream && <AudioPlayer stream={remoteStream} isSpeakerOn={isSpeakerOn} />}
      
      {/* Background Gradient - Top & Bottom only for readability, keeping video clear */}
      <div className="absolute inset-0 pointer-events-none z-10" style={{ background: 'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, transparent 20%, transparent 75%, rgba(0,0,0,0.55) 100%)' }}></div>

      {/* Remote Video */}
      {status === 'active' && remoteStream && remoteVideoActive ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <VideoPlayer stream={remoteStream} isLocal={false} className="w-full h-full object-cover" />
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-0">
          <div className="relative">
            <img src={avatar} className="w-32 h-32 rounded-full border-4 border-white/10 shadow-2xl object-cover mb-6" />
            {status !== 'active' && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-full">
                <Loader2 size={40} className="text-white animate-spin" />
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">{callerName}</h2>
          <p className="text-white/50 text-sm font-medium tracking-wide">
            {status === 'active' ? (callerName + ' · Camera Off') : (status === 'reconnecting' ? 'Reconnecting...' : (status === 'ringing' ? 'Ringing...' : 'Connecting...'))}
          </p>
        </div>
      )}

      {/* Local Video - Floating */}
      <div className="absolute top-14 right-3 sm:top-16 sm:right-4 md:top-8 md:right-8 w-24 h-32 sm:w-28 sm:h-40 md:w-36 md:h-48 z-30 transition-all duration-300 cursor-move">
        <div className="w-full h-full rounded-2xl overflow-hidden bg-gray-800 shadow-2xl border border-white/20 relative group">
          {isCameraOff ? (
            <div className="w-full h-full flex flex-col items-center justify-center bg-gray-800 text-white/50">
              <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center mb-2"><VideoOff size={20} /></div>
              <span className="text-xs">Off</span>
            </div>
          ) : (
            <VideoPlayer stream={localStream} isLocal={true} className="w-full h-full object-cover" muted={true} />
          )}
          {!isCameraOff && onSwitchCamera && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition duration-200">
              <button onClick={onSwitchCamera} className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 active:scale-90">
                <SwitchCamera size={16} />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Header Info */}
      <div className="absolute top-0 left-0 right-0 p-4 z-30 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex flex-col">
            {status === 'active' && securityCode && (
                <button onClick={onShowSecurity} className="flex items-center gap-2 bg-black/30 backdrop-blur-md border border-white/10 text-white/90 px-3 py-1.5 rounded-full text-xs hover:bg-black/50 transition">
                    <Lock size={12} className="text-green-400" /> <span className="font-medium">Secure</span>
                </button>
            )}
        </div>
        
        {status === 'active' && (
            <div className="bg-black/30 backdrop-blur-md px-3 py-1 rounded-full border border-white/5">
                <span className="text-white font-mono text-sm">{formatDuration(duration)}</span>
            </div>
        )}
        <div className="w-20"></div> {/* Spacer for balance */}
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-lg px-4 z-40 pb-safe">
        <div className="flex items-center justify-center gap-3 px-6 py-4 rounded-full bg-black/50 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50">
          <ControlButton onClick={onToggleMute} active={isMuted} icon={isMuted ? MicOff : Mic} title={isMuted ? "Unmute" : "Mute"} />
          <ControlButton onClick={onToggleCamera} active={isCameraOff} icon={isCameraOff ? VideoOff : Video} title={isCameraOff ? "Camera On" : "Camera Off"} />
          <ControlButton onClick={onEnd} danger icon={PhoneOff} title="End Call" />
          <ControlButton onClick={onToggleSpeaker} active={isSpeakerOn} icon={isSpeakerOn ? Volume2 : VolumeX} title="Speaker" />
          {!isCameraOff && onSwitchCamera && <ControlButton onClick={onSwitchCamera} icon={SwitchCamera} title="Switch Camera" className="md:hidden" />}
        </div>
      </div>
    </div>
  );
};

// === MAIN COMPONENT ===
export const CallModal: React.FC<CallModalProps> = ({
  callId, isIncoming, callerName, avatar, type, onAccept, onReject, 
  localStream, remoteStream, status, securityCode, remoteVideoEnabled, 
  duration = 0, error, onSwitchCamera, onToggleSpeaker
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(type === 'video');
  const [showSecurity, setShowSecurity] = useState(false);

  useEffect(() => {
    if (type === 'audio') {
        setIsVideoOff(true);
        setIsSpeakerOn(true);
    }
  }, [type]);

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
      setIsMuted(!isMuted);
    }
  };

  const toggleVideo = () => {
    if (localStream && type === 'video') {
      localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
      setIsVideoOff(!isVideoOff);
    }
  };

  const toggleSpeaker = () => {
      setIsSpeakerOn(!isSpeakerOn);
      if (onToggleSpeaker) onToggleSpeaker();
  };

  if (isIncoming) {
      return <IncomingCallScreen callerName={callerName} avatar={avatar} type={type} onAccept={onAccept} onReject={onReject} />;
  }

  const commonProps = {
      callerName, avatar, status, duration,
      isMuted, isSpeakerOn, securityCode, remoteStream,
      onToggleMute: toggleMute,
      onToggleSpeaker: toggleSpeaker,
      onEnd: onReject,
      onShowSecurity: () => setShowSecurity(true)
  };

  return (
      <>
        {error && <ErrorToast message={error} />}
        {type === 'audio' ? (
            <AudioCallScreen {...commonProps} />
        ) : (
            <VideoCallScreen 
                {...commonProps}
                localStream={localStream}
                remoteVideoActive={remoteVideoEnabled}
                isCameraOff={isVideoOff}
                onToggleCamera={toggleVideo}
                onSwitchCamera={onSwitchCamera}
            />
        )}
        
        {showSecurity && securityCode && (
            <SecurityPanel code={securityCode} callerName={callerName} onClose={() => setShowSecurity(false)} />
        )}
      </>
  );
};

export default CallModal;
