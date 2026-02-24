import React, { useState, useEffect, useRef, memo, useMemo, useCallback } from 'react';
import { Auth } from './components/Auth';
import { SettingsModal } from './components/SettingsModal';
import { CallModal } from './components/CallModal';
import { ProfileView } from './components/ProfileView';
import { ContactsView } from './components/ContactsView';
import { User, Contact, Message, MessageType } from './types';
import { api } from './services/api';
import { LS_KEYS } from './constants';
import { useWebRTC, CALL_STATES } from './hooks/useWebRTC';
import { 
  Search, Send, ArrowLeft, Settings, CheckCheck, 
  Phone, Video, Trash2, X, Paperclip, Users, Loader2, Play, Pause,
  Download, Maximize2, FileDown,
  ArrowDown, Copy, CornerUpLeft, ArrowRight,
  CheckSquare, Square, Mic, UserPlus, MessageCircle, ChevronDown, User as UserIcon
} from 'lucide-react';

// --- Voice Recording Component ---
const MrV_VoiceBtn = ({ disabled, onRecorded }: { disabled: boolean, onRecorded: (file: File) => void }) => {
    const [recording, setRecording] = useState(false);
    const [duration, setDuration] = useState(0);
    const mediaRecorder = useRef<MediaRecorder | null>(null);
    const intervalRef = useRef<any>(null);
    const chunks = useRef<Blob[]>([]);

    useEffect(() => {
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                mediaRecorder.current.stop();
            }
        };
    }, []);

    const startRecording = async () => {
        if (disabled || recording) return;
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, sampleRate: 48000 } });
            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus") ? "audio/webm;codecs=opus" : "audio/webm";
            mediaRecorder.current = new MediaRecorder(stream, { mimeType });
            
            chunks.current = [];
            mediaRecorder.current.ondataavailable = (e) => {
                if (e.data.size > 0) chunks.current.push(e.data);
            };

            mediaRecorder.current.onstop = () => {
                stream.getTracks().forEach(t => t.stop());
                const blob = new Blob(chunks.current, { type: mimeType });
                const file = new File([blob], "voice.webm", { type: mimeType });
                onRecorded(file);
                setRecording(false);
                setDuration(0);
                if (intervalRef.current) clearInterval(intervalRef.current);
            };

            mediaRecorder.current.start(100);
            setRecording(true);
            setDuration(0);
            intervalRef.current = setInterval(() => {
                setDuration(p => {
                    if (p >= 120) { // 2 minutes max
                        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
                            mediaRecorder.current.stop();
                        }
                        return p;
                    }
                    return p + 1;
                });
            }, 1000);
        } catch (e) {
            alert('Microphone permission denied.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorder.current && mediaRecorder.current.state === 'recording') {
            mediaRecorder.current.stop();
        }
    };

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${String(sec).padStart(2, '0')}`;
    };

    return (
        <button
            type="button"
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onTouchStart={(e) => { e.preventDefault(); startRecording(); }}
            onTouchEnd={(e) => { e.preventDefault(); stopRecording(); }}
            onMouseLeave={stopRecording}
            disabled={disabled}
            title={recording ? "Release to send" : "Hold to record"}
            className={`p-3 rounded-full transition-all duration-150 select-none ${recording ? 'bg-red-500 text-white scale-110 shadow-lg shadow-red-500/40' : 'text-gray-500 hover:bg-gray-100 hover:text-primary-600'}`}
        >
            {recording ? (
                <div className="flex flex-col items-center gap-0.5">
                    <Mic size={18} fill="currentColor" />
                    <span className="text-[9px] font-mono leading-none">{formatTime(duration)}</span>
                </div>
            ) : (
                <Mic size={20} />
            )}
        </button>
    );
};

// --- Crypto Helpers (UNCHANGED) ---
const cryptoUtils = {
  generateKeyPair: async () => window.crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]),
  exportKey: async (key: CryptoKey) => btoa(String.fromCharCode(...new Uint8Array(await window.crypto.subtle.exportKey("spki", key)))),
  exportPrivateKey: async (key: CryptoKey) => btoa(String.fromCharCode(...new Uint8Array(await window.crypto.subtle.exportKey("pkcs8", key)))),
  importKey: async (pem: string) => {
    const binary = atob(pem);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return window.crypto.subtle.importKey("spki", bytes, { name: "ECDH", namedCurve: "P-256" }, true, []);
  },
  importPrivateKey: async (pem: string) => {
    const binary = atob(pem);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return window.crypto.subtle.importKey("pkcs8", bytes, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  },
  deriveSecretKey: async (privateKey: CryptoKey, publicKey: CryptoKey) => window.crypto.subtle.deriveKey({ name: "ECDH", public: publicKey }, privateKey, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]),
  encrypt: async (text: string, secretKey: CryptoKey) => {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(text);
    const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, secretKey, encoded);
    return `?ENC?|${btoa(String.fromCharCode(...iv))}|${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
  },
  decrypt: async (encryptedStr: string, secretKey: CryptoKey) => {
    try {
      const parts = encryptedStr.split('|');
      if (parts.length !== 3) return null;
      const iv = new Uint8Array(atob(parts[1]).split('').map(c => c.charCodeAt(0)));
      const cipher = new Uint8Array(atob(parts[2]).split('').map(c => c.charCodeAt(0)));
      return new TextDecoder().decode(await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, secretKey, cipher));
    } catch (e) { return null; }
  },
  encryptFile: async (file: File) => {
      const key = await window.crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
      const iv = window.crypto.getRandomValues(new Uint8Array(12));
      const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, await file.arrayBuffer());
      return { encryptedBlob: new Blob([encryptedBuffer]), key: JSON.stringify(await window.crypto.subtle.exportKey("jwk", key)), iv: Array.from(iv).toString() };
  },
  decryptFile: async (encryptedBlob: Blob, keyJson: string, ivString: string) => {
      try {
          const key = await window.crypto.subtle.importKey("jwk", JSON.parse(keyJson), { name: "AES-GCM" }, true, ["decrypt"]);
          const iv = new Uint8Array(ivString.split(',').map(Number));
          return new Blob([await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, await encryptedBlob.arrayBuffer())]);
      } catch (e) { return null; }
  }
};

