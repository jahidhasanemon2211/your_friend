export type UserStatus = "Online" | "Very busy" | "Away" | "Offline";

export interface Contact {
  id: string;
  name: string;
  username?: string; // Searchable handle, e.g. "ana"
  avatar: string;
  status: UserStatus;
  lastMessage: string;
  lastTimestamp: string;
  unreadCount: number;
  isTyping?: boolean;
  hasVideoCall?: boolean;
  hasAttachment?: boolean;
}

export type MessageType = "text" | "voice" | "file";

export interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: MessageType;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string; // voice clip length
  isOffline?: boolean; // Offline flag for IndexedDB syncing
  tempId?: string;
  recipientId: string; // Target chat recipient (or "design-talk" for channel)
  status: "sent" | "delivered" | "seen";
}

export interface UserProfile {
  uid: string;
  name: string;
  username?: string; // Unique username e.g. "ana"
  email: string | null;
  photoURL: string;
  status: UserStatus;
  accessToken?: string; // Cache in memory
}
