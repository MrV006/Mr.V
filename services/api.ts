import { LS_KEYS, DEFAULT_API_URL } from '../constants';

// Always return the production URL
const getApiUrl = () => DEFAULT_API_URL;

// Helper for Real PHP Calls
const phpFetch = async (action: string, data: any) => {
  const url = getApiUrl();
  
  try {
    const formData = new FormData();
    formData.append('action', action);
    formData.append('data', JSON.stringify(data));

    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status}`);
    }

    const text = await response.text();
    try {
        return JSON.parse(text);
    } catch (e) {
        console.error("Invalid JSON from server:", text);
        return { success: false, message: "Server error", raw: text };
    }
  } catch (error) {
    console.error("Connection Error:", error);
    return { success: false, message: "Could not connect to server. Please check your internet." };
  }
};

/**
 * Production API Client
 * Strictly connects to mr-v.ir
 */
export const api = {
  isMock: () => false,

  login: async (username: string, password?: string) => {
    return phpFetch('login', { username, password });
  },

  register: async (username: string, password?: string) => {
    return phpFetch('register', { username, password });
  },

  // Update User's Public Key on Server
  updatePublicKey: async (userId: number, publicKey: string) => {
    return phpFetch('update_public_key', { user_id: userId, public_key: publicKey });
  },

  updateProfile: async (userId: number, data: Partial<User>) => {
    return phpFetch('update_profile', { user_id: userId, ...data });
  },

  checkContacts: async (phoneNumbers: string[]) => {
    return phpFetch('check_contacts', { phone_numbers: phoneNumbers });
  },

  searchUser: async (username: string) => {
    return phpFetch('search_user', { username });
  },

  getContacts: async (userId: number) => {
    return phpFetch('get_contacts', { user_id: userId });
  },

  getMessages: async (userId: number, contactId: number) => {
    return phpFetch('get_messages', { user_id: userId, contact_id: contactId });
  },

  addPost: async (userId: number, mediaUrl: string, mediaType: string) => {
    return phpFetch('add_post', { user_id: userId, media_url: mediaUrl, media_type: mediaType });
  },

  getPosts: async (userId: number) => {
    return phpFetch('get_posts', { user_id: userId });
  },

  sendMessage: async (senderId: number, receiverId: number, message: string, type: string = 'text', attachmentUrl: string = '') => {
    return phpFetch('send_message', { 
        sender_id: senderId, 
        receiver_id: receiverId, 
        message, 
        type, 
        attachment_url: attachmentUrl 
    });
  },

  uploadFile: (file: File, onProgress?: (percent: number) => void, signal?: AbortSignal): Promise<any> => {
    return new Promise((resolve, reject) => {
        const url = getApiUrl();
        const formData = new FormData();
        formData.append('action', 'upload_file');
        formData.append('file', file);

        const xhr = new XMLHttpRequest();

        if (signal) {
            signal.addEventListener('abort', () => {
                xhr.abort();
                reject(new DOMException('Upload cancelled', 'AbortError'));
            });
        }

        xhr.open('POST', url, true);

        if (xhr.upload && onProgress) {
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    onProgress(percentComplete);
                }
            };
        }

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (e) {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                reject(new Error(`HTTP Error: ${xhr.status}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));
        
        xhr.send(formData);
    });
  },

  editMessage: async (id: number, text: string) => {
    return phpFetch('edit_message', { id, message: text });
  },

  deleteMessage: async (id: number) => {
    return phpFetch('delete_message', { id });
  },

  initiateCall: async (callerId: number, calleeId: number, sdp: string, type: 'video' | 'audio') => {
    return phpFetch('initiate_call', { caller_id: callerId, callee_id: calleeId, sdp, type });
  },

  checkForCalls: async (userId: number) => {
    return phpFetch('check_incoming_call', { user_id: userId });
  },

  answerCall: async (callId: number, sdp: string) => {
    return phpFetch('answer_call', { call_id: callId, sdp });
  },

  pollCallStatus: async (callId: number) => {
    return phpFetch('poll_call_status', { call_id: callId });
  },

  endCall: async (callId: number) => {
    return phpFetch('end_call', { call_id: callId });
  }
};