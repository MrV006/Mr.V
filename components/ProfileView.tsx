import React, { useState, useRef, useEffect } from 'react';
import { User, Post } from '../types';
import { QrCode, MoreVertical, Camera, Edit3, Settings, MessageCircle, Users, User as UserIcon, PlusCamera, ArrowLeft, Phone, AtSign, Cake, Megaphone, UserPlus, LogOut, Check, ChevronRight, Loader2 } from 'lucide-react';
import { api } from '../services/api';
import { QRCodeSVG } from 'qrcode.react';

const COUNTRIES = [
  { code: 'IR', name: 'Iran', dialCode: '+98', flag: '🇮🇷', format: '### ### ####' },
  { code: 'US', name: 'United States', dialCode: '+1', flag: '🇺🇸', format: '(###) ###-####' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', flag: '🇬🇧', format: '#### ######' },
  { code: 'DE', name: 'Germany', dialCode: '+49', flag: '🇩🇪', format: '#### #######' },
  { code: 'FR', name: 'France', dialCode: '+33', flag: '🇫🇷', format: '# ## ## ## ##' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', flag: '🇦🇪', format: '## ### ####' },
  { code: 'TR', name: 'Turkey', dialCode: '+90', flag: '🇹🇷', format: '### ### ####' },
  { code: 'RU', name: 'Russia', dialCode: '+7', flag: '🇷🇺', format: '### ###-##-##' },
  { code: 'IN', name: 'India', dialCode: '+91', flag: '🇮🇳', format: '##### #####' },
  { code: 'CN', name: 'China', dialCode: '+86', flag: '🇨🇳', format: '### #### ####' },
  { code: 'AU', name: 'Australia', dialCode: '+61', flag: '🇦🇺', format: '# #### ####' },
];

const PersianLion = () => (
  <div className="relative w-full h-full flex items-center justify-center">
    <svg viewBox="0 0 200 200" className="w-full h-full drop-shadow-2xl">
      <defs>
        <linearGradient id="mane" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#d97706" />
          <stop offset="50%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <linearGradient id="face" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
        <linearGradient id="sun" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="100%" stopColor="#eab308" />
        </linearGradient>
      </defs>
      
      {/* Sun */}
      <circle cx="100" cy="90" r="70" fill="url(#sun)" className="animate-pulse" style={{ animationDuration: '4s' }} />
      
      {/* Sun Rays */}
      <g className="animate-spin" style={{ animationDuration: '30s', transformOrigin: '100px 90px' }}>
        {[...Array(12)].map((_, i) => (
          <polygon key={i} points="95,10 105,10 100,0" fill="#fde047" transform={`rotate(${i * 30} 100 90)`} />
        ))}
      </g>

      {/* Mane */}
      <path d="M100 30 C40 30 20 80 30 130 C35 160 60 190 100 195 C140 190 165 160 170 130 C180 80 160 30 100 30 Z" fill="url(#mane)" className="animate-pulse" style={{ animationDuration: '3s' }} />
      
      {/* Face */}
      <path d="M100 60 C70 60 60 90 60 120 C60 150 80 170 100 175 C120 170 140 150 140 120 C140 90 130 60 100 60 Z" fill="url(#face)" />
      
      {/* Ears */}
      <path d="M65 75 C55 65 45 75 50 85 Z" fill="url(#face)" />
      <path d="M135 75 C145 65 155 75 150 85 Z" fill="url(#face)" />
      
      {/* Eyes */}
      <path d="M75 100 Q85 95 90 100" fill="none" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
      <path d="M125 100 Q115 95 110 100" fill="none" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
      <circle cx="82" cy="105" r="4" fill="#451a03" />
      <circle cx="118" cy="105" r="4" fill="#451a03" />
      
      {/* Nose */}
      <path d="M90 125 L110 125 L100 140 Z" fill="#451a03" />
      <path d="M100 140 L100 150" stroke="#451a03" strokeWidth="3" />
      
      {/* Mouth */}
      <path d="M100 150 Q90 160 80 155" fill="none" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
      <path d="M100 150 Q110 160 120 155" fill="none" stroke="#451a03" strokeWidth="3" strokeLinecap="round" />
      
      {/* Whiskers */}
      <path d="M75 130 L50 125 M75 135 L45 135 M75 140 L50 145" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
      <path d="M125 130 L150 125 M125 135 L155 135 M125 140 L150 145" stroke="#451a03" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
    </svg>
  </div>
);

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (data: Partial<User>) => Promise<void>;
  onNavigate: (view: 'chat' | 'contacts' | 'settings' | 'profile') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateProfile, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'archived'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [changeNumberStep, setChangeNumberStep] = useState<0 | 1 | 2 | 3>(0); // 0: none, 1: info, 2: confirm, 3: input
  const [newPhoneNumber, setNewPhoneNumber] = useState('');
  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [showCountrySelect, setShowCountrySelect] = useState(false);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [newUsername, setNewUsername] = useState(currentUser.username);
  const [showBirthdayPicker, setShowBirthdayPicker] = useState(false);
  const [showQrCode, setShowQrCode] = useState(false);
  const [qrTheme, setQrTheme] = useState('bg-gradient-to-br from-green-400 to-green-600');
  
  const [firstName, setFirstName] = useState(() => {
    const parts = (currentUser.name || '').split(' ');
    return parts[0] || '';
  });
  const [lastName, setLastName] = useState(() => {
    const parts = (currentUser.name || '').split(' ');
    return parts.slice(1).join(' ') || '';
  });

  const [editData, setEditData] = useState({
    name: currentUser.name || '',
    phone_number: currentUser.phone_number || '',
    bio: currentUser.bio || '',
    birthday: currentUser.birthday || ''
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const postInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isUploadingPost, setIsUploadingPost] = useState(false);
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const res = await api.getPosts(currentUser.id);
        if (Array.isArray(res)) {
          setPosts(res);
        }
      } catch (e) {
        console.error("Failed to fetch posts", e);
      }
    };
    fetchPosts();
  }, [currentUser.id]);

  const handleSetPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingPhoto(true);
    try {
      const res = await api.uploadFile(file);
      if (res.success && res.url) {
        await onUpdateProfile({ avatar: res.url });
      } else {
        alert('Failed to upload photo');
      }
    } catch (err) {
      alert('Error uploading photo');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleAddPost = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploadingPost(true);
    try {
      const res = await api.uploadFile(file);
      if (res.success && res.url) {
        const mediaType = file.type.startsWith('video') ? 'video' : 'image';
        const postRes = await api.addPost(currentUser.id, res.url, mediaType);
        if (postRes.success && postRes.post) {
          setPosts(prev => [postRes.post, ...prev]);
        } else {
          alert('Failed to save post to database');
        }
      } else {
        alert('Failed to upload post file');
      }
    } catch (err) {
      alert('Error uploading post');
    } finally {
      setIsUploadingPost(false);
    }
  };

  const handleSave = async () => {
    const fullName = `${firstName} ${lastName}`.trim();
    await onUpdateProfile({ ...editData, name: fullName });
    setIsEditing(false);
  };

  const handleSaveUsername = async () => {
    await onUpdateProfile({ ...editData, username: newUsername });
    setIsEditingUsername(false);
  };

  const QR_THEMES = [
    { id: 'green', class: 'bg-gradient-to-br from-green-400 to-green-600', icon: '🌲' },
    { id: 'yellow', class: 'bg-gradient-to-br from-yellow-300 to-yellow-500', icon: '🐥' },
    { id: 'blue', class: 'bg-gradient-to-br from-blue-400 to-blue-600', icon: '❄️' },
    { id: 'purple', class: 'bg-gradient-to-br from-purple-400 to-purple-600', icon: '🔮' },
  ];

  const handleChangeNumber = async () => {
    const rawNumber = newPhoneNumber.replace(/\D/g, '');
    if (rawNumber) {
      const fullNumber = `${selectedCountry.dialCode} ${newPhoneNumber}`;
      await onUpdateProfile({ ...editData, phone_number: fullNumber });
      setEditData({ ...editData, phone_number: fullNumber });
      setChangeNumberStep(0);
      setNewPhoneNumber('');
    }
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    const limitedValue = rawValue.slice(0, 15);
    
    let formattedValue = '';
    if (selectedCountry.format) {
      let formatIndex = 0;
      let rawIndex = 0;
      while (formatIndex < selectedCountry.format.length && rawIndex < limitedValue.length) {
        if (selectedCountry.format[formatIndex] === '#') {
          formattedValue += limitedValue[rawIndex];
          rawIndex++;
        } else {
          formattedValue += selectedCountry.format[formatIndex];
        }
        formatIndex++;
      }
    } else {
      formattedValue = limitedValue.replace(/(\d{3})(?=\d)/g, '$1 ').trim();
    }
    
    setNewPhoneNumber(formattedValue);
  };

  if (showQrCode) {
    return (
      <div className={`flex flex-col h-full ${qrTheme} text-white font-sans overflow-hidden transition-colors duration-500`}>
        {/* Header */}
        <div className="flex items-center p-4 shrink-0">
          <button onClick={() => setShowQrCode(false)} className="text-white hover:bg-white/10 rounded-full p-2 transition">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-2xl relative flex flex-col items-center">
            <div className="absolute -top-10 w-20 h-20 rounded-full overflow-hidden border-4 border-white shadow-lg">
              <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            <div className="mt-8 mb-6 w-48 h-48 bg-white rounded-xl flex items-center justify-center p-2">
              <QRCodeSVG 
                value={`https://mr-v.ir/${currentUser.username}`} 
                size={180} 
                level="H"
                includeMargin={false}
              />
            </div>
            
            <h2 className={`text-2xl font-bold bg-clip-text text-transparent ${qrTheme}`}>@{currentUser.username}</h2>
            <p className="text-sm text-gray-500 font-medium mt-1">mr-v.ir/{currentUser.username}</p>
          </div>
        </div>

        {/* Bottom Sheet for Themes */}
        <div className="bg-white rounded-t-3xl p-6 shrink-0 text-gray-900">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">QR Code</h3>
            <button className="text-gray-400 hover:text-gray-600">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
            </button>
          </div>
          
          <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
            {QR_THEMES.map(theme => (
              <button 
                key={theme.id}
                onClick={() => setQrTheme(theme.class)}
                className={`w-20 h-24 shrink-0 rounded-2xl ${theme.class} flex items-center justify-center text-3xl border-4 transition-all ${qrTheme === theme.class ? 'border-primary-500 scale-105' : 'border-transparent opacity-70 hover:opacity-100'}`}
              >
                {theme.icon}
              </button>
            ))}
          </div>

          <button className="w-full bg-primary-500 text-white py-3.5 rounded-2xl font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-500/30 mb-4">
            Share QR Code
          </button>
          
          <button className="w-full flex items-center justify-center gap-2 text-primary-600 font-medium py-2">
            <QrCode size={20} />
            Scan QR Code
          </button>
        </div>
      </div>
    );
  }

  if (isEditingUsername) {
    return (
      <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsEditingUsername(false)} className="text-gray-600 hover:text-gray-900 transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold">Username</h1>
          </div>
          <button onClick={handleSaveUsername} className="text-primary-600 hover:text-primary-700 transition p-1">
            <Check size={24} />
          </button>
        </div>

        <div className="flex-1 p-4">
          <h2 className="text-sm font-semibold text-primary-600 mb-2 px-2">Set username</h2>
          <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 p-4 flex items-center">
            <span className="text-gray-500 text-base mr-1">mr-v.ir/</span>
            <input 
              type="text" 
              value={newUsername}
              onChange={(e) => setNewUsername(e.target.value)}
              className="flex-1 bg-transparent text-base text-gray-900 focus:outline-none"
              autoFocus
            />
          </div>
          <p className="text-sm text-gray-500 mt-4 px-2 leading-relaxed">
            You can choose a username on <strong>Mr.V</strong>. If you do, people will be able to find you by this username and contact you without needing your phone number.
          </p>
          <p className="text-sm text-gray-500 mt-4 px-2 leading-relaxed">
            You can use <strong>a-z</strong>, <strong>0-9</strong> and underscores. Minimum length is <strong>5</strong> characters.
          </p>
        </div>
      </div>
    );
  }

  if (changeNumberStep === 1 || changeNumberStep === 2) {
    return (
      <>
      <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center p-4 shrink-0">
          <button onClick={() => setChangeNumberStep(0)} className="text-gray-600 hover:text-gray-900 transition">
            <ArrowLeft size={24} />
          </button>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-32 h-32 mb-6 relative">
            <PersianLion />
            <div className="absolute -bottom-2 -right-2 bg-primary-500 rounded-xl p-2 shadow-lg text-white">
              <Phone size={24} />
            </div>
          </div>
          
          <h1 className="text-2xl font-semibold mb-4">Change Number</h1>
          <p className="text-gray-500 text-[15px] leading-relaxed mb-12">
            You can change your Telegram number here. Your account and all your cloud data — messages, media, contacts, etc. will be moved to the new number.
          </p>

          <div className="w-full mt-auto space-y-4">
            <button 
              onClick={() => setChangeNumberStep(0)}
              className="text-primary-600 font-medium py-2"
            >
              Keep {currentUser.phone_number}
            </button>
            <button 
              onClick={() => setChangeNumberStep(2)}
              className="w-full bg-primary-500 text-white py-3.5 rounded-2xl font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
            >
              Change Number
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {changeNumberStep === 2 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 backdrop-blur-sm px-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-semibold mb-3 text-gray-900">Change number</h2>
            <p className="text-gray-600 text-[15px] leading-relaxed mb-6">
              Users will see your new number if they have it in their address book or your privacy settings allow them to see it. You can modify this in Settings &gt; Privacy and Security &gt; Phone number.
            </p>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setChangeNumberStep(1)}
                className="px-4 py-2 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition"
              >
                Cancel
              </button>
              <button 
                onClick={() => setChangeNumberStep(3)}
                className="px-4 py-2 text-primary-600 font-medium hover:bg-primary-50 rounded-xl transition"
              >
                Change
              </button>
            </div>
          </div>
        </div>
      )}
    </>
    );
  }

  if (changeNumberStep === 3) {
    return (
      <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 shrink-0">
          <button onClick={() => setChangeNumberStep(1)} className="text-gray-600 hover:text-gray-900 transition">
            <ArrowLeft size={24} />
          </button>
          <button onClick={handleChangeNumber} className="w-10 h-10 rounded-full bg-primary-500 text-white flex items-center justify-center hover:bg-primary-600 transition shadow-md shadow-primary-500/20">
            <Check size={20} />
          </button>
        </div>

        <div className="flex-1 p-6 flex flex-col items-center text-center">
          <h1 className="text-xl font-semibold mb-2">New Number</h1>
          <p className="text-gray-500 text-sm mb-8">
            Your new number will receive a confirmation code via call or SMS.
          </p>

          <div className="w-full max-w-sm space-y-4 text-left">
            <div 
              onClick={() => setShowCountrySelect(true)}
              className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition"
            >
              <div className="flex items-center gap-3">
                <span className="text-xl">{selectedCountry.flag}</span>
                <span className="text-base font-medium">{selectedCountry.name}</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center">
              <span className="text-base font-medium mr-3">{selectedCountry.dialCode}</span>
              <div className="w-px h-6 bg-gray-200 mr-3"></div>
              <input 
                type="tel" 
                value={newPhoneNumber}
                onChange={handlePhoneChange}
                placeholder={selectedCountry.format.replace(/#/g, '0')}
                className="flex-1 bg-transparent text-base font-medium focus:outline-none placeholder-gray-400"
                autoFocus
              />
            </div>
          </div>
        </div>

        {/* Country Selection Modal */}
        {showCountrySelect && (
          <div className="fixed inset-0 z-50 flex flex-col bg-white animate-in slide-in-from-bottom-full duration-300">
            <div className="flex items-center p-4 border-b border-gray-100">
              <button onClick={() => setShowCountrySelect(false)} className="text-gray-600 hover:text-gray-900 transition mr-4">
                <ArrowLeft size={24} />
              </button>
              <h2 className="text-xl font-semibold">Choose Country</h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              {COUNTRIES.map((country) => (
                <div 
                  key={country.code}
                  onClick={() => {
                    setSelectedCountry(country);
                    setShowCountrySelect(false);
                    setNewPhoneNumber('');
                  }}
                  className="flex items-center justify-between p-4 border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{country.flag}</span>
                    <span className="text-base font-medium text-gray-900">{country.name}</span>
                  </div>
                  <span className="text-sm text-gray-500 font-medium">{country.dialCode}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className="flex flex-col h-full bg-gray-50 text-gray-900 font-sans overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-white border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-6">
            <button onClick={() => setIsEditing(false)} className="text-gray-600 hover:text-gray-900 transition">
              <ArrowLeft size={24} />
            </button>
            <h1 className="text-xl font-semibold">Account</h1>
          </div>
          <button onClick={handleSave} className="text-primary-600 hover:text-primary-700 transition p-1">
            <Check size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          
          {/* Your Info Section */}
          <div>
            <h2 className="text-sm font-semibold text-primary-600 mb-2 px-4">Your Info</h2>
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
              <div 
                onClick={() => setChangeNumberStep(1)}
                className="flex items-center gap-4 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition"
              >
                <Phone size={24} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-medium text-gray-900">{editData.phone_number || 'Not set'}</p>
                  <p className="text-sm text-gray-500">Tap to change phone number</p>
                </div>
              </div>
              <div 
                onClick={() => setIsEditingUsername(true)}
                className="flex items-center gap-4 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition"
              >
                <AtSign size={24} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-base font-medium text-gray-900">@{currentUser.username}</p>
                  <p className="text-sm text-gray-500">Username</p>
                </div>
              </div>
              <div 
                onClick={() => setShowBirthdayPicker(true)}
                className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition"
              >
                <Cake size={24} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                  <p className="text-base font-medium text-gray-900">{editData.birthday || 'Not set'}</p>
                  <p className="text-sm text-gray-500">Birthday</p>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 px-4">Choose who can see your birthday in Settings.</p>
          </div>

          {/* Your Name Section */}
          <div>
            <h2 className="text-sm font-semibold text-primary-600 mb-2 px-4">Your name</h2>
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 p-4 space-y-4">
              <div>
                <input 
                  type="text" 
                  value={firstName} 
                  onChange={e => setFirstName(e.target.value)}
                  placeholder="First name (required)"
                  className="w-full bg-transparent text-base text-gray-900 focus:outline-none placeholder-gray-400 border-b border-gray-200 pb-2 focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  placeholder="Last name (optional)"
                  className="w-full bg-transparent text-base text-gray-900 focus:outline-none placeholder-gray-400 border-b border-gray-200 pb-2 focus:border-primary-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Your Bio Section */}
          <div>
            <h2 className="text-sm font-semibold text-primary-600 mb-2 px-4">Your bio</h2>
            <div className="bg-white rounded-3xl overflow-hidden border border-gray-200 p-4">
              <div className="flex items-start gap-2 border-b border-gray-200 pb-2 focus-within:border-primary-500 transition-colors">
                <textarea 
                  value={editData.bio} 
                  onChange={e => setEditData({...editData, bio: e.target.value})}
                  placeholder="A few words about you"
                  className="w-full bg-transparent text-base text-gray-900 focus:outline-none placeholder-gray-400 resize-none h-12"
                  maxLength={70}
                />
                <span className="text-xs text-gray-400 shrink-0 mt-1">{70 - (editData.bio?.length || 0)}</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2 px-4">You can add a few lines about yourself. Choose who can see your bio in Settings.</p>
          </div>

          {/* Other Actions */}
          <div className="space-y-3 pb-8">
            <button className="w-full flex items-center gap-4 bg-white rounded-3xl p-4 border border-gray-200 hover:bg-gray-50 transition text-left">
              <Megaphone size={24} className="text-gray-500 shrink-0" />
              <span className="text-base text-gray-900 font-medium">Add Personal channel</span>
            </button>
            
            <div>
              <div className="bg-white rounded-3xl overflow-hidden border border-gray-200">
                <button className="w-full flex items-center gap-4 p-4 border-b border-gray-100 hover:bg-gray-50 transition text-left">
                  <UserPlus size={24} className="text-gray-500 shrink-0" />
                  <span className="text-base text-gray-900 font-medium">Add Account</span>
                </button>
                <div className="flex items-center justify-between p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-50 transition">
                  <div className="flex items-center gap-3">
                    <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} className="w-8 h-8 rounded-full border border-gray-200" />
                    <span className="text-base text-gray-900 font-medium">{currentUser.name || currentUser.username}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="px-2 py-0.5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold">17</div>
                    <ChevronRight size={20} className="text-gray-400" />
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 px-4">You can add 1 additional account. Subscribe to Premium to use up to 3 accounts.</p>
            </div>

            <button className="w-full flex items-center gap-4 bg-white rounded-3xl p-4 border border-gray-200 hover:bg-gray-50 transition text-left text-red-500 mt-4">
              <LogOut size={24} className="shrink-0" />
              <span className="text-base font-medium">Log Out</span>
            </button>
          </div>

        </div>

        {/* Birthday Picker Modal */}
        {showBirthdayPicker && (
          <div className="fixed inset-0 z-50 flex flex-col justify-end bg-gray-900/40 backdrop-blur-sm">
            <div className="bg-white rounded-t-3xl p-6 animate-in slide-in-from-bottom-full duration-200">
              <h2 className="text-xl font-semibold mb-6 text-gray-900">Birthday</h2>
              
              <div className="flex justify-center mb-8">
                <input 
                  type="date" 
                  value={editData.birthday}
                  onChange={(e) => setEditData({...editData, birthday: e.target.value})}
                  className="text-lg p-2 border-b-2 border-primary-500 focus:outline-none bg-transparent"
                />
              </div>

              <div className="space-y-3">
                <button 
                  onClick={() => setShowBirthdayPicker(false)}
                  className="w-full bg-primary-500 text-white py-3.5 rounded-2xl font-medium hover:bg-primary-600 transition shadow-lg shadow-primary-500/30"
                >
                  Save
                </button>
                <button 
                  onClick={() => {
                    setEditData({...editData, birthday: ''});
                    setShowBirthdayPicker(false);
                  }}
                  className="w-full text-primary-600 py-3.5 rounded-2xl font-medium hover:bg-primary-50 transition"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <button 
          onClick={() => setShowQrCode(true)}
          className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition"
        >
          <QrCode size={24} />
        </button>
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
          <MoreVertical size={24} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-24">
        {/* Profile Info */}
        <div className="flex flex-col items-center px-4">
          <div className="relative mb-4">
            <img 
              src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} 
              alt={currentUser.username} 
              className="w-32 h-32 rounded-full object-cover border-2 border-white shadow-sm"
            />
          </div>
          <h1 className="text-2xl font-bold mb-1">{currentUser.name || currentUser.username}</h1>
          <p className="text-sm text-primary-600 font-medium mb-6">online</p>

          {/* Action Buttons */}
          <div className="flex gap-3 w-full max-w-md mb-6">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={photoInputRef} 
              onChange={handleSetPhoto} 
            />
            <button 
              onClick={() => photoInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl transition border border-gray-100 disabled:opacity-50"
            >
              {isUploadingPhoto ? <Loader2 size={24} className="mb-1 animate-spin" /> : <Camera size={24} className="mb-1" />}
              <span className="text-xs font-medium">Set Photo</span>
            </button>
            <button 
              onClick={() => setIsEditing(true)}
              className="flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition border bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-700"
            >
              <Edit3 size={24} className="mb-1" />
              <span className="text-xs font-medium">Edit Info</span>
            </button>
            <button 
              onClick={() => onNavigate('settings')}
              className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl transition border border-gray-100"
            >
              <Settings size={24} className="mb-1" />
              <span className="text-xs font-medium">Settings</span>
            </button>
          </div>

          {/* Info Card */}
          <div className="w-full max-w-md bg-gray-50 rounded-3xl p-5 mb-6 text-left border border-gray-100">
            <div className="space-y-5">
              <div>
                <p className="text-lg text-gray-900 font-medium">{currentUser.phone_number || 'Not set'}</p>
                <p className="text-sm text-gray-500">Mobile</p>
              </div>
              <div>
                <p className="text-lg text-gray-900">{currentUser.bio || 'Not set'}</p>
                <p className="text-sm text-gray-500">Bio</p>
              </div>
              <div>
                <p className="text-lg text-gray-900">@{currentUser.username}</p>
                <p className="text-sm text-gray-500">Username</p>
              </div>
              <div>
                <p className="text-lg text-gray-900">{editData.birthday || 'Not set'}</p>
                <p className="text-sm text-gray-500">Birthday</p>
              </div>
              <div>
                <p className="text-lg text-gray-900">{String(currentUser.id).padStart(9, '0')}</p>
                <p className="text-sm text-gray-500">User ID</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="w-full max-w-md flex border-b border-gray-200 mb-4">
            <button 
              onClick={() => setActiveTab('posts')}
              className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'posts' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Posts
              {activeTab === 'posts' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-1 bg-primary-500 rounded-t-full" />}
            </button>
            <button 
              onClick={() => setActiveTab('archived')}
              className={`flex-1 py-3 text-sm font-medium transition relative ${activeTab === 'archived' ? 'text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Archived Posts
              {activeTab === 'archived' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-24 h-1 bg-primary-500 rounded-t-full" />}
            </button>
          </div>

          {/* Content Area */}
          <div className="w-full max-w-md py-4">
            {activeTab === 'posts' ? (
              posts.length > 0 ? (
                <div className="grid grid-cols-3 gap-1">
                  {posts.map(post => (
                    <div key={post.id} className="aspect-square bg-gray-100 relative overflow-hidden">
                      {post.media_type === 'video' ? (
                        <video src={post.media_url} className="w-full h-full object-cover" />
                      ) : (
                        <img src={post.media_url} alt="Post" className="w-full h-full object-cover" />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-gray-500 text-sm">Publish photos and videos to display on your profile.</p>
                </div>
              )
            ) : (
              <div className="text-center py-10">
                <p className="text-gray-500 text-sm">No archived posts.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-20 right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 md:ml-[150px]">
        <input 
          type="file" 
          accept="image/*,video/*" 
          className="hidden" 
          ref={postInputRef} 
          onChange={handleAddPost} 
        />
        <button 
          onClick={() => postInputRef.current?.click()}
          disabled={isUploadingPost}
          className="flex items-center gap-2 bg-primary-500 text-white px-4 py-3 rounded-2xl font-medium shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition active:scale-95 disabled:opacity-50"
        >
          {isUploadingPost ? <Loader2 size={20} className="animate-spin" /> : <Camera size={20} />}
          Add a post
        </button>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-white border-t border-gray-100 flex justify-around items-center py-2 pb-safe shrink-0">
        <button onClick={() => onNavigate('chat')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
          <div className="relative">
            <MessageCircle size={24} />
            <span className="absolute -top-1 -right-2 bg-primary-500 text-white text-[10px] font-bold px-1.5 rounded-full">13</span>
          </div>
          <span className="text-[10px] mt-1 font-medium">Chats</span>
        </button>
        <button onClick={() => onNavigate('contacts')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
          <Users size={24} />
          <span className="text-[10px] mt-1 font-medium">Contacts</span>
        </button>
        <button onClick={() => onNavigate('settings')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center p-2 text-primary-600 transition">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-primary-500">
            <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
};
