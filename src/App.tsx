import React, { useState, useEffect, useRef } from "react";
import Sidebar from "./components/Sidebar";
import ChatWindow from "./components/ChatWindow";
import { Contact, Message, UserProfile, UserStatus, MessageType } from "./types";
import {
  initDB,
  getSavedMessages,
  getSavedContacts,
  saveMessage,
  saveMessagesBulk,
  saveContactsBulk,
  clearContacts,
  getOfflineMessages,
  markMessageSynced
} from "./lib/db";
import { initAuth, googleSignIn, logout } from "./lib/auth";
import { uploadBackupToDrive } from "./lib/drive";
import { LogIn, User, AtSign, Check, ChevronDown } from "lucide-react";

const INITIAL_CONTACTS: Contact[] = [];

const CURATED_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150"
];

export default function App() {
  const [contacts, setContacts] = useState<Contact[]>(INITIAL_CONTACTS);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeContactId, setActiveContactId] = useState<string>("");
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  
  // Real-time server-side username searching states
  const [searchQuery, setSearchQuery] = useState("");
  const [globalSearchResults, setGlobalSearchResults] = useState<UserProfile[]>([]);

  // Mobile navigation device responsive state
  const [showChatMobile, setShowChatMobile] = useState(false);

  // Current logged in registration profile
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  // Modal displays
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);

  // Custom non-blocking dialog state as replacement of iframe-blocked window.alert & window.confirm
  const [customDialog, setCustomDialog] = useState<{
    show: boolean;
    title: string;
    message: string;
    isConfirm: boolean;
    onConfirm: () => void;
  } | null>(null);

  const showCustomAlert = (message: string, title = "Notification") => {
    setCustomDialog({
      show: true,
      title,
      message,
      isConfirm: false,
      onConfirm: () => {}
    });
  };

  const showCustomConfirm = (message: string, onConfirm: () => void, title = "Confirmation Required") => {
    setCustomDialog({
      show: true,
      title,
      message,
      isConfirm: true,
      onConfirm
    });
  };

  // Override window.alert globally in a clean layout lifecycle hook
  useEffect(() => {
    const originalAlert = window.alert;
    window.alert = (msg: string) => {
      showCustomAlert(msg, "Alert");
    };
    return () => {
      window.alert = originalAlert;
    };
  }, []);

  // User input states inside registration/edit card
  const [formName, setFormName] = useState("");
  const [formUsername, setFormUsername] = useState("");
  const [formAvatar, setFormAvatar] = useState(CURATED_AVATARS[0]);
  const [formError, setFormError] = useState("");

  const [isBackingUp, setIsBackingUp] = useState(false);
  const [otherUserTyping, setOtherUserTyping] = useState(false);

  const eventSourceRef = useRef<EventSource | null>(null);
  const customAvatarInputRef = useRef<HTMLInputElement>(null);

  const handleCustomAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please choose an image file smaller than 2 MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setFormAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Initialize DB and state loading
  useEffect(() => {
    async function loadInitialData() {
      try {
        await initDB();
        
        // Try getting cached data
        const savedMessages = await getSavedMessages();
        let savedContacts = await getSavedContacts();
        
        // Purge old mock contacts that might exist from previous IndexedDB cache
        const mockIds = ["design-talk", "mario-sestak", "ana-sakac", "hrvoje-dominko", "ena-begcevic", "mario-simic", "bill-gates"];
        const originalLength = savedContacts.length;
        savedContacts = savedContacts.filter(c => !mockIds.includes(c.id));

        if (savedContacts.length > 0) {
          setContacts(savedContacts);
          if (savedContacts.length < originalLength) {
            await clearContacts();
            await saveContactsBulk(savedContacts); // update db with filtered mapping
          }
        } else {
          setContacts(INITIAL_CONTACTS);
          await clearContacts();
        }

        if (savedMessages.length > 0) {
          setMessages(savedMessages);
        } else {
          await syncMessagesFromServer();
        }
      } catch (err) {
        console.error("IndexedDB error on load:", err);
      }
    }

    loadInitialData();

    // Setup network status listeners
    const handleOnline = () => {
      setIsOnline(true);
      triggerBackgroundSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Initial check for offline messages if we are loaded online
    if (navigator.onLine) {
      triggerBackgroundSync();
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Sync / load profile state from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("pwa_chat_user_profile");
    if (storedUser) {
      try {
        const parsed: UserProfile = JSON.parse(storedUser);
        setCurrentUser(parsed);
        setFormName(parsed.name);
        setFormUsername(parsed.username || "");
        setFormAvatar(parsed.photoURL);

        // Retrieve specifically added contacts list for this active account UID!
        const userContactsKey = `pwa_chat_contacts_${parsed.uid}`;
        const storedContacts = localStorage.getItem(userContactsKey);
        if (storedContacts) {
          try {
            const parsedContacts = JSON.parse(storedContacts);
            if (Array.isArray(parsedContacts) && parsedContacts.length > 0) {
              setContacts(parsedContacts);
            }
          } catch (e) {
            console.warn("Stale user-specific contacts list format, carrying over.", e);
          }
        }

        // Register profile with backend on start
        if (navigator.onLine) {
          fetch("/api/users/register", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(parsed)
          }).catch(console.error);
        }
      } catch (err) {
        console.error("Stored profile parsing error:", err);
      }
    }
  }, []);

  // Synchronously persist active profile contacts list inside local storage 
  useEffect(() => {
    if (currentUser?.uid && contacts.length > 0) {
      const userContactsKey = `pwa_chat_contacts_${currentUser.uid}`;
      localStorage.setItem(userContactsKey, JSON.stringify(contacts));
    }
  }, [contacts, currentUser]);

  // Debounced server-side user username search list loading
  useEffect(() => {
    const fetchSearch = async () => {
      if (!searchQuery.trim()) {
        setGlobalSearchResults([]);
        return;
      }
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(searchQuery)}`);
        if (res.ok) {
          const data = await res.json();
          setGlobalSearchResults(data);
        }
      } catch (err) {
        console.error("Failed to query global users:", err);
      }
    };

    const timer = setTimeout(fetchSearch, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Fetch messages from Express backend
  const syncMessagesFromServer = async () => {
    if (!navigator.onLine) return;
    try {
      const response = await fetch("/api/messages");
      if (response.ok) {
        const data: Message[] = await response.json();
        setMessages(data);
        await saveMessagesBulk(data);
      }
    } catch (err) {
      console.error("Failed to fetch fresh messages from local express:", err);
    }
  };

  // Setup Server-Sent Events (SSE) stream for instant presence and messaging
  useEffect(() => {
    if (!isOnline) {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      return;
    }

    const sse = new EventSource("/api/events");
    eventSourceRef.current = sse;

    sse.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        
        if (payload.type === "new-message") {
          const newMsg: Message = payload.data;
          
          setMessages((prev) => {
            if (prev.some((m) => m.id === newMsg.id || (newMsg.tempId && m.id === newMsg.tempId))) {
              return prev;
            }
            const updated = [...prev, newMsg];
            saveMessage(newMsg).catch(console.error);
            return updated;
          });

        } else if (payload.type === "messages-read") {
          const { senderId, recipientId } = payload.data;
          setMessages((prev) =>
            prev.map((m) => {
              const matchesDirect = (m.senderId === senderId && m.recipientId === recipientId);
              const matchesGroup = (recipientId === "design-talk" && m.recipientId === "design-talk" && m.senderId !== senderId);
              if (matchesDirect || matchesGroup) {
                return { ...m, status: "seen" };
              }
              return m;
            })
          );
        } else if (payload.type === "profile-update") {
          const updatedProfile: UserProfile = payload.data;
          // Update contact metadata in contacts list if matched
          setContacts((prev) =>
            prev.map((c) => {
              if (c.id === updatedProfile.uid) {
                return {
                  ...c,
                  name: updatedProfile.name,
                  avatar: updatedProfile.photoURL,
                  status: updatedProfile.status,
                  username: updatedProfile.username || c.username
                };
              }
              return c;
            })
          );
        } else if (payload.type === "typing") {
          const typingState = payload.data;
          if (typingState.userId !== currentUser?.uid) {
            setOtherUserTyping(typingState.isTyping);
            setContacts((prev) =>
              prev.map((c) => {
                if (c.id === typingState.userId || (typingState.userId === "mario" && c.id === "mario-sestak")) {
                  return { ...c, isTyping: typingState.isTyping };
                }
                return c;
              })
            );
          }
        } else if (payload.type === "user-status") {
          const statusState = payload.data;
          setContacts((prev) =>
            prev.map((c) => {
              if (c.id === statusState.userId || (statusState.userId === "mario" && c.id === "mario-sestak")) {
                return { ...c, status: statusState.status };
              }
              return c;
            })
          );
        }
      } catch (err) {
        console.error("Error parsing SSE data stream:", err);
      }
    };

    sse.onerror = (err) => {
      console.warn("SSE connection lost. Reconnecting...", err);
      sse.close();
    };

    return () => {
      sse.close();
      eventSourceRef.current = null;
    };
  }, [isOnline, activeContactId, currentUser]);

  // Synchronize IndexedDB offline queued messages to server
  const triggerBackgroundSync = async () => {
    try {
      const offlineMsgs = await getOfflineMessages();
      if (offlineMsgs.length === 0) return;

      console.log(`Discovered ${offlineMsgs.length} offline messages to sync...`);

      const response = await fetch("/api/messages/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: offlineMsgs }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Offline sync complete:", result);

        for (const msg of offlineMsgs) {
          await markMessageSynced(msg.id);
        }

        await syncMessagesFromServer();
        alert(`Offline sync restored successfully! Uploaded ${offlineMsgs.length} messages.`);
      }
    } catch (err) {
      console.error("Failed to run background synchronization:", err);
    }
  };

  // Google OAuth flow setup listener
  useEffect(() => {
    initAuth(
      (user, token) => {
        const defaultProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || "Google User",
          username: (user.displayName || "google_user").replaceAll(" ", "").toLowerCase(),
          email: user.email,
          photoURL: user.photoURL || CURATED_AVATARS[0],
          status: "Online",
          accessToken: token
        };
        setCurrentUser(defaultProfile);
        localStorage.setItem("pwa_chat_user_profile", JSON.stringify(defaultProfile));
        setIsOnline(true);
        triggerBackgroundSync();
      },
      () => {
        console.log("Continuing in local profile registration mode.");
      }
    );
  }, []);

  const handleGoogleLogin = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        const googleProfile: UserProfile = {
          uid: result.user.uid,
          name: result.user.displayName || "Google User",
          username: (result.user.displayName || "user").replaceAll(" ", "").toLowerCase() + "_" + Math.floor(Math.random() * 90),
          email: result.user.email,
          photoURL: result.user.photoURL || CURATED_AVATARS[0],
          status: "Online",
          accessToken: result.accessToken
        };
        setCurrentUser(googleProfile);
        localStorage.setItem("pwa_chat_user_profile", JSON.stringify(googleProfile));
        setFormName(googleProfile.name);
        setFormUsername(googleProfile.username || "");
        setFormAvatar(googleProfile.photoURL);

        // Register on backend
        await fetch("/api/users/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(googleProfile)
        });

        alert(`Welcome, ${result.user.displayName}! Chat auto-backups to Google Drive are now active.`);
      }
    } catch (err: any) {
      if (err?.code !== "auth/popup-closed-by-user" && err?.code !== "auth/cancelled-popup-request") {
        console.error("Google authentication failed:", err);
        alert("Sign in with Google did not complete. Please check connection and try again.");
      }
    }
  };

  const handleLogout = async () => {
    showCustomConfirm(
      "Are you sure you want to sign out? Your conversation sync stays saved locally.",
      async () => {
        await logout();
        setCurrentUser(null);
        localStorage.removeItem("pwa_chat_user_profile");
        setMessages([]);
        setContacts(INITIAL_CONTACTS);
        setActiveContactId("");
        setShowChatMobile(false);
        showCustomAlert("Signed out successfully.");
      },
      "Sign Out"
    );
  };

  // Modify active user presence status
  const handleStatusChange = async (newStatus: UserStatus) => {
    if (currentUser) {
      const updatedUser = { ...currentUser, status: newStatus };
      setCurrentUser(updatedUser);
      localStorage.setItem("pwa_chat_user_profile", JSON.stringify(updatedUser));
      
      if (isOnline) {
        try {
          await fetch("/api/user-status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUser.uid, status: newStatus })
          });
        } catch (err) {
          console.error("Failed to propagate status update:", err);
        }
      }
    }
  };

  // Send typed/attached message
  const handleSendMessage = async (
    content: string,
    type: MessageType,
    fileMetadata?: { fileName: string; fileData: string; fileSize: string }
  ) => {
    if (!currentUser) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const localId = "msg_local_" + Date.now() + "_" + Math.random().toString(36).substring(2, 5);

    const newMsg: Message = {
      id: localId,
      senderId: currentUser.uid,
      senderName: currentUser.name,
      senderAvatar: currentUser.photoURL,
      content: content,
      timestamp: timestamp,
      type: type,
      fileUrl: fileMetadata?.fileData,
      fileName: fileMetadata?.fileName,
      fileSize: fileMetadata?.fileSize,
      isOffline: !isOnline,
      tempId: localId,
      recipientId: activeContactId,
      status: "delivered"
    };

    setMessages((prev) => [...prev, newMsg]);
    await saveMessage(newMsg);

    if (isOnline) {
      try {
        const response = await fetch("/api/messages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(newMsg)
        });

        if (response.ok) {
          const savedServerMsg = await response.json();
          await markMessageSynced(localId, savedServerMsg.id);
        }
      } catch (err) {
        console.warn("Failed to deliver message immediately, queued in IndexedDB:", err);
        setMessages((prev) =>
          prev.map((m) => (m.id === localId ? { ...m, isOffline: true } : m))
        );
      }
    }
  };

  // REAL-TIME 'READ/SEEN' TRIGGER SYSTEM
  useEffect(() => {
    if (!currentUser || !isOnline || !activeContactId) return;

    // Direct recipient check: check if any unread DMs or group messages remain for active view
    const hasUnread = messages.some(
      (m) => m.senderId === activeContactId && m.recipientId === currentUser.uid && m.status !== "seen"
    );

    if (!hasUnread && activeContactId !== "design-talk") return;

    const markAsRead = async () => {
      try {
        await fetch("/api/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ senderId: activeContactId, recipientId: currentUser.uid })
        });

        setMessages((prev) => {
          let updated = false;
          const mapResult = prev.map((m) => {
            const matchesDirect = (m.senderId === activeContactId && m.recipientId === currentUser.uid);
            const matchesGroup = (activeContactId === "design-talk" && m.recipientId === "design-talk" && m.senderId !== currentUser.uid);
            if ((matchesDirect || matchesGroup) && m.status !== "seen") {
              updated = true;
              return { ...m, status: "seen" };
            }
            return m;
          });
          return updated ? mapResult : prev;
        });
      } catch (err) {
        console.error("Failed to synchronize read ticks:", err);
      }
    };

    markAsRead();
  }, [activeContactId, messages, currentUser, isOnline]);

  // Typing status toggle provider
  const handleSendTyping = async (isTyping: boolean) => {
    if (!isOnline || !currentUser) return;
    try {
      await fetch("/api/typing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          userId: currentUser.uid, 
          userName: currentUser.name, 
          isTyping,
          chatId: activeContactId
        }),
      });
    } catch (err) {
      // Slit silent in logs
    }
  };

  // Google Drive Manual Backup triggers
  const handleManualBackup = async () => {
    if (!currentUser?.accessToken) {
      alert("Please Sign in with Google first to authenticate backing up to Google Drive.");
      return;
    }

    showCustomConfirm(
      `Do you want to export your complete chat history (${messages.length} messages) directly to your Google Drive? This will create a secure, portable JSON backup file.`,
      async () => {
        setIsBackingUp(true);
        try {
          const result = await uploadBackupToDrive(
            currentUser.accessToken!,
            currentUser.email!,
            messages
          );

          if (result.success) {
            alert(`Excellent! Your chat backup file has been saved in your Google Drive (File ID: ${result.fileId}).`);
          } else {
            alert(`Backup Failed: ${result.error}`);
          }
        } catch (err: any) {
          console.error(err);
          alert("Failed to export: " + (err.message || "Unknown error"));
        } finally {
          setIsBackingUp(false);
        }
      },
      "Export Backup"
    );
  };

  // Handler for clicking username search Chat action
  const handleStartSearchChat = (user: UserProfile) => {
    const exists = contacts.some((c) => c.id === user.uid);
    if (!exists) {
      const newContact: Contact = {
        id: user.uid,
        name: user.name,
        username: user.username,
        avatar: user.photoURL,
        status: user.status,
        lastMessage: "Conversation started",
        lastTimestamp: "Just now",
        unreadCount: 0
      };
      const updatedContacts = [newContact, ...contacts];
      setContacts(updatedContacts);
      saveContactsBulk(updatedContacts).catch(console.error);
    }
    setActiveContactId(user.uid);
    setSearchQuery("");
    setShowChatMobile(true);
  };

  // Handler to register / save custom profile values
  const handleRegisterProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const cleanUsername = formUsername.trim().toLowerCase().replaceAll("@", "").replaceAll(" ", "");
    if (!formName.trim()) {
      setFormError("Please enter your display name");
      return;
    }
    if (!cleanUsername) {
      setFormError("Please enter a username");
      return;
    }
    if (!/^[a-zA-Z0-9_\-]+$/.test(cleanUsername)) {
      setFormError("Usernames can only contain letters, numbers, hyphens and underscores");
      return;
    }

    const uid = currentUser?.uid || "user_guest_" + Math.floor(Math.random() * 89999 + 10000);
    const updatedProfile: UserProfile = {
      uid,
      name: formName.trim(),
      username: cleanUsername,
      photoURL: formAvatar,
      status: currentUser?.status || "Online",
      email: currentUser?.email || null,
      accessToken: currentUser?.accessToken
    };

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });

      if (!response.ok) {
        const errObj = await response.json();
        setFormError(errObj.error || "Failed to register profile");
        return;
      }

      setCurrentUser(updatedProfile);
      localStorage.setItem("pwa_chat_user_profile", JSON.stringify(updatedProfile));
      setShowEditProfileModal(false);
    } catch (err) {
      setFormError("Failed to connect to registration backend");
    }
  };

  const handleUpdateProfile = async (updated: Partial<UserProfile>): Promise<boolean> => {
    if (!currentUser) return false;
    const cleanUsername = (updated.username || currentUser.username || "").trim().toLowerCase().replaceAll("@", "").replaceAll(" ", "");
    if (!cleanUsername) {
      alert("Please enter a username");
      return false;
    }

    const updatedProfile: UserProfile = {
      ...currentUser,
      name: updated.name !== undefined ? updated.name.trim() : currentUser.name,
      username: cleanUsername,
      photoURL: updated.photoURL !== undefined ? updated.photoURL : currentUser.photoURL,
      status: updated.status !== undefined ? updated.status : currentUser.status,
    };

    try {
      const response = await fetch("/api/users/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updatedProfile)
      });

      if (!response.ok) {
        const errObj = await response.json();
        alert(errObj.error || "Failed to save profile changes");
        return false;
      }

      setCurrentUser(updatedProfile);
      localStorage.setItem("pwa_chat_user_profile", JSON.stringify(updatedProfile));
      
      if (updatedProfile.photoURL) {
        setFormAvatar(updatedProfile.photoURL);
      }
      if (updatedProfile.name) {
        setFormName(updatedProfile.name);
      }
      if (updatedProfile.username) {
        setFormUsername(updatedProfile.username);
      }
      return true;
    } catch (err) {
      console.error(err);
      alert("Failed to save changes onto server registry.");
      return false;
    }
  };

  // Dynamic status/unread-badge computing
  const computedContacts = contacts.map((contact) => {
    // General Group counts
    if (contact.id === "design-talk") {
      const unreadCountMsg = messages.filter(
        (m) => m.recipientId === "design-talk" && m.senderId !== currentUser?.uid && m.status !== "seen"
      ).length;
      return { ...contact, unreadCount: unreadCountMsg };
    }

    // Direct Chat counts
    const unreadCountMsg = messages.filter(
      (m) => m.senderId === contact.id && m.recipientId === currentUser?.uid && m.status !== "seen"
    ).length;

    const conversations = messages.filter(
      (m) =>
        (m.senderId === currentUser?.uid && m.recipientId === contact.id) ||
        (m.senderId === contact.id && m.recipientId === currentUser?.uid)
    );
    const lastMsg = conversations[conversations.length - 1];

    return {
      ...contact,
      lastMessage: lastMsg ? (lastMsg.type === "text" ? lastMsg.content : `📎 file attachment`) : contact.lastMessage,
      lastTimestamp: lastMsg ? lastMsg.timestamp : contact.lastTimestamp,
      unreadCount: unreadCountMsg
    };
  });

  const activeContact = computedContacts.find((c) => c.id === activeContactId) || computedContacts[0] || null;

  return (
    <div id="pwa-chat-application" className="w-full h-screen flex overflow-hidden bg-chat-bg antialiased font-sans">
      <div className="flex w-full h-full max-w-7xl mx-auto shadow-2xl relative bg-white overflow-hidden border-x border-black/5">
        {/* Left Sidebar */}
        <Sidebar
          contacts={computedContacts}
          activeContactId={activeContactId}
          onSelectContact={(id) => {
            setActiveContactId(id);
            setShowChatMobile(true);
          }}
          currentUser={currentUser}
          onStatusChange={handleStatusChange}
          onLogin={handleGoogleLogin}
          onLogout={handleLogout}
          isOnline={isOnline}
          onTriggerBackup={handleManualBackup}
          isBackingUp={isBackingUp}
          onEditProfile={() => setShowEditProfileModal(true)}
          onUpdateProfile={handleUpdateProfile}
          showChatMobile={showChatMobile}
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          globalSearchResults={globalSearchResults}
          onStartSearchChat={handleStartSearchChat}
        />

        {/* Right Chat Grid Frame */}
        <ChatWindow
          contact={activeContact}
          messages={messages.filter((m) => {
            if (activeContactId === "design-talk") {
              return m.recipientId === "design-talk";
            }
            const matchesDirect = 
              (m.senderId === currentUser?.uid && m.recipientId === activeContactId) ||
              (m.senderId === activeContactId && m.recipientId === currentUser?.uid);
            
            const matchesLocal = m.id.startsWith("msg_local") && m.recipientId === activeContactId;

            return matchesDirect || matchesLocal;
          })}
          onSendMessage={handleSendMessage}
          otherUserTyping={otherUserTyping && activeContactId === "mario-sestak"}
          onSendTyping={handleSendTyping}
          onBack={() => setShowChatMobile(false)}
          showChatMobile={showChatMobile}
        />
      </div>

      {/* RENDER MANDATORY OVERLAY FOR NEW/UNREGISTERED USERS */}
      {(!currentUser || !currentUser.username) && (
        <div className="fixed inset-0 bg-[#07030a] z-110 flex items-center justify-center p-4 overflow-y-auto relative">
          
          {/* Animated Background Mesh Spheres */}
          <div className="absolute top-[15%] left-[10%] w-72 h-72 rounded-full bg-[#8b46df]/15 blur-[80px] animate-float-slow pointer-events-none" />
          <div className="absolute bottom-[15%] right-[10%] w-80 h-80 rounded-full bg-[#f472b6]/15 blur-[90px] animate-float-reverse pointer-events-none" />
          <div className="absolute top-[45%] right-[25%] w-48 h-48 rounded-full bg-[#3b82f6]/10 blur-[60px] animate-pulse pointer-events-none" />

          {/* Premium Glassmorphism Card */}
          <div className="bg-[#120a18]/80 backdrop-blur-xl border border-[#3e1f57]/50 rounded-[32px] p-6 md:p-8 w-full max-w-md shadow-2xl relative z-10 text-zinc-100 flex flex-col hover:border-[#8b46df]/40 transition-all duration-500 overflow-hidden">
            
            {/* Top pulsing decorative status light */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-[2px] bg-gradient-to-r from-transparent via-[#8b46df] to-transparent animate-pulse" />

            {/* Glowing Launcher Icon */}
            <div className="flex justify-center mb-5 relative">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-[#8b46df] via-[#a855f7] to-[#ec4899] flex items-center justify-center text-white text-3xl font-extrabold select-none shadow-xl shadow-[#8b46df]/20 hover:scale-105 active:scale-95 transition-transform duration-300">
                YF
              </div>
              <span className="absolute -bottom-1 w-2 h-2 rounded-full bg-emerald-400 animate-ping border border-[#120a18]" />
            </div>
            
            {/* Elegant Header Title */}
            <h1 className="text-2xl md:text-3xl font-bold font-sans text-center tracking-tight text-white">
              Your Friend
            </h1>
            <p className="text-xs text-zinc-400 text-center mt-1.5 font-sans px-4 leading-relaxed">
              Create your dynamic profile handle to stay connected with search matches in real-time.
            </p>

            {/* Single Sign-On Shortcut Component */}
            <div className="mt-6">
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full py-3 px-4 rounded-xl bg-white text-slate-900 text-xs font-bold hover:bg-zinc-100 active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-2 border border-zinc-200 shadow-md shadow-black/10"
              >
                <LogIn className="w-4 h-4 text-[#8b46df]" />
                Auto Sync with Google
              </button>
              <div className="flex items-center gap-3 my-4">
                <hr className="flex-1 border-[#2e1741]" />
                <span className="text-[9px] text-zinc-500 font-mono uppercase tracking-widest">OR REGISTER LOCAL HANDLE</span>
                <hr className="flex-1 border-[#2e1741]" />
              </div>
            </div>

            <form onSubmit={handleRegisterProfile} className="space-y-4">
              {formError && (
                <div className="p-3 text-xs bg-rose-950/40 text-rose-300 font-sans border border-rose-900/40 rounded-lg animate-shake">
                  {formError}
                </div>
              )}

              {/* Display Name input */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[11px] font-bold text-zinc-400 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-purple" />
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jahid Hasan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e1029]/60 border border-[#3e1e55] focus:border-[#8b46df] rounded-xl text-sm focus:outline-none text-zinc-100 font-sans transition-colors"
                  required
                />
              </div>

              {/* Unique Searchable Username input */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[11px] font-bold text-zinc-400 font-sans uppercase tracking-wider flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-accent-purple" />
                  Unique @username handle
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm text-zinc-500 font-bold font-mono">@</span>
                  <input
                    type="text"
                    placeholder="jahid_hasan"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replaceAll(" ", ""))}
                    className="w-full pl-8 pr-4 py-3 bg-[#1e1029]/60 border border-[#3e1e55] focus:border-[#8b46df] rounded-xl text-sm focus:outline-none text-zinc-100 font-mono tracking-wide transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Interactive Avatar Selectors */}
              <div className="space-y-2 flex flex-col justify-start">
                <label className="text-[11px] font-bold text-[#beb2ca] font-sans uppercase tracking-wider">
                  Pick your profile photo
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {CURATED_AVATARS.map((av) => {
                    const isSelected = formAvatar === av;
                    return (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setFormAvatar(av)}
                        className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all active:scale-90 cursor-pointer ${
                          isSelected ? "border-[#ff4081] scale-105 shadow-md shadow-[#ff4081]/20" : "border-transparent opacity-65 hover:opacity-100"
                        }`}
                      >
                        <img src={av} alt="Avatar Selection" className="w-full h-full object-cover" />
                        {isSelected && (
                          <div className="absolute inset-0 bg-[#ff4081]/15 flex items-center justify-center">
                            <Check className="w-4 h-4 text-white stroke-[3px]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => customAvatarInputRef.current?.click()}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-90 cursor-pointer text-zinc-400 hover:text-white ${
                      formAvatar && !CURATED_AVATARS.includes(formAvatar) ? "border-[#ff4081] scale-105" : "border-white/10"
                    }`}
                    title="Upload local custom file image"
                  >
                    {formAvatar && !CURATED_AVATARS.includes(formAvatar) ? (
                      <>
                        <img src={formAvatar} alt="Custom profile upload" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-[#ff4081]/15 flex items-center justify-center">
                          <Check className="w-4 h-4 text-white stroke-[3px]" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 text-center">
                        <svg className="w-4 h-4 text-zinc-400 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[8px] font-sans font-bold uppercase tracking-tight">Upload</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Submit portal registration */}
              <button
                type="submit"
                className="w-full mt-3 py-3.5 bg-gradient-to-r from-[#8b46df] to-[#f472b6] hover:from-[#9d5bfa] hover:to-[#f47dcd] active:scale-[0.98] text-white text-xs font-bold uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-[#8b46df]/20 cursor-pointer"
              >
                Join Server & Chat
              </button>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PROFILE MODAL (FOR REGISTERED USERS) */}
      {showEditProfileModal && currentUser && (
        <div className="fixed inset-0 bg-[#09040d]/80 backdrop-blur-xs z-110 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#170e1f] border border-[#3e255a] rounded-3xl p-6 md:p-8 w-full max-w-md shadow-2xl text-zinc-100 flex flex-col">
            <h1 className="text-lg md:text-xl font-bold font-sans tracking-wide text-zinc-100">
              Edit Your Profile
            </h1>
            <p className="text-xs text-zinc-400 mt-1 font-sans">
              Update your display name, username, and avatar settings instantly.
            </p>

            <form onSubmit={handleRegisterProfile} className="space-y-4 mt-4">
              {formError && (
                <div className="p-3 text-xs bg-rose-950/40 text-rose-300 font-sans border border-rose-900/40 rounded-lg">
                  {formError}
                </div>
              )}

              {/* Display Name */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-xs font-semibold text-zinc-300 font-sans flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-accent-purple" />
                  Your Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Jahid Hasan"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-4 py-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl text-sm focus:outline-none focus:border-accent-purple text-zinc-100 font-sans"
                  required
                />
              </div>

              {/* Unique Searchable Username */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-xs font-semibold text-zinc-300 font-sans flex items-center gap-1.5">
                  <AtSign className="w-3.5 h-3.5 text-accent-purple" />
                  Unique @username
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm text-zinc-500 font-semibold font-mono">@</span>
                  <input
                    type="text"
                    placeholder="jahid_hasan"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value.toLowerCase().replaceAll(" ", ""))}
                    className="w-full pl-8 pr-4 py-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl text-sm focus:outline-none focus:border-accent-purple text-zinc-100 font-mono tracking-wide"
                    required
                  />
                </div>
              </div>

              {/* Avatar Picker */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-xs font-semibold text-[#ebdffd] font-sans">
                  Select a Profile Picture
                </label>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {CURATED_AVATARS.map((av) => (
                    <button
                      key={av}
                      type="button"
                      onClick={() => setFormAvatar(av)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-transform active:scale-95 cursor-pointer ${
                        formAvatar === av ? "border-accent-purple scale-105" : "border-white/10 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <img src={av} alt="Avatar option" className="w-full h-full object-cover" />
                      {formAvatar === av && (
                        <div className="absolute inset-0 bg-accent-purple/30 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white stroke-[3px]" />
                        </div>
                      )}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => customAvatarInputRef.current?.click()}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 border-dashed flex flex-col items-center justify-center transition-all bg-white/5 hover:bg-white/10 active:scale-95 cursor-pointer text-zinc-400 hover:text-white ${
                      formAvatar && !CURATED_AVATARS.includes(formAvatar) ? "border-[#8b46df] scale-105" : "border-white/10"
                    }`}
                    title="Upload custom image file"
                  >
                    {formAvatar && !CURATED_AVATARS.includes(formAvatar) ? (
                      <>
                        <img src={formAvatar} alt="Custom avatar" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-[#8b46df]/30 flex items-center justify-center">
                          <Check className="w-5 h-5 text-white stroke-[3px]" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-1 text-center">
                        <svg className="w-4 h-4 text-zinc-400 mb-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        <span className="text-[9px] font-sans font-medium tracking-tight">Upload</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditProfileModal(false);
                    setFormName(currentUser.name);
                    setFormUsername(currentUser.username || "");
                    setFormAvatar(currentUser.photoURL);
                  }}
                  className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold rounded-xl transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-[#8b46df] hover:bg-[#9d5bfa] text-white text-xs font-semibold rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      <input
        type="file"
        ref={customAvatarInputRef}
        onChange={handleCustomAvatarChange}
        className="hidden"
        accept="image/*"
      />

      {/* Elegant glassmorphic Custom Dialog modal for alerts and confirmations */}
      {customDialog && customDialog.show && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-[#120a18] border border-white/10 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in">
            {/* Header / Accent bar */}
            <div className="h-1.5 w-full bg-gradient-to-r from-[#8b46df] to-[#d946ef]" />
            
            <div className="p-6">
              <h3 className="text-zinc-100 font-sans font-bold text-base leading-snug mb-2">
                {customDialog.title}
              </h3>
              <p className="text-zinc-300 font-sans text-xs leading-relaxed">
                {customDialog.message}
              </p>
              
              <div className="mt-6 flex justify-end gap-2.5">
                {customDialog.isConfirm ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setCustomDialog(null)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-zinc-300 rounded-xl text-xs font-semibold font-sans cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const confirmCallback = customDialog.onConfirm;
                        setCustomDialog(null);
                        confirmCallback();
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-[#8b46df] to-[#d946ef] hover:opacity-95 text-white rounded-xl text-xs font-semibold font-sans cursor-pointer shadow-lg shadow-[#8b46df]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      Confirm
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={() => setCustomDialog(null)}
                    className="px-5 py-2 bg-gradient-to-r from-[#8b46df] to-[#d946ef] hover:opacity-95 text-white rounded-xl text-xs font-semibold font-sans cursor-pointer shadow-lg shadow-[#8b46df]/20 transition-all"
                  >
                    OK
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
