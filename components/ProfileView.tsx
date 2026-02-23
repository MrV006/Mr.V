import React, { useState } from 'react';
import { User } from '../types';
import { QrCode, MoreVertical, Camera, Edit3, Settings, MessageCircle, Users, User as UserIcon, PlusCamera, ArrowLeft, Phone, AtSign, Cake, Megaphone, UserPlus, LogOut, Check, ChevronRight } from 'lucide-react';

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
  const [editData, setEditData] = useState({
    name: currentUser.name || '',
    phone_number: currentUser.phone_number || '',
    bio: currentUser.bio || '',
    birthday: currentUser.birthday || ''
  });

  const handleSave = async () => {
    await onUpdateProfile(editData);
    setIsEditing(false);
  };

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
            {/* Duck illustration placeholder */}
            <div className="absolute inset-0 bg-yellow-400 rounded-full flex items-center justify-center text-5xl">🦆</div>
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
            <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition">
              <div className="flex items-center gap-3">
                <span className="text-xl">🇮🇷</span>
                <span className="text-base font-medium">Iran</span>
              </div>
              <ChevronRight size={20} className="text-gray-400" />
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-3 flex items-center">
              <span className="text-base font-medium mr-3">+98</span>
              <div className="w-px h-6 bg-gray-200 mr-3"></div>
              <input 
                type="tel" 
                value={newPhoneNumber}
                onChange={(e) => setNewPhoneNumber(e.target.value)}
                placeholder="000 000 0000"
                className="flex-1 bg-transparent text-base font-medium focus:outline-none placeholder-gray-400"
                autoFocus
              />
            </div>
          </div>
        </div>
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
              <div className="flex items-center gap-4 p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition">
                <AtSign size={24} className="text-gray-400 shrink-0" />
                <div>
                  <p className="text-base font-medium text-gray-900">@{currentUser.username}</p>
                  <p className="text-sm text-gray-500">Username</p>
                </div>
              </div>
              <div className="flex items-center gap-4 p-4 cursor-pointer hover:bg-gray-50 transition">
                <Cake size={24} className="text-gray-400 shrink-0" />
                <div className="flex-1">
                  <input 
                    type="text" 
                    value={editData.birthday} 
                    onChange={e => setEditData({...editData, birthday: e.target.value})}
                    placeholder="Dec 24, 2005"
                    className="w-full bg-transparent text-base font-medium text-gray-900 focus:outline-none placeholder-gray-400"
                  />
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
                  value={editData.name} 
                  onChange={e => setEditData({...editData, name: e.target.value})}
                  placeholder="First name (required)"
                  className="w-full bg-transparent text-base text-gray-900 focus:outline-none placeholder-gray-400 border-b border-gray-200 pb-2 focus:border-primary-500 transition-colors"
                />
              </div>
              <div>
                <input 
                  type="text" 
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
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white text-gray-900 font-sans overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 shrink-0">
        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-full transition">
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
            <button className="flex-1 flex flex-col items-center justify-center py-3 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-2xl transition border border-gray-100">
              <Camera size={24} className="mb-1" />
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
                <p className="text-lg text-gray-900">{currentUser.birthday || 'Not set'}</p>
                <p className="text-sm text-gray-500">Birthday</p>
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
          <div className="w-full max-w-md text-center py-10">
            <p className="text-gray-500 text-sm">Publish photos and videos to display on your profile.</p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="absolute bottom-20 right-4 md:right-auto md:left-1/2 md:-translate-x-1/2 md:ml-[150px]">
        <button className="flex items-center gap-2 bg-primary-500 text-white px-4 py-3 rounded-2xl font-medium shadow-lg shadow-primary-500/30 hover:bg-primary-600 transition active:scale-95">
          <Camera size={20} />
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