// --- Helper Components ---
const CustomAudioPlayer = ({ src, isOwn = false }: { src: string, isOwn?: boolean }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);
  return (
    <div className={`flex items-center gap-3 p-2 rounded-xl min-w-[200px] ${isOwn ? 'bg-primary-500 text-white' : 'bg-white text-gray-800 border border-gray-100'}`}>
      <button onClick={(e) => { e.stopPropagation(); if(isPlaying) audioRef.current?.pause(); else audioRef.current?.play(); setIsPlaying(!isPlaying); }} className={`p-2 rounded-full shrink-0 transition ${isOwn ? 'bg-white/20 hover:bg-white/30 text-white' : 'bg-primary-100 text-primary-600 hover:bg-primary-200'}`}>
        {isPlaying ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" />}
      </button>
      <div className="flex-1 flex flex-col justify-center gap-1">
         <div className="relative h-1 bg-black/10 rounded-full overflow-hidden w-full"><div className={`absolute left-0 top-0 bottom-0 transition-all duration-100 ${isOwn ? 'bg-white/90' : 'bg-primary-500'}`} style={{ width: `${progress}%` }}></div></div>
      </div>
      <audio ref={audioRef} src={src} onTimeUpdate={() => audioRef.current && setProgress((audioRef.current.currentTime / audioRef.current.duration) * 100)} onEnded={() => {setIsPlaying(false); setProgress(0);}} className="hidden" />
    </div>
  );
};

interface AttachmentProps {
    url: string;
    type: MessageType;
    fileKey: string;
    fileIv: string;
    isOwn: boolean;
    onPreview: (url: string, type: MessageType, name: string) => void;
}

