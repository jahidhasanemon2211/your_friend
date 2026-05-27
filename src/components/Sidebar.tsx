import { useState } from "react";
import { 
  Search, 
  ChevronDown, 
  Users, 
  MessageSquare, 
  Phone, 
  SquarePen, 
  Wifi, 
  WifiOff, 
  LogIn, 
  LogOut, 
  Video, 
  Paperclip, 
  Settings,
  Sparkles,
  Folder,
  ChevronRight
} from "lucide-react";
import { Contact, UserStatus, UserProfile } from "../types";
import SettingsView from "./SettingsView";

interface SidebarProps {
  contacts: Contact[];
  activeContactId: string;
  onSelectContact: (id: string) => void;
  currentUser: UserProfile | null;
  onStatusChange: (status: UserStatus) => void;
  onLogin: () => void;
  onLogout: () => void;
  isOnline: boolean;
  onTriggerBackup: () => void;
  isBackingUp: boolean;
  onEditProfile: () => void;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  showChatMobile: boolean;
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  globalSearchResults: UserProfile[];
  onStartSearchChat: (user: UserProfile) => void;
}

export default function Sidebar({
  contacts,
  activeContactId,
  onSelectContact,
  currentUser,
  onStatusChange,
  onLogin,
  onLogout,
  isOnline,
  onTriggerBackup,
  isBackingUp,
  onEditProfile,
  onUpdateProfile,
  showChatMobile,
  searchQuery,
  onSearchQueryChange,
  globalSearchResults,
  onStartSearchChat,
}: SidebarProps) {
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [activeTab, setActiveTab] = useState<"chats" | "summaries" | "documents" | "settings">("chats");

  const filteredContacts = contacts.filter((c) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.username && c.username.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case "Online":
        return "bg-emerald-500";
      case "Very busy":
        return "bg-rose-500";
      case "Away":
        return "bg-amber-500";
      case "Offline":
        return "bg-gray-400";
      default:
        return "bg-emerald-500";
    }
  };

  return (
    <div 
      id="sidebar-container" 
      className={`w-full md:w-[320px] bg-sidebar-bg text-zinc-100 flex flex-col h-full shrink-0 relative border-r border-[#2d2235]/65 transition-all duration-300 ${
        showChatMobile ? "hidden md:flex" : "flex"
      }`}
    >
      {/* Floating Edit/Profile Button - Opens profile settings dynamically */}
      <button 
        id="floating-edit-btn"
        onClick={() => setActiveTab("settings")}
        className="absolute -right-5 top-12 w-11 h-11 bg-accent-purple hover:bg-accent-purple/90 active:bg-accent-purple/80 text-white rounded-xl shadow-lg shadow-[#120b18]/60 flex items-center justify-center transition-all hover:scale-105 active:scale-95 z-45 group cursor-pointer"
        title="Edit Profile Settings"
      >
        <SquarePen className="w-5 h-5 text-zinc-100" />
      </button>

      {/* Connection Mode Banner */}
      <div 
        id="connection-banner"
        className={`px-4 py-1.5 text-[10px] flex items-center justify-between transition-colors shrink-0 ${
          isOnline ? "bg-emerald-950/40 text-emerald-400" : "bg-amber-950/40 text-amber-400"
        }`}
      >
        <div className="flex items-center gap-1.5 font-mono">
          {isOnline ? (
            <>
              <Wifi className="w-3.5 h-3.5" />
              <span>ONLINE STATE</span>
            </>
          ) : (
            <>
              <WifiOff className="w-3.5 h-3.5" />
              <span>OFFLINE COMS ENABLED</span>
            </>
          )}
        </div>
        <span className="w-1.5 h-1.5 rounded-full animate-ping bg-current" />
      </div>

      {/* active tab body panel container */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden relative">
        {activeTab === "settings" && currentUser ? (
          <SettingsView
            currentUser={currentUser}
            onUpdateProfile={onUpdateProfile}
            onLogout={onLogout}
            onTriggerBackup={onTriggerBackup}
            isBackingUp={isBackingUp}
            onClose={() => setActiveTab("chats")}
          />
        ) : activeTab === "summaries" ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in bg-sidebar-bg">
            <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0">
              <h1 className="text-sm font-bold font-sans tracking-wide text-zinc-100 uppercase">AI Summaries</h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed font-sans font-medium">
                Request automated summaries or translations from Google Gemini.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              <div className="p-4 bg-fuchsia-950/20 border border-fuchsia-900/40 rounded-2xl">
                <Sparkles className="w-5 h-5 text-fuchsia-400 mb-2 animate-pulse" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">How Summaries work</h3>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed font-sans">
                  Send DMs or hold messages to analyze. Our system filters transcripts with custom parameters to summarize your chat history automatically!
                </p>
              </div>
              <button 
                onClick={() => alert("Summary assist is loaded and active. Select any active chat thread to view summaries!")}
                className="w-full py-3 bg-[#8b46df] hover:bg-[#a25eff] text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer text-center"
              >
                Analyze Target Conversations
              </button>
            </div>
          </div>
        ) : activeTab === "documents" ? (
          <div className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in bg-sidebar-bg">
            <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0">
              <h1 className="text-sm font-bold font-sans tracking-wide text-zinc-100 uppercase">Shared Files</h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed font-sans font-medium">
                Track shared attachments and chat exports.
              </p>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 custom-scrollbar">
              <div className="p-4 bg-emerald-950/20 border border-emerald-900/30 rounded-2xl">
                <Folder className="w-5 h-5 text-emerald-400 mb-2" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wide">Secure Storage Space</h3>
                <p className="text-[11px] text-zinc-300 mt-1 leading-relaxed font-sans">
                  Files shared over discussion channels are logged locally inside Sandboxed IndexedDB space and backing storage.
                </p>
              </div>
              <div className="space-y-1.5 flex flex-col justify-start">
                <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest pl-1 font-mono">Recent Exports & actions</span>
                <button 
                  onClick={onTriggerBackup}
                  disabled={isBackingUp}
                  className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl flex items-center justify-between cursor-pointer transition-all text-left w-full"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                      <Folder className="w-4 h-4 text-pink-400" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-200">Export chat backups</span>
                      <span className="text-[9px] text-zinc-500 mt-0.5">{isBackingUp ? "Saving data..." : "Save JSON backup to Google Drive"}</span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* CHATS LIST - STANDARD CHATS RENDERED */
          <div className="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
            {/* User Info Header and Profile Card */}
            <div id="user-header-panel" className="p-6 flex items-center justify-between relative shrink-0">
              <div className="flex items-center gap-3">
                <div className="relative cursor-pointer group" onClick={() => setActiveTab("settings")} title="Click to view settings">
                  <img
                    id="user-avatar-image"
                    src={currentUser?.photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150"}
                    alt="User"
                    className="w-10 h-10 rounded-xl object-cover border-2 border-accent-purple group-hover:brightness-95 transition-all"
                    onError={(e) => {
                      (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                    }}
                  />
                  <span className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-sidebar-bg ${getStatusColor(currentUser?.status || "Online")}`} />
                </div>
                <div className="flex flex-col">
                  <h2 id="user-display-name" onClick={() => setActiveTab("settings")} className="text-sm font-semibold text-zinc-100 font-sans tracking-wide truncate max-w-[120px] cursor-pointer hover:underline text-white" title="Click to view settings">
                    {currentUser?.name || "Hrvoje Grubišić"}
                  </h2>
                  <div className="relative">
                    <button
                      id="user-status-dropdown-trigger"
                      onClick={() => setShowStatusDropdown(!showStatusDropdown)}
                      className="text-xs text-zinc-400/80 flex items-center gap-1 mt-0.5 hover:text-white transition-colors cursor-pointer font-medium"
                    >
                      <span>{currentUser?.status || "Online"}</span>
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    {showStatusDropdown && (
                      <div id="user-status-options" className="absolute left-0 mt-2 w-32 bg-[#2d2235] border border-[#3e2c4d] rounded-lg shadow-xl z-55 p-1">
                        {(["Online", "Very busy", "Away", "Offline"] as UserStatus[]).map((st) => (
                          <button
                            key={st}
                            onClick={() => {
                              onStatusChange(st);
                              setShowStatusDropdown(false);
                            }}
                            className="w-full text-left px-3 py-1.5 text-xs rounded hover:bg-[#3d2f47] text-zinc-300 hover:text-white transition-colors cursor-pointer flex items-center gap-2"
                          >
                            <span className={`w-2 h-2 rounded-full ${getStatusColor(st)}`} />
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div id="auth-actions" className="flex items-center gap-2">
                {currentUser && (
                  <button
                    id="sidebar-gear-edit-profile"
                    onClick={() => setActiveTab("settings")}
                    className="p-1.5 bg-[#2d2235] hover:bg-[#3d2f47] text-zinc-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Edit Profile Settings"
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                )}

                {currentUser?.email ? (
                  <div className="flex gap-1.5">
                    <button
                      id="drive-backup-btn"
                      onClick={onTriggerBackup}
                      disabled={isBackingUp}
                      className="p-1.5 bg-[#2d2235] hover:bg-[#3d2f47] text-zinc-400 hover:text-pink-400 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                      title="Export backup to Google Drive"
                    >
                      {isBackingUp ? (
                        <span className="w-4 h-4 block border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <svg className="w-4 h-4 fill-current text-zinc-300" viewBox="0 0 24 24">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM17 13l-5 5-5-5h3V9h4v4h3z"/>
                        </svg>
                      )}
                    </button>
                    <button
                      id="user-logout-btn"
                      onClick={onLogout}
                      className="p-1.5 bg-[#2d2235] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : currentUser ? (
                  <button
                    id="user-logout-btn"
                    onClick={onLogout}
                    className="p-1.5 bg-[#2d2235] hover:bg-rose-950/40 text-zinc-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                    title="Sign Out / Delete Local Account"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    id="google-login-btn"
                    onClick={onLogin}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#8c41f7] hover:bg-[#9d5bfa] text-white text-xs font-semibold rounded-lg shadow-md transition-all active:scale-95 cursor-pointer"
                    title="Backup your chats by signing in"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Backup</span>
                  </button>
                )}
              </div>
            </div>

            {/* Search Input Container */}
            <div id="search-bar-wrapper" className="px-6 pb-4 shrink-0">
              <div className="relative flex items-center">
                <Search className="w-4 h-4 absolute left-3.5 text-zinc-400/80" />
                <input
                  id="chat-filter-input"
                  type="text"
                  placeholder="Search contacts or @username..."
                  value={searchQuery}
                  onChange={(e) => onSearchQueryChange(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 text-sm text-zinc-200 placeholder-zinc-400/60 pl-10 pr-4 py-2 rounded-lg focus:border-accent-purple/80 focus:outline-none transition-all font-sans"
                />
              </div>
            </div>

            {/* Scroll list of active chats */}
            <div id="contact-scroll-list" className="flex-1 overflow-y-auto px-0 space-y-0.5 select-none custom-scrollbar min-h-0">
              {filteredContacts.map((contact) => {
                const isSelected = contact.id === activeContactId;
                return (
                  <div
                    id={`contact-item-${contact.id}`}
                    key={contact.id}
                    onClick={() => onSelectContact(contact.id)}
                    className={`flex items-center justify-between px-6 py-4 cursor-pointer transition-all ${
                      isSelected
                        ? "bg-sidebar-active border-l-3 border-accent-purple"
                        : "hover:bg-white/5 border-l-3 border-transparent"
                    }`}
                  >
                    <div className="flex items-center gap-3 truncate min-w-0">
                      <div className="relative shrink-0">
                        <img
                          src={contact.avatar}
                          alt={contact.name}
                          className="w-10 h-10 rounded-xl object-cover border-2 border-accent-purple"
                          onError={(e) => {
                            (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                          }}
                        />
                        <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-sidebar-bg ${getStatusColor(contact.status)}`} />
                      </div>

                      <div className="flex flex-col truncate">
                        <span className="text-sm font-semibold text-zinc-100 font-sans tracking-wide">
                          {contact.name}
                        </span>
                        
                        {contact.isTyping ? (
                          <span className="text-xs text-purple-400 font-mono tracking-wide italic mt-0.5 animate-pulse">
                            typing...
                          </span>
                        ) : contact.hasVideoCall ? (
                          <span className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1">
                            <Video className="w-3.5 h-3.5 shrink-0 text-violet-400" />
                            Video call
                          </span>
                        ) : contact.hasAttachment ? (
                          <span className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1 font-sans">
                            <Paperclip className="w-3 h-3 text-pink-400 shrink-0" />
                            Attachment
                          </span>
                        ) : (
                          <span className="text-xs text-zinc-400/80 truncate mt-0.5 font-sans leading-relaxed">
                            {contact.lastMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end shrink-0 gap-1.5 pl-2 animate-fade-in">
                      <span className="text-[10px] text-zinc-400/60 font-medium font-sans">
                        {contact.lastTimestamp}
                      </span>
                      {contact.unreadCount > 0 && (
                        <span className="px-1.5 py-0.5 bg-badge-pink text-[10px] text-white font-bold rounded-lg min-w-5 h-5 flex items-center justify-center animate-bounce shadow-md">
                          {contact.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Global search results from lookup lists */}
              {searchQuery.trim().length > 0 && globalSearchResults.length > 0 && (
                <div className="space-y-1 py-3 border-t border-white/5 mt-4 min-w-0">
                  <div className="px-6 pb-2 text-[10px] font-bold tracking-wider text-[#a066eb] font-sans uppercase">
                    Global Users (Search Results)
                  </div>
                  {globalSearchResults
                    .filter((u) => u.uid !== currentUser?.uid && !contacts.some((c) => c.id === u.uid))
                    .map((u) => (
                      <div
                        id={`search-result-${u.uid}`}
                        key={u.uid}
                        onClick={() => onStartSearchChat(u)}
                        className="flex items-center justify-between px-6 py-3 cursor-pointer hover:bg-white/5 transition-colors border-l-3 border-transparent"
                      >
                        <div className="flex items-center gap-3 truncate min-w-0">
                          <div className="relative shrink-0">
                            <img
                              src={u.photoURL}
                              alt={u.name}
                              className="w-10 h-10 rounded-xl object-cover border-2 border-[#8b46df]"
                              onError={(e) => {
                                (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                              }}
                            />
                            <span className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-sidebar-bg ${getStatusColor(u.status)}`} />
                          </div>
                          <div className="flex flex-col truncate">
                            <span className="text-sm font-semibold text-zinc-100 font-sans">
                              {u.name}
                            </span>
                            <span className="text-xs text-purple-400 font-sans font-medium">
                              @{u.username}
                            </span>
                          </div>
                        </div>
                        <button className="text-xs text-[#ebdffd] font-semibold bg-accent-purple/25 hover:bg-accent-purple/40 border border-accent-purple/35 px-2.5 py-1 rounded-md transition-all cursor-pointer">
                          Chat
                        </button>
                      </div>
                    ))}
                </div>
              )}

              {filteredContacts.length === 0 && searchQuery.trim().length === 0 && (
                <div className="text-center text-zinc-500 py-8 text-xs font-sans">
                  No active chats found
                </div>
              )}

              {filteredContacts.length === 0 && searchQuery.trim().length > 0 && globalSearchResults.filter((u) => u.uid !== currentUser?.uid && !contacts.some((c) => c.id === u.uid)).length === 0 && (
                <div className="text-center text-zinc-500 py-8 text-xs font-sans">
                  No contacts or users match "{searchQuery}"
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modern interactive bottom tab navigations representing Screen 1 bottom of the layout! */}
      <div id="sidebar-bottom-nav" className="h-16 shrink-0 border-t border-white/5 px-2 flex items-center justify-between bg-sidebar-bg font-sans z-30">
        <button 
          id="nav-btn-chats" 
          onClick={() => setActiveTab("chats")}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === "chats" ? "text-accent-purple font-semibold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Chats</span>
        </button>
        <button 
          id="nav-btn-summaries" 
          onClick={() => setActiveTab("summaries")}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === "summaries" ? "text-accent-purple font-semibold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Sparkles className="w-5 h-5 text-fuchsia-400" />
          <span className="text-[10px] font-medium mt-1">Summaries</span>
        </button>
        <button 
          id="nav-btn-documents" 
          onClick={() => setActiveTab("documents")}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === "documents" ? "text-accent-purple font-semibold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Folder className="w-5 h-5 text-emerald-400" />
          <span className="text-[10px] font-medium mt-1">Documents</span>
        </button>
        <button 
          id="nav-btn-settings" 
          onClick={() => setActiveTab("settings")}
          className={`flex flex-col items-center justify-center flex-1 py-1.5 transition-colors cursor-pointer ${
            activeTab === "settings" ? "text-accent-purple font-semibold" : "text-zinc-500 hover:text-zinc-300"
          }`}
        >
          <Settings className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Settings</span>
        </button>
      </div>
    </div>
  );
}
