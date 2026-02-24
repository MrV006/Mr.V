
export type MessageType = 'text' | 'image' | 'video' | 'audio';

export interface User {
  id: number;
  username: string;
  name?: string;
  avatar?: string;
  is_online?: boolean;
  public_key?: string; // Added for E2EE
  phone_number?: string;
  bio?: string;
  birthday?: string;
}

export interface Message {
  id: number;
  sender_id: number;
  receiver_id: number;
  message: string;
  created_at: string;
  is_read?: boolean;
  is_edited?: boolean;
  type: MessageType;
  attachment_url?: string;
}

export interface Contact extends User {
  last_message?: string;
  last_message_time?: string;
  unread_count?: number;
}

export interface CallSignal {
  id: number;
  caller_id: number;
  callee_id: number;
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string; 
  status: 'pending' | 'active' | 'ended' | 'rejected';
  created_at: string;
}

export interface Post {
  id: number;
  user_id: number;
  media_url: string;
  media_type: 'image' | 'video';
  created_at: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  token?: string;
  message?: string;
  contacts?: Contact[];
  messages?: Message[];
}

export type ViewState = 'auth' | 'chat' | 'server-docs' | 'profile';
export type DeviceType = 'mobile' | 'desktop';
