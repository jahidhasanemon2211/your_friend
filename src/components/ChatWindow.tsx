import React, { useState, useRef, useEffect } from "react";
import { Phone, Video, Settings, UserPlus, Paperclip, Smile, Play, Pause, Send, FileText, CheckCheck, Check, ChevronLeft, Loader2, Image as ImageIcon } from "lucide-react";
import { Message, Contact, MessageType } from "../types";

interface ChatWindowProps {
  contact: Contact | null;
  messages: Message[];
  onSendMessage: (content: string, type: MessageType, fileMetadata?: { fileName: string; fileData: string; fileSize: string }) => void;
  otherUserTyping: boolean;
  onSendTyping: (isTyping: boolean) => void;
  onBack: () => void;
  showChatMobile: boolean;
}

export default function ChatWindow({
  contact,
  messages,
  onSendMessage,
  otherUserTyping,
  onSendTyping,
  onBack,
  showChatMobile,
}: ChatWindowProps) {
  const [inputText, setInputText] = useState("");
  const [showEmojiDrawer, setShowEmojiDrawer] = useState(false);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const [voicePlaybackProgress, setVoicePlaybackProgress] = useState(30); // Percentage
  const [voicePlaybackTime, setVoicePlaybackTime] = useState("00:46"); // Starts from some midpoint or progresses
  const [isUploading, setIsUploading] = useState(false);
  
  // Custom states for dialog tooltips and call simulation
  const [ongoingCall, setOngoingCall] = useState<"audio" | "video" | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, otherUserTyping]);

  // Voice note mock playback effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingVoice) {
      interval = setInterval(() => {
        setVoicePlaybackProgress((prev) => {
          if (prev >= 100) {
            setIsPlayingVoice(false);
            setVoicePlaybackTime("01:18");
            return 100;
          }
          const next = prev + 1.5;
          // Calculate minutes/seconds
          const totalSeconds = 78; // 1:18 total
          const currentSeconds = Math.floor((next / 100) * totalSeconds);
          const mins = Math.floor(currentSeconds / 60);
          const secs = currentSeconds % 60;
          setVoicePlaybackTime(`0${mins}:${secs < 10 ? '0' : ''}${secs}`);
          return next;
        });
      }, 250);
    }
    return () => clearInterval(interval);
  }, [isPlayingVoice]);

  // Handles text change & typing state propagation
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    // Send typing status to server
    onSendTyping(true);

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(() => {
      onSendTyping(false);
    }, 2000); // 2 second typing debounce
  };

  const handleSend = () => {
    if (!inputText.trim()) return;
    onSendMessage(inputText, "text");
    setInputText("");
    onSendTyping(false);
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  // Convert uploaded attachment into client-readable payload (Base64 is fully offline-resistant and PWA friendly!)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileData = event.target?.result as string;
        if (fileData) {
          const sizeKb = (file.size / 1024).toFixed(1);
          const sizeStr = parseFloat(sizeKb) > 1024 
            ? (parseFloat(sizeKb) / 1024).toFixed(1) + " MB" 
            : sizeKb + " KB";
          
          // Send as file message
          onSendMessage(file.name, "file", {
            fileName: file.name,
            fileData: fileData,
            fileSize: sizeStr
          });
        }
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Failed to read file:", err);
      setIsUploading(false);
    }
  };

  const handleEmojiSelect = (emoji: string) => {
    setInputText((prev) => prev + emoji);
    setShowEmojiDrawer(false);
  };

  const sampleEmojis = ["😃", "😂", "👍", "🔥", "❤️", "😮", "🙌", "🎉", "🦊", "🎨"];

  if (!contact) {
    return (
      <div 
        id="no-chat-fallback" 
        className={`flex-1 bg-chat-bg flex flex-col items-center justify-center p-8 select-none transition-all duration-300 ${
          showChatMobile ? "flex" : "hidden md:flex"
        }`}
      >
        <div className="w-20 h-20 rounded-2xl bg-indigo-50 flex items-center justify-center text-accent-purple mb-4 animate-[bounce_2s_infinite]">
          <MessageSquareIcon className="w-10 h-10 text-accent-purple" />
        </div>
        <p className="text-sm text-zinc-500 font-sans tracking-wide">
          Select a conversation inside the sidebar to begin chatting.
        </p>
      </div>
    );
  }

  return (
    <div 
      id="active-chat-window" 
      className={`flex-1 bg-chat-bg flex flex-col h-full overflow-hidden relative transition-all duration-300 ${
        showChatMobile ? "flex" : "hidden md:flex"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,application/pdf,audio/*"
      />

      {/* Top Header Card (88px height, px-8 padding) */}
      <div id="chat-header-bar" className="h-[88px] shrink-0 bg-white border-b border-black/5 px-4 md:px-8 flex items-center justify-between select-none shadow-[0_1px_3px_0_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Responsive Back Button for mobile view toggle */}
          <button
            id="chat-header-back-btn"
            onClick={onBack}
            className="md:hidden p-1 bg-zinc-50 hover:bg-zinc-100 rounded-lg text-zinc-600 transition-colors mr-1 shrink-0 cursor-pointer"
            title="Go back to chat list"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>

          <div className="flex -space-x-2 mr-1 shrink-0">
            {/* Geometric grouped overlapping avatars */}
            <div className="w-8 h-8 rounded-full border-2 border-white bg-violet-600 overflow-hidden shadow-sm">
              <img
                src={contact.avatar}
                alt={contact.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-8 h-8 rounded-full border-2 border-white bg-pink-500 overflow-hidden shadow-sm">
              <img
                src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
                alt="Secondary participant"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center border-2 border-white text-rose-500 text-[10px] font-bold shadow-sm">
              +1
            </div>
          </div>
          
          <div className="flex flex-col ml-1 min-w-0 truncate">
            <h1 id="active-chat-title" className="text-sm md:text-base font-bold text-text-dark tracking-wide font-sans leading-none truncate pr-2">
              {contact.id === "design-talk" ? "Design Talk" : contact.name}
            </h1>
            <span className="text-[10px] md:text-[11px] text-zinc-400 mt-1 md:mt-1.5 font-sans font-medium truncate">
              {otherUserTyping ? `${contact.name} is typing...` : `${contact.name} • Active now`}
            </span>
          </div>
        </div>

        {/* Header Action Tools - Fully functional now */}
        <div id="chat-header-controls" className="flex items-center gap-3.5 md:gap-5 text-zinc-400 shrink-0">
          <button 
            className="hover:text-accent-purple transition-colors cursor-pointer p-1 rounded hover:bg-zinc-50" 
            onClick={() => alert(`Direct conversation with ${contact.name} is secure and private.`)}
            title="Conversation Safety Protocol"
          >
            <UserPlus className="w-5 h-5 md:w-5.25 md:h-5.25" />
          </button>
          <button 
            className="hover:text-accent-purple transition-colors cursor-pointer p-1 rounded hover:bg-zinc-50" 
            onClick={() => setOngoingCall("video")}
            title="Start video call with participant"
          >
            <Video className="w-5 h-5 md:w-5.25 md:h-5.25" />
          </button>
          <button 
            className="hover:text-accent-purple transition-colors cursor-pointer p-1 rounded hover:bg-zinc-50" 
            onClick={() => alert(`Details:\nUser: ${contact.name}\nUsername: @${contact.username || contact.id}\nPresence Status: ${contact.status}`)}
            title="Contact attributes info"
          >
            <Settings className="w-5 h-5 md:w-5.25 md:h-5.25" />
          </button>
        </div>
      </div>

      {/* Simulated Call Overlay Panel */}
      {ongoingCall && (
        <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-md flex flex-col items-center justify-center z-50 p-6 select-all animate-fade-in text-white text-center">
          <div className="relative mb-6">
            <img 
              src={contact.avatar} 
              alt={contact.name} 
              className="w-24 h-24 rounded-full border-4 border-accent-purple object-cover shadow-2xl animate-pulse" 
            />
            <div className="absolute top-0 right-0 w-6 h-6 rounded-full bg-red-500 border-2 border-white animate-bounce" />
          </div>
          <h3 className="text-xl font-bold font-sans tracking-wide">{contact.name}</h3>
          <p className="text-xs text-zinc-400 font-mono tracking-widest mt-1.5 uppercase">
            Simulated {ongoingCall} Calling...
          </p>

          <div className="mt-8 flex gap-4 min-w-[200px] justify-center">
            <button 
              onClick={() => alert("Connecting simulated audio stream...")} 
              className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all text-white rounded-lg cursor-pointer"
            >
              Answer
            </button>
            <button 
              onClick={() => setOngoingCall(null)} 
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 hover:scale-105 active:scale-95 transition-all text-white rounded-lg cursor-pointer"
            >
              Hang up
            </button>
          </div>
        </div>
      )}

      {/* Scrollable Message Panel Body */}
      <div id="messages-scroll-panel" className="flex-1 overflow-y-auto p-4 md:p-8 flex flex-col gap-6 custom-scrollbar bg-chat-bg">
        {messages.map((message) => {
          // If the message is from any other user besides 'hrvoje' it's categorized beautifully
          const isMe = message.senderId !== contact.id && message.recipientId !== "design-talk";
          const isMeByUID = message.senderId === "hrvoje" || message.senderName.includes("Hrvoje") || (!isMe && message.senderId !== contact.id);
          
          return (
            <div
              id={`msg-bubble-${message.id}`}
              key={message.id}
              className={`flex items-end gap-2.5 md:gap-3 max-w-[85%] md:max-w-[70%] ${
                isMeByUID ? "ml-auto flex-row-reverse" : "mr-auto"
              }`}
            >
              {/* Sender Avatar */}
              <img
                src={message.senderAvatar}
                alt={message.senderName}
                className="w-7 h-7 md:w-8 md:h-8 rounded-xl object-cover border-2 border-accent-purple shadow-[0_1px_3px_rgba(0,0,0,0.06)] shrink-0"
              />

              <div className="flex flex-col">
                {/* Meta details (Name & Timestamp) */}
                <span className={`text-[10px] text-zinc-400/80 mb-1 font-sans font-medium ${isMeByUID ? "text-right" : "text-left"}`}>
                  {!isMeByUID && `${message.senderName} • `}{message.timestamp}
                </span>

                {/* Bubble contents depending on type (Text, Voice, File) */}
                {message.type === "text" && (
                  <div
                    className={`px-4.5 py-3.5 rounded-[18px] shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${
                      isMeByUID
                        ? "bg-accent-purple text-white rounded-br-[4px]"
                        : "bg-white text-text-dark rounded-bl-[4px] border border-black/5"
                    }`}
                  >
                    <p className="text-sm font-sans leading-relaxed break-words">{message.content}</p>
                  </div>
                )}

                {message.type === "voice" && (
                  <div
                    className={`px-4.5 py-3.5 rounded-[18px] shadow-[0_2px_4px_rgba(0,0,0,0.02)] ${
                      isMeByUID
                        ? "bg-accent-purple text-white rounded-br-[4px]"
                        : "bg-white text-text-dark rounded-bl-[4px] border border-black/5"
                    }`}
                  >
                    <div className="audio-msg flex items-center gap-3 min-width-[200px] md:min-width-[240px]">
                      {/* Voice Card Play/Pause Controls */}
                      <button
                        onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                        className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors cursor-pointer shrink-0 ${
                          isMeByUID 
                            ? "bg-white/20 text-white hover:bg-white/30" 
                            : "bg-[#f2e9fc] text-accent-purple hover:bg-[#ebdffd]"
                        }`}
                      >
                        {isPlayingVoice ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current" />}
                      </button>

                      {/* Timeline Slider Waveform */}
                      <div className="flex-1 flex flex-col gap-1 select-none">
                        <div className={`h-1 w-24 md:w-32 rounded-full relative overflow-hidden ${isMeByUID ? "bg-white/30" : "bg-black/10"}`}>
                          <div
                            className={`absolute h-full rounded-full transition-all ${isMeByUID ? "bg-white" : "bg-accent-purple"}`}
                            style={{ width: `${voicePlaybackProgress}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-[11px] font-mono leading-none opacity-85 shrink-0">
                        {voicePlaybackTime}
                      </span>
                    </div>
                  </div>
                )}

                {message.type === "file" && (
                  <div
                    className={`p-1 rounded-[18px] ${
                      isMeByUID 
                        ? "bg-accent-purple text-white rounded-br-[4px]" 
                        : "bg-white text-text-dark rounded-bl-[4px] border border-black/5 shadow-[0_2px_4px_rgba(0,0,0,0.02)]"
                    }`}
                  >
                    <div className="file-msg flex items-center gap-3 p-2.5 rounded-[10px]">
                      <div className="bg-accent-purple text-white p-2.5 rounded-[6px] shrink-0">
                        <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                          <path d="M14 2v6h6"/>
                        </svg>
                      </div>
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="text-xs font-semibold truncate leading-tight font-sans">
                          {message.fileName || message.content}
                        </span>
                        <span className={`text-[10px] mt-0.5 opacity-70`}>
                          {message.fileSize || "2.4 MB"} • Document
                        </span>
                      </div>
                      <a
                        href={message.fileUrl || "#"}
                        download={message.fileName || "attachment"}
                        onClick={(e) => {
                          if (!message.fileUrl) e.preventDefault();
                        }}
                        className={`text-xs select-none pr-1.5 hover:underline font-semibold ${isMeByUID ? "text-white" : "text-accent-purple"}`}
                      >
                        Download
                      </a>
                    </div>
                  </div>
                )}

                {/* REAL-TIME TICK-MARKS: 'sent' to 'delivered' to 'seen' */}
                {isMeByUID && (
                  <div className="flex items-center justify-end gap-1 mt-1 font-sans select-none">
                    {message.isOffline ? (
                      <span className="text-[9px] text-amber-500 font-medium italic">Pending Sync</span>
                    ) : (
                      <div className="flex items-center gap-1 font-sans leading-none">
                        <span className="text-[9px] text-[#2ebd59] font-medium leading-none">
                          {message.status === "seen" ? "Seen" : message.status === "delivered" ? "Delivered" : "Sent"}
                        </span>
                        {message.status === "seen" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-[#2eacf6e0] leading-none" title="Seen by recipient" />
                        ) : message.status === "delivered" ? (
                          <CheckCheck className="w-3.5 h-3.5 text-zinc-400 leading-none" title="Delivered to recipient" />
                        ) : (
                          <Check className="w-3.5 h-3.5 text-zinc-400 leading-none" title="Sent by machine" />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Dynamic Typing anim dot bubbles (Mockup item 2) */}
        {otherUserTyping && (
          <div id="typing-bubble-container" className="flex items-end gap-3 mr-auto max-w-[70%] select-none">
            <img
              src={contact.avatar}
              alt={contact.name}
              className="w-8 h-8 rounded-xl object-cover border-2 border-accent-purple shadow-[0_1px_3px_rgba(0,0,0,0.06)]"
            />
            <div className="flex flex-col">
              <span className="text-[10px] text-zinc-400 mb-1 font-sans text-left">
                {contact.name}
              </span>
              <div className="p-3.5 bg-white border border-black/5 shadow-[0_2px_4px_rgba(0,0,0,0.02)] rounded-[18px] rounded-bl-[4px] flex items-center justify-center gap-1.5 h-11 w-16">
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-[bounce_1s_infinite_0s]" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-[bounce_1s_infinite_0.2s]" />
                <span className="w-2 h-2 rounded-full bg-zinc-400 animate-[bounce_1s_infinite_0.4s]" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Floating Upload Indicator */}
      {isUploading && (
        <div className="absolute top-[96px] right-6 p-4 bg-white/90 backdrop-blur border border-black/5 rounded-xl flex items-center gap-3 shadow-md z-20">
          <Loader2 className="w-5 h-5 text-accent-purple animate-spin" />
          <span className="text-xs text-gray-700 font-sans">Processing file upload...</span>
        </div>
      )}

      {/* Message Composition Panel Input Area */}
      <div id="message-compose-bar" className="h-[100px] shrink-0 px-4 md:px-8 flex items-center bg-white border-t border-black/5 relative select-none">
        {/* Mock Emoji Drawer */}
        {showEmojiDrawer && (
          <div id="emoji-drawer-panel" className="absolute bottom-24 right-8 bg-white border border-zinc-200 rounded-2xl shadow-xl p-3 grid grid-cols-5 gap-2 z-50">
            {sampleEmojis.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleEmojiSelect(emoji)}
                className="w-8 h-8 flex items-center justify-center text-lg hover:bg-zinc-50 rounded transition-colors cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div id="text-input-field" className="w-full flex items-center gap-3 md:gap-4">
          <div className="flex-1 flex items-center bg-chat-bg rounded-[24px] px-4 md:px-6 py-1 select-all relative">
            <input
              id="chat-text-input"
              type="text"
              placeholder="Write a message here..."
              value={inputText}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              className="w-full bg-transparent text-sm text-text-dark placeholder-[#888888] py-2.5 focus:outline-none font-sans"
            />
            
            {/* Inner action clip-on icons */}
            <div className="flex items-center gap-2 md:gap-3 text-zinc-400 font-sans">
              <button
                id="attachment-trigger-btn"
                onClick={triggerFileSelect}
                className="hover:text-accent-purple hover:scale-105 active:scale-95 transition-all cursor-pointer p-1"
                title="Attach Document or Image"
              >
                <Paperclip className="w-4.5 h-4.5 md:w-5 md:h-5" />
              </button>
              <button
                id="emoji-trigger-btn"
                onClick={() => setShowEmojiDrawer(!showEmojiDrawer)}
                className="hover:text-[#666] hover:scale-105 active:scale-95 transition-all cursor-pointer p-1"
                title="Add Emoji"
              >
                <Smile className="w-4.5 h-4.5 md:w-5 md:h-5" />
              </button>
            </div>
          </div>

          <button
            id="send-message-btn"
            onClick={handleSend}
            disabled={!inputText.trim()}
            className="w-11 h-11 bg-accent-purple hover:bg-accent-purple/90 disabled:bg-chat-bg disabled:text-zinc-300 text-white flex items-center justify-center rounded-[12px] shadow-sm transition-all active:scale-95 shrink-0 cursor-pointer"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Simple Helper component
function MessageSquareIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
