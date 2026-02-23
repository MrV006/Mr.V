import React, { useState } from 'react';
import { X, LogOut, User, Trash2, RefreshCw, CheckCircle2, KeyRound } from 'lucide-react';
import { APP_VERSION, LS_KEYS } from '../constants';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogout: () => void;
  updateAvailable: boolean;
  onCheckUpdate: () => Promise<boolean>;
  onResetKeys?: () => Promise<void>;
  installPrompt?: any; // Kept in interface to avoid breaking App.tsx props, but unused
}

export const SettingsModal: React.FC<Props> = ({ isOpen, onClose, onLogout, updateAvailable, onCheckUpdate, onResetKeys }) => {
  const [checking, setChecking] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  if (!isOpen) return null;

  const handleClearCache = () => {
    if (window.confirm('Clear temporary app data? This will NOT log you out, but will refresh the app to fix display issues.')) {
      localStorage.removeItem(LS_KEYS.LAST_CONTACT);
      localStorage.removeItem(LS_KEYS.THEME);
      window.location.reload();
    }
  };

  const handleManualCheck = async () => {
    if (updateAvailable) {
        window.location.reload();
        return;
    }

    setChecking(true);
    setStatusMsg('');
    await new Promise(resolve => setTimeout(resolve, 800));
    const hasUpdate = await onCheckUpdate();
    setChecking(false);
    
    if (!hasUpdate) {
        setStatusMsg('You are using the latest version.');
        setTimeout(() => setStatusMsg(''), 3000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <h3 className="text-lg font-bold text-gray-800">Settings</h3>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
            <User size={18} />
            <span>Connected to <strong>mr-v.ir</strong></span>
          </div>

          <div className="space-y-2 pt-2">
             <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">App Updates</p>
             <button 
                onClick={handleManualCheck}
                disabled={checking}
                className={`flex items-center justify-center gap-2 w-full py-3 rounded-xl transition font-medium text-sm ${
                    updateAvailable 
                    ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg shadow-green-200' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
             >
                <RefreshCw size={18} className={checking ? 'animate-spin' : ''} />
                {checking ? 'Checking...' : (updateAvailable ? 'Update Now' : 'Check for Updates')}
             </button>
             {statusMsg && (
                 <p className="text-xs text-green-600 text-center flex items-center justify-center gap-1 animate-in fade-in slide-in-from-top-1">
                     <CheckCircle2 size={12} /> {statusMsg}
                 </p>
             )}
          </div>
          
          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Security</p>
            {onResetKeys && (
                <button 
                    onClick={onResetKeys}
                    className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition font-medium text-sm"
                >
                    <KeyRound size={18} />
                    Reset Encryption Keys
                </button>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Data & Storage</p>
            <button 
                onClick={handleClearCache}
                className="flex items-center justify-center gap-2 w-full py-3 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-100 transition font-medium text-sm"
            >
                <Trash2 size={18} />
                Clear App Cache
            </button>
          </div>

          <div className="space-y-2 pt-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider ml-1">Session</p>
            <button 
                onClick={() => {
                    if(window.confirm('Are you sure you want to log out?')) {
                        onLogout();
                        onClose();
                    }
                }}
                className="flex items-center justify-center gap-2 w-full py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition font-medium text-sm"
            >
                <LogOut size={18} />
                Sign Out
            </button>
          </div>
        </div>
        
        <div className="bg-gray-50 px-6 py-3 text-center border-t">
            <p className="text-xs text-gray-400">Mr.V v{APP_VERSION}</p>
        </div>
      </div>
    </div>
  );
};