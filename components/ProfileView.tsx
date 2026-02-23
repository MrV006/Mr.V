import React, { useState } from 'react';
import { User } from '../types';
import { QrCode, MoreVertical, Camera, Edit3, Settings, MessageCircle, Users, User as UserIcon, PlusCamera } from 'lucide-react';

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (data: Partial<User>) => Promise<void>;
  onNavigate: (view: 'chat' | 'contacts' | 'settings' | 'profile') => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser, onUpdateProfile, onNavigate }) => {
  const [activeTab, setActiveTab] = useState<'posts' | 'archived'>('posts');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    phone_number: currentUser.phone_number || '',
    bio: currentUser.bio || '',
    birthday: currentUser.birthday || ''
  });

  const handleSave = async () => {
    await onUpdateProfile(editData);
    setIsEditing(false);
  };

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
              onClick={() => setIsEditing(!isEditing)}
              className={`flex-1 flex flex-col items-center justify-center py-3 rounded-2xl transition border ${isEditing ? 'bg-primary-50 border-primary-100 text-primary-600' : 'bg-gray-50 hover:bg-gray-100 border-gray-100 text-gray-700'}`}
            >
              <Edit3 size={24} className="mb-1" />
              <span className="text-xs font-medium">{isEditing ? 'Cancel' : 'Edit Info'}</span>
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
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-500 ml-1 font-medium">Name</label>
                  <input 
                    type="text" 
                    value={editData.name || ''} 
                    onChange={e => setEditData({...editData, name: e.target.value})}
                    placeholder="Your Name"
                    className="w-full bg-transparent border-b border-gray-300 text-gray-900 pb-1 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 ml-1 font-medium">Mobile</label>
                  <input 
                    type="text" 
                    value={editData.phone_number || ''} 
                    onChange={e => setEditData({...editData, phone_number: e.target.value})}
                    placeholder="+98 990 000 0000"
                    className="w-full bg-transparent border-b border-gray-300 text-gray-900 pb-1 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 ml-1 font-medium">Bio</label>
                  <input 
                    type="text" 
                    value={editData.bio || ''} 
                    onChange={e => setEditData({...editData, bio: e.target.value})}
                    placeholder="A short bio..."
                    className="w-full bg-transparent border-b border-gray-300 text-gray-900 pb-1 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-500 ml-1 font-medium">Birthday</label>
                  <input 
                    type="text" 
                    value={editData.birthday || ''} 
                    onChange={e => setEditData({...editData, birthday: e.target.value})}
                    placeholder="Dec 24, 2005"
                    className="w-full bg-transparent border-b border-gray-300 text-gray-900 pb-1 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <button onClick={handleSave} className="w-full py-2.5 bg-primary-500 text-white rounded-xl font-medium mt-4 hover:bg-primary-600 transition">Save Changes</button>
              </div>
            ) : (
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
            )}
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
