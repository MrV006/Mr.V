import React, { useState, useEffect } from 'react';
import { User, Contact } from '../types';
import { Search, Loader2, UserPlus, Phone, MessageCircle, ArrowLeft, Users, Settings } from 'lucide-react';
import { api } from '../services/api';

interface ContactsViewProps {
  currentUser: User;
  onContactSelect: (contact: Contact) => void;
  onNavigate: (view: 'chat' | 'contacts' | 'settings' | 'profile') => void;
}

export const ContactsView: React.FC<ContactsViewProps> = ({ currentUser, onContactSelect, onNavigate }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedContacts, setSyncedContacts] = useState<any[]>([]);
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);
  const [unregisteredContacts, setUnregisteredContacts] = useState<any[]>([]);

  const handleSyncContacts = async () => {
    if (!('contacts' in navigator && 'ContactsManager' in window)) {
      alert('Contact syncing is not supported on this browser/device. Please use a supported mobile browser.');
      return;
    }

    try {
      setIsSyncing(true);
      const props = ['name', 'tel'];
      const opts = { multiple: true };
      const contacts = await (navigator as any).contacts.select(props, opts);
      
      setSyncedContacts(contacts);

      // Extract phone numbers
      const phoneNumbers = contacts.flatMap((c: any) => c.tel || []).map((t: string) => t.replace(/[^0-9+]/g, ''));
      
      if (phoneNumbers.length > 0) {
        // Send to backend to check which ones are registered
        const res = await api.checkContacts(phoneNumbers);
        if (res.success && res.users) {
          setRegisteredUsers(res.users);
          
          // Filter out registered ones from unregistered list
          const registeredPhones = res.users.map((u: User) => u.phone_number);
          const unregistered = contacts.filter((c: any) => {
            const hasRegisteredPhone = (c.tel || []).some((t: string) => registeredPhones.includes(t.replace(/[^0-9+]/g, '')));
            return !hasRegisteredPhone;
          });
          setUnregisteredContacts(unregistered);
        }
      } else {
        setUnregisteredContacts(contacts);
      }
    } catch (err) {
      console.error('Error syncing contacts:', err);
      alert('Failed to sync contacts. Please ensure you granted permission.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white font-sans overflow-hidden">
      {/* Header */}
      <div className="h-16 px-4 bg-slate-50 border-b flex items-center gap-3 shrink-0">
        <button onClick={() => onNavigate('chat')} className="p-2 -ml-2 text-gray-600 hover:bg-gray-200 rounded-full transition">
            <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">Contacts</h1>
      </div>

      {/* Search & Sync */}
      <div className="p-3 border-b sticky top-0 z-10 bg-white">
        <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
            <input 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
                placeholder="Search contacts..." 
                className="w-full bg-slate-100 text-sm py-2 pl-10 pr-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500/20 transition-all" 
            />
        </div>
        <button 
            onClick={handleSyncContacts}
            disabled={isSyncing}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-primary-50 text-primary-600 rounded-xl font-medium hover:bg-primary-100 transition-colors disabled:opacity-50"
        >
            {isSyncing ? <Loader2 size={18} className="animate-spin" /> : <Phone size={18} />}
            Sync Device Contacts
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar pb-20">
        {registeredUsers.length > 0 && (
            <div className="mb-4">
                <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Registered Users
                </div>
                {registeredUsers.map(u => (
                    <div key={u.id} onClick={() => onContactSelect(u as Contact)} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-gray-50 border-b border-gray-50">
                        <img src={u.avatar || `https://ui-avatars.com/api/?name=${u.name || u.username}`} className="w-12 h-12 rounded-full" />
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{u.name || u.username}</h3>
                            <p className="text-sm text-gray-500 truncate">{u.phone_number || `@${u.username}`}</p>
                        </div>
                    </div>
                ))}
            </div>
        )}

        {unregisteredContacts.length > 0 && (
            <div>
                <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Invite to App
                </div>
                {unregisteredContacts.map((c, idx) => (
                    <div key={idx} className="px-4 py-3 flex items-center gap-3 border-b border-gray-50">
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-lg">
                            {(c.name?.[0] || '?')[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-gray-900 truncate">{c.name?.[0] || 'Unknown'}</h3>
                            <p className="text-sm text-gray-500 truncate">{c.tel?.[0] || 'No phone number'}</p>
                        </div>
                        <button className="px-3 py-1.5 bg-primary-500 text-white text-xs font-medium rounded-lg hover:bg-primary-600 transition">
                            Invite
                        </button>
                    </div>
                ))}
            </div>
        )}

        {registeredUsers.length === 0 && unregisteredContacts.length === 0 && (
            <div className="p-8 text-center text-gray-400">
                <UserPlus size={48} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Click "Sync Device Contacts" to find your friends.</p>
            </div>
        )}
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
        <button onClick={() => onNavigate('contacts')} className="flex flex-col items-center p-2 text-primary-600 transition">
          <Users size={24} />
          <span className="text-[10px] mt-1 font-medium">Contacts</span>
        </button>
        <button onClick={() => onNavigate('settings')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
          <Settings size={24} />
          <span className="text-[10px] mt-1 font-medium">Settings</span>
        </button>
        <button onClick={() => onNavigate('profile')} className="flex flex-col items-center p-2 text-gray-400 hover:text-gray-600 transition">
          <div className="w-6 h-6 rounded-full overflow-hidden border border-gray-300">
            <img src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name || currentUser.username}&background=random`} alt="Profile" className="w-full h-full object-cover" />
          </div>
          <span className="text-[10px] mt-1 font-medium">Profile</span>
        </button>
      </div>
    </div>
  );
};