const SecureAttachment = ({ url, type, fileKey, fileIv, isOwn, onPreview }: AttachmentProps) => {
    const [blobUrl, setBlobUrl] = useState<string | null>(null);
    const [fileSize, setFileSize] = useState<string>('');
    const [fileName, setFileName] = useState<string>('File');

    useEffect(() => {
        let active = true;
        const fetchAndDecrypt = async () => {
            try {
                const res = await fetch(url);
                const blob = await res.blob();
                const decryptedBlob = await cryptoUtils.decryptFile(blob, fileKey, fileIv);
                
                if (decryptedBlob && active) {
                    const url = URL.createObjectURL(decryptedBlob);
                    setBlobUrl(url);
                    const sizeInMB = decryptedBlob.size / (1024 * 1024);
                    setFileSize(sizeInMB < 1 ? `${(decryptedBlob.size / 1024).toFixed(0)} KB` : `${sizeInMB.toFixed(1)} MB`);
                    setFileName(`${type}_${Date.now()}.${type === 'image' ? 'jpg' : type === 'video' ? 'mp4' : 'webm'}`);
                }
            } catch (e) {} 
        };
        fetchAndDecrypt();
        return () => { active = false; if (blobUrl) URL.revokeObjectURL(blobUrl); };
    }, [url]);

    if (!blobUrl) return <div className="flex items-center justify-center bg-gray-100 rounded-lg w-48 h-32"><Loader2 className="animate-spin text-gray-400" /></div>;

    const handleDownload = (e: React.MouseEvent) => {
        e.stopPropagation();
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    return (
        <div className="mb-1 rounded-lg overflow-hidden relative group border border-black/5">
            <div onClick={() => type !== 'audio' && onPreview(blobUrl, type, fileName)} className="cursor-pointer relative">
                {type === 'image' && <img src={blobUrl} className="w-full h-auto max-h-72 object-cover" />}
                {type === 'video' && <video src={blobUrl} className="w-full max-h-72 bg-black" />}
                {type !== 'audio' && (
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                        <Maximize2 className="text-white drop-shadow-lg" />
                    </div>
                )}
            </div>
            {type === 'audio' && <CustomAudioPlayer src={blobUrl} isOwn={isOwn} />}
            <div className={`flex items-center justify-between px-2 py-1 text-[10px] ${isOwn ? 'bg-primary-600 text-primary-100' : 'bg-gray-100 text-gray-500'}`}>
                <span className="font-mono">{fileSize}</span>
                <button onClick={handleDownload} className="flex items-center gap-1 hover:underline p-1">
                    <FileDown size={12} /> Save
                </button>
            </div>
        </div>
    );
};

const SmartMessage = memo(({ msg, secretKey, isMe, onPreview, onLoadDecrypted }: { msg: Message, secretKey?: CryptoKey, isMe: boolean, onPreview: any, onLoadDecrypted?: (text: string) => void }) => {
    const [decryptedText, setDecryptedText] = useState<string>('');
    const [fileData, setFileData] = useState<{key: string, iv: string} | null>(null);

    useEffect(() => {
        const process = async () => {
            if (!msg.message.startsWith('?ENC?')) { 
                setDecryptedText(msg.message); 
                if(onLoadDecrypted) onLoadDecrypted(msg.message);
                return; 
            }
            if (!secretKey) return;
            const plain = await cryptoUtils.decrypt(msg.message, secretKey);
            if (plain) {
                if (plain.includes("||FILE_SEC||")) {
                    const [t, j] = plain.split("||FILE_SEC||");
                    try { setFileData(JSON.parse(j)); setDecryptedText(t); if(onLoadDecrypted) onLoadDecrypted(t); } 
                    catch(e) { setDecryptedText(plain); if(onLoadDecrypted) onLoadDecrypted(plain); }
                } else {
                    setDecryptedText(plain);
                    if(onLoadDecrypted) onLoadDecrypted(plain);
                }
            } else setDecryptedText('🔒 Encrypted message');
        };
        process();
    }, [msg.message, secretKey]);

    return (
        <div className="flex flex-col">
            {msg.attachment_url && fileData && <SecureAttachment url={msg.attachment_url} type={msg.type} fileKey={fileData.key} fileIv={fileData.iv} isOwn={isMe} onPreview={onPreview} />}
            <span dir="auto" className="break-words whitespace-pre-wrap px-1">{decryptedText}</span>
        </div>
    );
});

// --- UI Interaction Components ---

const ContextMenu = ({ x, y, options, onClose }: { x: number, y: number, options: any[], onClose: () => void }) => {
    // Determine position to keep in viewport
    const style: React.CSSProperties = { top: y, left: x };
    if (window.innerWidth - x < 150) style.left = x - 150;
    if (window.innerHeight - y < 250) style.top = y - 200;

    // Safety ref to prevent closing immediately upon opening (finger lift issue)
    const canCloseRef = useRef(false);

    useEffect(() => {
        const timer = setTimeout(() => { canCloseRef.current = true; }, 400);
        return () => clearTimeout(timer);
    }, []);

    const handleClose = () => {
        if (canCloseRef.current) onClose();
    };

    return (
        <div 
            className="fixed inset-0 z-[100] bg-transparent font-sans" 
            onClick={(e) => { e.stopPropagation(); handleClose(); }} 
            onContextMenu={(e) => { e.preventDefault(); handleClose(); }}
        >
            <div 
                className="absolute bg-white rounded-xl shadow-2xl border border-gray-100 w-40 overflow-hidden py-1 animate-in zoom-in-95 duration-100" 
                style={style}
            >
                {options.map((opt, i) => (
                    <button 
                        key={i} 
                        onClick={(e) => { e.stopPropagation(); opt.action(); onClose(); }}
                        className={`w-full text-left px-4 py-3 text-sm flex items-center gap-3 hover:bg-gray-50 transition ${opt.color || 'text-gray-700'}`}
                    >
                        {opt.icon} {opt.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

const ForwardModal = ({ contacts, onClose, onForward }: { contacts: Contact[], onClose: () => void, onForward: (contactId: number) => void }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black/50 flex items-center justify-center p-4 font-sans backdrop-blur-sm">
            <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[80vh]">
                <div className="p-4 border-b flex items-center justify-between">
                    <h3 className="font-bold">Forward to...</h3>
                    <button onClick={onClose}><X size={20} /></button>
                </div>
                <div className="overflow-y-auto flex-1 p-2">
                    {contacts.map(c => (
                        <div key={c.id} onClick={() => onForward(c.id)} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-xl cursor-pointer">
                            <img src={c.avatar || `https://ui-avatars.com/api/?name=${c.username}`} className="w-10 h-10 rounded-full" />
                            <span className="font-medium">{c.username}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Message Item wrapper to handle Swiping, Long Press and Context Menu
const MessageItem = memo(({ 
    msg, isMe, secretKey, onPreview, onContextMenu, onSwipeReply, isSelectionMode, isSelected, onSelect 
}: { 
    msg: Message, isMe: boolean, secretKey?: CryptoKey, onPreview: any, 
    onContextMenu: (e: React.MouseEvent | React.TouchEvent, msg: Message, decryptedContent: string, coords?: {x: number, y: number}) => void,
    onSwipeReply: (msg: Message, content: string) => void,
    isSelectionMode: boolean, isSelected: boolean, onSelect: (id: number) => void
}) => {
    const touchStart = useRef<{x: number, y: number} | null>(null);
    const touchCurrent = useRef<number>(0);
    const longPressTimer = useRef<any>(null);
    const itemRef = useRef<HTMLDivElement>(null);
    const isLongPressTriggered = useRef(false);
    const [decryptedContent, setDecryptedContent] = useState('');
    const [offsetX, setOffsetX] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (isSelectionMode) return;
        const touch = e.touches[0];
        const startX = touch.clientX;
        const startY = touch.clientY;

        touchStart.current = { x: startX, y: startY };
        touchCurrent.current = startX;
        isLongPressTriggered.current = false;

        longPressTimer.current = setTimeout(() => {
            isLongPressTriggered.current = true;
            // Pass the captured coordinates to ensure context menu opens exactly where user pressed
            onContextMenu(e, msg, decryptedContent, { x: startX, y: startY });
            setOffsetX(0);
        }, 500);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (isSelectionMode || !touchStart.current) return;
        
        const touch = e.touches[0];
        const diffX = Math.abs(touch.clientX - touchStart.current.x);
        const diffY = Math.abs(touch.clientY - touchStart.current.y);

        // Cancel long press if moved significantly
        if (diffX > 10 || diffY > 10) {
            clearTimeout(longPressTimer.current);
        }

        // Swipe Logic (Horizontal only)
        if (diffY < 10) {
            touchCurrent.current = touch.clientX;
            const swipeDiff = touch.clientX - touchStart.current.x;
            if (swipeDiff > 0 && swipeDiff < 100) setOffsetX(swipeDiff);
        }
    };

    const handleTouchEnd = () => {
        clearTimeout(longPressTimer.current);
        touchStart.current = null;
        
        if (isLongPressTriggered.current) {
            isLongPressTriggered.current = false;
            return;
        }
        if (offsetX > 60) onSwipeReply(msg, decryptedContent);
        setOffsetX(0);
    };

    const handleRightClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onContextMenu(e, msg, decryptedContent);
    };

    const handleItemClick = () => {
        if (isSelectionMode) onSelect(msg.id);
    };

    return (
        <div 
            className={`flex w-full mb-3 group select-none ${isMe ? 'justify-end' : 'justify-start'} ${isSelectionMode ? 'cursor-pointer' : ''}`}
            onClick={handleItemClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={handleRightClick}
        >
            {isSelectionMode && (
                <div className={`mr-2 self-center ${isMe ? 'order-first' : ''}`}>
                    {isSelected 
                        ? <CheckSquare className="text-primary-600" size={20} /> 
                        : <Square className="text-gray-300" size={20} />}
                </div>
            )}
            
            <div 
                ref={itemRef}
                className="relative transition-transform duration-100 ease-out"
                style={{ transform: `translateX(${offsetX}px)` }}
            >
                 {offsetX > 30 && (
                    <div className="absolute left-[-40px] top-1/2 -translate-y-1/2 text-primary-500 opacity-80">
                        <CornerUpLeft size={20} />
                    </div>
                )}

                <div className={`p-3 rounded-2xl shadow-sm text-sm break-words max-w-[85vw] md:max-w-[300px] lg:max-w-[400px] msg-bubble
                    ${isMe ? 'bg-primary-600 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none'}
                    ${isSelected ? 'ring-2 ring-primary-400 ring-offset-2' : ''}
                `}>
                    <SmartMessage 
                        msg={msg} 
                        secretKey={secretKey} 
                        isMe={isMe} 
                        onPreview={onPreview} 
                        onLoadDecrypted={setDecryptedContent}
                    />
                    <div className={`text-[10px] mt-1 text-right opacity-70 flex items-center justify-end gap-1 font-mono ${isMe ? 'text-primary-100' : 'text-gray-400'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}
                        {isMe && <CheckCheck size={12} />}
                    </div>
                </div>
            </div>
        </div>
    );
});

// --- Media Lightbox Component ---
const MediaLightbox = ({ url, type, name, onClose }: { url: string, type: 'image' | 'video', name: string, onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[100] bg-black flex flex-col animate-in fade-in duration-200 font-sans">
            <div className="h-14 flex items-center justify-between px-4 bg-black/50 backdrop-blur-sm absolute top-0 left-0 right-0 z-10">
                <span className="text-white font-medium truncate">{name}</span>
                <button onClick={onClose} className="p-2 text-white/80 hover:text-white rounded-full hover:bg-white/10">
                    <X size={24} />
                </button>
            </div>
            <div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
                {type === 'image' ? (
                    <img src={url} className="max-w-full max-h-full object-contain" alt={name} />
                ) : (
                    <video src={url} controls autoPlay className="max-w-full max-h-full" />
                )}
            </div>
            <div className="h-14 bg-black/50 backdrop-blur-sm absolute bottom-0 left-0 right-0 flex items-center justify-center gap-4">
                 <a href={url} download={name} className="flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full text-white text-sm hover:bg-white/20 transition">
                    <Download size={16} /> Save
                 </a>
            </div>
        </div>
    );
};

// --- Main App ---

const App = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeContact, setActiveContact] = useState<Contact | null>(null);
  
  // FIX: Contact Cache TTL (1 hour)
  const [contacts, setContacts] = useState<Contact[]>(() => {
      try {
          const saved = localStorage.getItem('mrv_contacts_cache');
          if (!saved) return [];
          const cache = JSON.parse(saved);
          // Check if cache is older than 1 hour (3600 * 1000 ms)
          if (cache.__ts && Date.now() - cache.__ts < 3600000) {
              return cache.data || [];
          }
          localStorage.removeItem('mrv_contacts_cache');
          return [];
      } catch { return []; }
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [myKeyPair, setMyKeyPair] = useState<CryptoKeyPair | null>(null);
  const [sharedKeys, setSharedKeys] = useState<Record<number, CryptoKey>>({}); 
  const [searchUsername, setSearchUsername] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [previewFile, setPreviewFile] = useState<{file: File, type: 'image' | 'video' | 'audio', url: string} | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list');
  const [mainView, setMainView] = useState<'chat' | 'profile'>('chat');
  const [viewingMedia, setViewingMedia] = useState<{url: string, type: 'image'|'video', name: string} | null>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);

  // Advanced Interaction States
  const [contextMenu, setContextMenu] = useState<{x: number, y: number, msg: Message, content: string} | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<{msg: Message, content: string} | null>(null);
  const [showForwardModal, setShowForwardModal] = useState(false);
  const [forwardContent, setForwardContent] = useState<string | null>(null);
  const [showMainMenu, setShowMainMenu] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Close main menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (showMainMenu) setShowMainMenu(false);
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [showMainMenu]);

  // Refs
  const activeContactIdRef = useRef<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- WebRTC Hook ---
  const {
    callState, callType, callId, localStream, remoteStream, remoteVideoActive,
    isMuted, isCameraOff, isSpeakerOn, securityCode, callDuration,
    incomingCall, startCall, answerIncomingCall, rejectCall, endCall,
    toggleMute, toggleCamera, switchCamera, toggleSpeaker, error: callError
  } = useWebRTC(currentUser?.id) as any;

  // --- Back Button Handling ---
  useEffect(() => {
    window.history.pushState({ mrv: 'app' }, '');

    const handlePopState = () => {
      const confirmExit = window.confirm("Are you sure you want to leave Mr.V?");
      if (!confirmExit) {
        // Stay in app
        window.history.pushState({ mrv: 'app' }, '');
      } else {
        // Let browser go back (which essentially exits if previous state was external)
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Sync Ref with State
  useEffect(() => {
      activeContactIdRef.current = activeContact ? Number(activeContact.id) : null;
      setTimeout(() => scrollToBottom(), 100);
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
      setReplyingTo(null);
  }, [activeContact]);

  useEffect(() => {
    if (contacts.length > 0) {
        localStorage.setItem('mrv_contacts_cache', JSON.stringify({
            data: contacts,
            __ts: Date.now()
        }));
    }
  }, [contacts]);

  // Crypto Init
  useEffect(() => {
    const initCrypto = async () => {
        try {
            const savedPriv = localStorage.getItem('device_priv_key');
            const savedPub = localStorage.getItem('device_pub_key');
            if (savedPriv && savedPub) {
                setMyKeyPair({ privateKey: await cryptoUtils.importPrivateKey(savedPriv), publicKey: await cryptoUtils.importKey(savedPub) });
            } else {
                const kp = await cryptoUtils.generateKeyPair();
                setMyKeyPair(kp);
                localStorage.setItem('device_priv_key', await cryptoUtils.exportPrivateKey(kp.privateKey));
                localStorage.setItem('device_pub_key', await cryptoUtils.exportKey(kp.publicKey));
            }
        } catch (e) {}
    };
    initCrypto();
  }, []);

  useEffect(() => {
      if (currentUser && myKeyPair) {
          cryptoUtils.exportKey(myKeyPair.publicKey).then(k => api.updatePublicKey(currentUser.id, k));
      }
  }, [currentUser, myKeyPair]);

  useEffect(() => {
    if (!myKeyPair || !activeContact?.public_key) return;
    cryptoUtils.importKey(activeContact.public_key)
        .then(pub => cryptoUtils.deriveSecretKey(myKeyPair.privateKey, pub))
        .then(sec => setSharedKeys(p => ({ ...p, [Number(activeContact.id)]: sec })));
  }, [activeContact, myKeyPair]);

  useEffect(() => {
    const savedUser = localStorage.getItem(LS_KEYS.USER_DATA);
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  const handleContactSelect = (contact: Contact) => {
      setMessages([]); 
      setInputMessage('');
      setActiveContact(contact);
      setMobileView('chat');
      activeContactIdRef.current = Number(contact.id);
  };

  // Contacts Polling
  useEffect(() => {
      if (!currentUser) return;
      const fetchStatus = async () => {
          try {
              const resContacts = await api.getContacts(currentUser.id);
              const contactList = Array.isArray(resContacts) ? resContacts : (resContacts?.contacts || resContacts?.data || []);
              if (Array.isArray(contactList) && contactList.length > 0) {
                  setContacts(contactList);
                  if (activeContactIdRef.current) {
                      const updatedActive = contactList.find(c => Number(c.id) === activeContactIdRef.current);
                      if (updatedActive) {
                          setActiveContact(prev => prev ? ({...prev, is_online: updatedActive.is_online}) : null);
                      }
                  }
              }
          } catch(e) {}
      };
      fetchStatus();
      const interval = setInterval(fetchStatus, 20000); 
      return () => clearInterval(interval);
  }, [currentUser]);

  // Messages Polling
  useEffect(() => {
    let timeoutId: any;
    const pollFn = async () => {
      if (!currentUser) return;
      try {
        if (activeContactIdRef.current) {
            const targetId = activeContactIdRef.current;
            const resMsgs = await api.getMessages(currentUser.id, targetId);
            if (activeContactIdRef.current === targetId) {
                const msgList = Array.isArray(resMsgs) ? resMsgs : (resMsgs?.messages || []);
                if (Array.isArray(msgList)) {
                    setMessages(prev => {
                        if (JSON.stringify(prev) !== JSON.stringify(msgList)) return msgList;
                        return prev;
                    });
                }
            }
        }
      } catch (e) {}
      timeoutId = setTimeout(pollFn, 2000);
    };
    pollFn();
    return () => clearTimeout(timeoutId);
  }, [currentUser]);

  const scrollToBottom = () => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      setShowScrollBottom(false);
  };

  const handleScroll = () => {
      if (messagesContainerRef.current) {
          const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
          setShowScrollBottom(scrollHeight - scrollTop - clientHeight > 150);
      }
  };

  useEffect(() => {
    if (messagesContainerRef.current) {
        const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
        const isNearBottom = scrollHeight - scrollTop - clientHeight < 200;
        const lastMsg = messages[messages.length - 1];
        const isMe = lastMsg?.sender_id === currentUser?.id;
        if (isNearBottom || isMe || messages.length < 10) scrollToBottom();
    }
  }, [messages, previewFile]);

  const handleSearchUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchUsername.trim()) return;
    setIsSearching(true);
    try {
        const res = await api.searchUser(searchUsername);
        if (res.success && res.user) {
            if (currentUser && res.user.id === currentUser.id) alert("That's you!");
            else {
                const newContact = { ...res.user, last_message: '' }; 
                handleContactSelect(newContact); 
                setContacts(prev => [newContact, ...prev.filter(c => c.id !== newContact.id)]);
                setSearchUsername('');
            }
        } else alert('User not found.');
    } catch (err) { alert("Search failed."); } 
    finally { setIsSearching(false); }
  };

  const handleResetKeys = async () => {
      if (window.confirm("Are you sure? This will delete your current encryption keys.")) {
          localStorage.removeItem('device_priv_key');
          localStorage.removeItem('device_pub_key');
          window.location.reload();
      }
  };

  const handleUpdateProfile = async (data: Partial<User>) => {
      if (!currentUser) return;
      try {
          const res = await api.updateProfile(currentUser.id, data);
          if (res.success) {
              const updatedUser = { ...currentUser, ...data };
              setCurrentUser(updatedUser);
              localStorage.setItem(LS_KEYS.USER_DATA, JSON.stringify(updatedUser));
          } else {
              alert('Failed to update profile: ' + res.message);
          }
      } catch (e) {
          alert('Error updating profile');
      }
  };

  const handleSendMessage = async () => {
    if ((!inputMessage.trim() && !previewFile) || !currentUser || !activeContact) return;
    if (activeContactIdRef.current !== Number(activeContact.id)) return;

    // FIX: Double-Send Guard
    if ((handleSendMessage as any).__sending) return;
    (handleSendMessage as any).__sending = true;
    setTimeout(() => { (handleSendMessage as any).__sending = false; }, 2000);

    let finalMessage = inputMessage;
    if (replyingTo) {
        finalMessage = `> [Reply] ${replyingTo.content.substring(0, 50)}...\n\n${inputMessage}`;
        setReplyingTo(null);
    }

    let attachmentUrl = '';
    let type: MessageType = 'text';
    let fileKeys: {key: string, iv: string} | null = null;

    if (previewFile) {
        type = previewFile.type;
        setIsUploading(true);
        try {
            const { encryptedBlob, key, iv } = await cryptoUtils.encryptFile(previewFile.file);
            fileKeys = { key, iv }; 
            const encryptedFile = new File([encryptedBlob], "enc.bin", { type: "application/octet-stream" });
            const uploadRes = await api.uploadFile(encryptedFile, (p) => setUploadProgress(p));
            if (uploadRes.success) {
                attachmentUrl = uploadRes.url;
                if (!finalMessage) finalMessage = type === 'audio' ? 'Voice Message' : 'File';
            } else { 
                alert('Upload Failed'); 
                setIsUploading(false); 
                (handleSendMessage as any).__sending = false;
                return; 
            }
        } catch (err) { 
            setIsUploading(false); 
            (handleSendMessage as any).__sending = false;
            return; 
        }
        setIsUploading(false);
    }

    let payload = finalMessage;
    if (fileKeys) payload += `||FILE_SEC||${JSON.stringify(fileKeys)}`;

    let cipherText = payload;
    const secretKey = sharedKeys[Number(activeContact.id)];
    if (secretKey) cipherText = await cryptoUtils.encrypt(payload, secretKey);

    const tempMsg: Message = {
        id: Date.now(),
        sender_id: currentUser.id,
        receiver_id: activeContact.id,
        message: cipherText,
        created_at: new Date().toISOString(),
        type,
        attachment_url: attachmentUrl
    };

    setMessages(prev => [...prev, tempMsg]);
    setInputMessage('');
    
    // FIX: Clean up preview file properly (revoke URL)
    setPreviewFile(prev => {
        if (prev?.url) URL.revokeObjectURL(prev.url);
        return null;
    });
    
    scrollToBottom(); 

    try {
        await api.sendMessage(currentUser.id, activeContact.id, cipherText, type, attachmentUrl);
        setContacts(prev => {
            const newList = prev.filter(c => c.id !== activeContact.id);
            newList.unshift({ ...activeContact, last_message: finalMessage, last_message_time: new Date().toISOString() });
            return newList;
        });
    } catch (e) {}
  };

  const handleForwardMessage = async (contactId: number) => {
      if (!currentUser || !forwardContent) return;
      setShowForwardModal(false);
      const targetContact = contacts.find(c => c.id === contactId);
      if (!targetContact) return;

      let cipherText = forwardContent;
      const secretKey = sharedKeys[contactId];
      if (secretKey) cipherText = await cryptoUtils.encrypt(forwardContent, secretKey);

      await api.sendMessage(currentUser.id, contactId, cipherText, 'text');
      alert('Forwarded!');
      setForwardContent(null);
  };

  const handleBulkDelete = async () => {
      if (!confirm(`Delete ${selectedMessageIds.size} messages? This cannot be undone.`)) return;
      const ids = Array.from(selectedMessageIds);
      setMessages(prev => prev.filter(m => !selectedMessageIds.has(m.id)));
      setIsSelectionMode(false);
      setSelectedMessageIds(new Set());
      for (const id of ids) { await api.deleteMessage(id); }
  };

  const handleMediaPreview = useCallback((url: string, type: MessageType, name: string) => {
      setViewingMedia({ url, type: type as 'image'|'video', name });
  }, []);

  const handleOpenContextMenu = useCallback((e: React.MouseEvent | React.TouchEvent, msg: Message, content: string, coords?: {x: number, y: number}) => {
      e.preventDefault();
      let clientX, clientY;
      
      if (coords) {
          clientX = coords.x;
          clientY = coords.y;
      } else if ('touches' in e) {
          clientX = e.touches[0].clientX;
          clientY = e.touches[0].clientY;
      } else {
          clientX = (e as React.MouseEvent).clientX;
          clientY = (e as React.MouseEvent).clientY;
      }
      setContextMenu({ x: clientX, y: clientY, msg, content });
  }, []);

  // === CALL HANDLERS ===
  const callerDetails = useMemo(() => {
    if (incomingCall) {
        const name = (incomingCall as any).caller_name || 'Unknown';
        const avatar = (incomingCall as any).caller_avatar || `https://ui-avatars.com/api/?name=${name}&background=random`;
        return { name, avatar };
    }
    if (activeContact) {
        const name = activeContact.name || activeContact.username;
        const avatar = activeContact.avatar || `https://ui-avatars.com/api/?name=${name}&background=random`;
        return { name, avatar };
    }
    return { name: 'Unknown', avatar: 'https://ui-avatars.com/api/?name=Unknown&background=random' };
  }, [incomingCall, activeContact]);

  const handleStartCall = (type: 'audio' | 'video') => {
      if (currentUser && activeContact) {
        (startCall as any)(Number(currentUser.id), Number(activeContact.id), type);
      }
  };

  if (!currentUser) return <Auth onLogin={(u) => { localStorage.setItem(LS_KEYS.USER_DATA, JSON.stringify(u)); setCurrentUser(u); }} />;

  // Map hook states to UI props
  const isIncoming = !!incomingCall;
  const showCallModal = isIncoming || (callState !== CALL_STATES.IDLE && callState !== CALL_STATES.ENDED);
  
  return (
    <div className="fixed inset-0 h-[100dvh] flex flex-col bg-gray-100 overflow-hidden select-none font-sans">
      {viewingMedia && <MediaLightbox url={viewingMedia.url} type={viewingMedia.type} name={viewingMedia.name} onClose={() => setViewingMedia(null)} />}

      {/* CALL MODAL */}
      {showCallModal && (
        <CallModal 
            callId={callId ? Number(callId as any) : (incomingCall ? Number((incomingCall as any).id) : 0)}
            isIncoming={isIncoming} 
            callerName={callerDetails.name} 
            avatar={callerDetails.avatar} 
            type={callType as 'video' | 'audio'} 
            status={callState as string} 
            duration={callDuration as number}
            localStream={localStream as MediaStream | null} 
            remoteStream={remoteStream as MediaStream | null} 
            securityCode={securityCode as string | null} 
            remoteVideoEnabled={remoteVideoActive as boolean}
            error={callError as string | null}
            onAccept={() => (answerIncomingCall as any)()} 
            onReject={() => (rejectCall as any)()}
            onSwitchCamera={switchCamera as any}
            onToggleSpeaker={toggleSpeaker as any}
        />
      )}

      {showForwardModal && <ForwardModal contacts={contacts} onClose={() => setShowForwardModal(false)} onForward={handleForwardMessage} />}

      {contextMenu && (
          <ContextMenu 
            x={contextMenu.x} 
            y={contextMenu.y} 
            onClose={() => setContextMenu(null)}
            options={[
                { label: 'Reply', icon: <CornerUpLeft size={16} />, action: () => { setReplyingTo({msg: contextMenu.msg, content: contextMenu.content}); } },
                { label: 'Copy', icon: <Copy size={16} />, action: () => { navigator.clipboard.writeText(contextMenu.content); } },
                { label: 'Forward', icon: <ArrowRight size={16} />, action: () => { setForwardContent(contextMenu.content); setShowForwardModal(true); } },
                ...(contextMenu.msg.sender_id === currentUser.id ? [
                    { label: 'Delete', icon: <Trash2 size={16} />, color: 'text-red-600', action: () => { if(confirm('Delete message?')) { api.deleteMessage(contextMenu.msg.id); setMessages(m => m.filter(msg => msg.id !== contextMenu.msg.id)); } } }
                ] : []),
                { label: 'Select', icon: <CheckSquare size={16} />, action: () => { setIsSelectionMode(true); setSelectedMessageIds(new Set([contextMenu.msg.id])); } }
            ]}
          />
      )}

      {/* MAIN LAYOUT */}
      <div className="flex flex-1 h-full overflow-hidden relative">
        {/* SIDEBAR */}
        <div className={`${mobileView === 'chat' ? 'hidden md:flex' : 'flex'} w-full md:w-[350px] lg:w-[400px] flex-col bg-[var(--color-surface)] border-r h-full z-20`}>
            {mainView === 'profile' ? (
                <ProfileView 
                    currentUser={currentUser} 
                    onUpdateProfile={handleUpdateProfile} 
                    onNavigate={(view) => {
                        if (view === 'settings') setShowSettings(true);
                        else setMainView(view as any);
                    }} 
                />
            ) : mainView === 'contacts' ? (
                <ContactsView 
                    currentUser={currentUser} 
                    onContactSelect={(contact) => {
                        handleContactSelect(contact);
                        setMainView('chat');
                    }} 
                    onNavigate={(view) => {
                        if (view === 'settings') setShowSettings(true);
                        else setMainView(view as any);
                    }} 
                />
            ) : (
                <>
                    <div className="h-16 px-4 bg-white border-b flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <button 
                                    onClick={() => setShowMainMenu(!showMainMenu)}
                                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"
                                >
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                                </button>
                                
                                {/* Main Menu Dropdown */}
                                {showMainMenu && (
                                    <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 py-2 z-50 animate-in slide-in-from-top-2">
                                        <div className="px-4 py-3 border-b border-gray-100 mb-2 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}`} className="w-10 h-10 rounded-full" />
                                                <div>
                                                    <h3 className="font-bold text-sm text-gray-900">{currentUser.name || currentUser.username}</h3>
                                                    <p className="text-xs text-gray-500">+{currentUser.phone_number}</p>
                                                </div>
                                            </div>
                                            <button className="p-1 text-gray-400 hover:text-gray-600"><ChevronDown size={20} /></button>
                                        </div>
                                        
                                        <button onClick={() => { setMainView('profile'); setShowMainMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <UserIcon size={20} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">My Profile</span>
                                        </button>
                                        <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <Users size={20} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">New Group</span>
                                        </button>
                                        <button onClick={() => { setMainView('contacts'); setShowMainMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <UserIcon size={20} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Contacts</span>
                                        </button>
                                        <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <Phone size={20} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Calls</span>
                                        </button>
                                        <button className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
                                            <span className="text-sm font-medium text-gray-700">Saved Messages</span>
                                        </button>
                                        <button onClick={() => { setShowSettings(true); setShowMainMenu(false); }} className="w-full flex items-center gap-4 px-4 py-3 hover:bg-gray-50 transition text-left">
                                            <Settings size={20} className="text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">Settings</span>
                                        </button>
                                        
                                        <div className="border-t border-gray-100 my-2"></div>
                                        
                                        <div className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition cursor-pointer" onClick={() => setIsDarkMode(!isDarkMode)}>
                                            <div className="flex items-center gap-4">
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
                                                <span className="text-sm font-medium text-gray-700">Night Mode</span>
                                            </div>
                                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${isDarkMode ? 'bg-primary-500' : 'bg-gray-300'}`}>
                                                <div className={`w-4 h-4 bg-white rounded-full shadow-sm transition-transform ${isDarkMode ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <h1 className="text-xl font-semibold text-gray-900">Mr.V</h1>
                        </div>
                        <button className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition"><Search size={20} /></button>
                    </div>
                    <div className="p-3 bg-[var(--color-surface)] border-b sticky top-0 z-10">
                        <form onSubmit={handleSearchUser} className="relative flex items-center gap-2">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                                <input 
                                    value={searchUsername} 
                                    onChange={(e) => setSearchUsername(e.target.value)} 
                                    placeholder="Add user by username..." 
                                    className="w-full bg-slate-100 text-sm py-2 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" 
                                />
                            </div>
                            <button 
                                type="submit" 
                                disabled={!searchUsername.trim() || isSearching}
                                className="p-2 bg-primary-500 text-white rounded-xl hover:bg-primary-600 disabled:bg-gray-200 disabled:text-gray-400 transition-colors shrink-0"
                                title="Add Contact"
                            >
                                {isSearching ? <Loader2 size={20} className="animate-spin" /> : <UserPlus size={20} />}
                            </button>
                        </form>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {contacts.length === 0 && <div className="p-6 text-center text-gray-400 text-sm">No chats yet.</div>}
                        {contacts.map(c => (
                            <div key={c.id} onClick={() => handleContactSelect(c)} className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50 ${activeContact?.id === c.id ? 'bg-primary-50' : ''}`}>
                                <div className="relative"><img src={c.avatar || `https://ui-avatars.com/api/?name=${c.name || c.username}`} className="w-12 h-12 rounded-full" />{c.is_online && <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>}</div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-baseline mb-1"><h3 className="font-semibold text-gray-900 truncate">{c.name || c.username}</h3><span className="text-[10px] font-mono text-gray-400">{c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : ''}</span></div>
                                    <p className="text-sm text-gray-500 truncate" dir="auto">{c.last_message || <span className="italic text-gray-300">Tap to chat</span>}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {/* Bottom Navigation */}
                    <div className="bg-white border-t flex justify-around items-center py-2 pb-safe shrink-0">
                        <button onClick={() => setMainView('chat')} className="flex flex-col items-center p-2 text-primary-600 transition">
                            <div className="relative">
                                <MessageCircle size={24} />
                                <span className="absolute -top-1 -right-2 bg-primary-500 text-white text-[10px] font-bold px-1.5 rounded-full">13</span>
                            </div>
                            <span className="text-[10px] mt-1 font-medium">Chats</span>
                        </button>
                        <button onClick={() => setMainView('contacts')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
                            <Users size={24} />
                            <span className="text-[10px] mt-1 font-medium">Contacts</span>
                        </button>
                        <button onClick={() => setShowSettings(true)} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
                            <Settings size={24} />
                            <span className="text-[10px] mt-1 font-medium">Settings</span>
                        </button>
                        <button onClick={() => setMainView('profile')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
                            <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-300">
                                <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} alt="Profile" className="w-full h-full object-cover" />
                            </div>
                            <span className="text-[10px] mt-1 font-medium">Profile</span>
                        </button>
                    </div>
                </>
            )}
        </div>

        {/* CHAT AREA */}
        <div id="mrv-chat-col" className={`${mobileView === 'list' ? 'hidden md:flex' : 'flex'} flex-1 flex-col h-full bg-[var(--color-bg)] relative`}>
            {activeContact ? (
                <>
                    {/* CHAT HEADER */}
                    <div className="h-16 px-4 bg-[var(--color-surface)] border-b flex items-center justify-between shrink-0 shadow-sm z-10">
                        {isSelectionMode ? (
                            <div className="flex items-center gap-4 w-full">
                                <button onClick={() => { setIsSelectionMode(false); setSelectedMessageIds(new Set()); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
                                <span className="font-bold flex-1">{selectedMessageIds.size} Selected</span>
                                <button onClick={() => {
                                    if(selectedMessageIds.size === messages.length) setSelectedMessageIds(new Set());
                                    else setSelectedMessageIds(new Set(messages.map(m => m.id)));
                                }} className="p-2 text-sm font-bold text-primary-600">
                                    {selectedMessageIds.size === messages.length ? 'Deselect All' : 'Select All'}
                                </button>
                                {selectedMessageIds.size > 0 && (
                                    <button onClick={handleBulkDelete} className="p-2 text-red-600 hover:bg-red-50 rounded-full"><Trash2 size={20} /></button>
                                )}
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => { setMobileView('list'); setActiveContact(null); activeContactIdRef.current = null; }} className="md:hidden p-2 -ml-2"><ArrowLeft size={22} /></button>
                                    <img src={activeContact.avatar || `https://ui-avatars.com/api/?name=${activeContact.name || activeContact.username}`} className="w-10 h-10 rounded-full" />
                                    <div>
                                        <h2 className="font-bold text-gray-800">{activeContact.name || activeContact.username}</h2>
                                        <p className={`text-xs font-medium flex items-center gap-1 ${activeContact.is_online ? 'text-green-600' : 'text-gray-400'}`}>
                                            {activeContact.is_online ? 'Online' : 'Offline'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleStartCall('audio')} className="p-2 text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100 transition"><Phone size={20} /></button>
                                    <button onClick={() => handleStartCall('video')} className="p-2 text-primary-600 bg-primary-50 rounded-full hover:bg-primary-100 transition"><Video size={20} /></button>
                                </div>
                            </>
                        )}
                    </div>

                    {/* MESSAGES */}
                    <div 
                        className="flex-1 overflow-y-auto p-4 custom-scrollbar relative"
                        ref={messagesContainerRef}
                        onScroll={handleScroll}
                    >
                        {messages.map(msg => {
                            if (msg.message && msg.message.startsWith('?OTR?|')) return null;
                            return (
                                <MessageItem 
                                    key={msg.id}
                                    msg={msg}
                                    isMe={msg.sender_id === currentUser.id}
                                    secretKey={sharedKeys[msg.sender_id === currentUser.id ? Number(msg.receiver_id) : Number(msg.sender_id)]}
                                    onPreview={handleMediaPreview}
                                    onContextMenu={handleOpenContextMenu}
                                    onSwipeReply={(m, c) => setReplyingTo({msg: m, content: c})}
                                    isSelectionMode={isSelectionMode}
                                    isSelected={selectedMessageIds.has(msg.id)}
                                    onSelect={(id) => {
                                        setSelectedMessageIds(prev => {
                                            const newSet = new Set(prev);
                                            if (newSet.has(id)) newSet.delete(id);
                                            else newSet.add(id);
                                            return newSet;
                                        });
                                    }}
                                />
                            );
                        })}
                        <div ref={messagesEndRef} id="mrv-msg-end" />
                    </div>

                    {showScrollBottom && (
                        <button 
                            onClick={scrollToBottom}
                            className="absolute bottom-20 right-4 z-30 p-3 bg-white text-primary-600 rounded-full shadow-lg border hover:bg-gray-50 animate-in fade-in zoom-in duration-200"
                        >
                            <ArrowDown size={20} />
                        </button>
                    )}

                    {/* REPLY BANNER */}
                    {replyingTo && (
                        <div className="px-4 py-2 bg-gray-50 border-t flex items-center justify-between border-l-4 border-l-primary-500">
                            <div className="overflow-hidden">
                                <p className="text-xs text-primary-600 font-bold">Replying to {replyingTo.msg.sender_id === currentUser.id ? 'Yourself' : activeContact.username}</p>
                                <p className="text-sm text-gray-500 truncate">{replyingTo.content}</p>
                            </div>
                            <button onClick={() => setReplyingTo(null)} className="p-1"><X size={16} /></button>
                        </div>
                    )}

                    {/* PREVIEW FILE */}
                    {previewFile && (
                        <div className="absolute bottom-20 left-4 right-4 bg-white p-3 rounded-xl border shadow-xl flex items-center gap-3 z-30 animate-in slide-in-from-bottom-2 fade-in">
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                                {isUploading ? <Loader2 className="animate-spin" /> : <Paperclip />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold truncate">{previewFile.file.name}</p>
                                <p className="text-xs text-gray-500">{isUploading ? `Uploading ${Math.round(uploadProgress)}%` : 'Ready to send'}</p>
                            </div>
                            {!isUploading && (
                                <button onClick={() => setPreviewFile(prev => { if (prev?.url) URL.revokeObjectURL(prev.url); return null; })}>
                                    <X size={18} />
                                </button>
                            )}
                        </div>
                    )}

                    {/* INPUT AREA */}
                    <div className="p-3 bg-[var(--color-surface)] border-t flex items-center gap-2 shrink-0">
                        <input type="file" ref={fileInputRef} onChange={(e) => { 
                            if(e.target.files?.[0]) { 
                                const f = e.target.files[0]; 
                                
                                // FIX: Validate file type
                                const type = f.type.startsWith('video') ? 'video' : f.type.startsWith('audio') ? 'audio' : f.type.startsWith('image') ? 'image' : null;
                                if (!type) {
                                    alert("Unsupported file type. Only images, videos, and audio are allowed.");
                                    return;
                                }

                                // FIX: Validate file size (50MB)
                                if (f.size > 52428800) {
                                    alert("File too large. Maximum size is 50MB.");
                                    return;
                                }

                                // FIX: Revoke previous URL to prevent memory leak
                                setPreviewFile(prev => {
                                    if (prev?.url) URL.revokeObjectURL(prev.url);
                                    return {
                                        file: f, 
                                        type: type, 
                                        url: URL.createObjectURL(f)
                                    };
                                }); 
                            } 
                        }} className="hidden" />
                        <button disabled={isUploading} onClick={() => fileInputRef.current?.click()} className="p-3 text-gray-500 hover:bg-gray-100 rounded-full transition"><Paperclip size={20} /></button>
                        
                        {/* VOICE RECORDER */}
                        <MrV_VoiceBtn 
                            disabled={isUploading} 
                            onRecorded={(file) => {
                                setPreviewFile(prev => {
                                    if (prev?.url) URL.revokeObjectURL(prev.url);
                                    return { file, type: 'audio', url: URL.createObjectURL(file) };
                                });
                            }} 
                        />

                        <input value={inputMessage} onChange={(e) => setInputMessage(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !isUploading && handleSendMessage()} placeholder="Type a message..." className="flex-1 bg-gray-100 border-0 rounded-2xl px-4 py-3 outline-none text-sm focus:ring-2 focus:ring-primary-500/20 transition" disabled={isUploading} />
                        <button disabled={isUploading || (!inputMessage && !previewFile)} onClick={handleSendMessage} className="p-3 bg-primary-600 text-white rounded-full hover:bg-primary-700 disabled:opacity-50 transition shadow-lg shadow-primary-600/20"><Send size={18} /></button>
                    </div>
                </>
            ) : (
                <div className="hidden md:flex flex-col items-center justify-center h-full text-gray-400 bg-[var(--color-bg)]">
                    <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center mb-4"><Users size={32} className="text-gray-400" /></div>
                    <p className="text-sm">Select a contact to start chatting.</p>
                </div>
            )}
        </div>
      </div>
      <SettingsModal 
        isOpen={showSettings} 
        onClose={() => setShowSettings(false)} 
        onLogout={() => { 
            // FIX: Wipe ALL security keys and cache on logout
            localStorage.removeItem(LS_KEYS.USER_DATA); 
            localStorage.removeItem(LS_KEYS.LAST_CONTACT); 
            localStorage.removeItem('device_priv_key');
            localStorage.removeItem('device_pub_key');
            localStorage.removeItem('mrv_contacts_cache');
            setCurrentUser(null); 
        }} 
        updateAvailable={false} 
        onCheckUpdate={async () => false} 
        onResetKeys={handleResetKeys} 
      />
    </div>
  );
};
export default App;