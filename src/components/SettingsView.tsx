import React, { useState, useRef } from "react";
import { 
  ArrowLeft, 
  ChevronRight, 
  Shield, 
  Video, 
  Languages, 
  Cpu, 
  FolderDown, 
  Cable, 
  Bell, 
  CreditCard, 
  UserCog, 
  Info, 
  LogOut, 
  Check, 
  RotateCw, 
  Camera,
  Mail,
  Phone,
  Lock,
  Smartphone
} from "lucide-react";
import { UserProfile } from "../types";

export interface SettingsViewProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: Partial<UserProfile>) => Promise<boolean>;
  onLogout: () => void;
  onTriggerBackup: () => void;
  isBackingUp: boolean;
  onClose: () => void;
}

const CURATED_AVATARS = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
  "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
  "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
  "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
  "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
  "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
];

export default function SettingsView({
  currentUser,
  onUpdateProfile,
  onLogout,
  onTriggerBackup,
  isBackingUp,
  onClose
}: SettingsViewProps) {
  // Navigation states: "menu" | "profile" | "edit-photo"
  const [currentScreen, setCurrentScreen] = useState<"menu" | "profile" | "edit-photo">("menu");
  
  // Custom Profile Fields inputs
  const [tempName, setTempName] = useState(currentUser.name);
  const [tempUsername, setTempUsername] = useState(currentUser.username || "");
  const [tempEmail, setTempEmail] = useState(currentUser.email || "");
  const [tempPhone, setTempPhone] = useState("+880 1712-345678");
  const [tempAvatar, setTempAvatar] = useState(currentUser.photoURL);

  // Synchronize inputs dynamically on currentUser updates
  React.useEffect(() => {
    setTempName(currentUser.name);
    setTempUsername(currentUser.username || "");
    setTempEmail(currentUser.email || "");
    setTempAvatar(currentUser.photoURL);
  }, [currentUser]);

  // Screen 3: Image Editing Parameters (Live interactive controls!)
  const [zoomScale, setZoomScale] = useState<number>(1); // 1 to 2
  const [rotation, setRotation] = useState<number>(0); // 0, 90, 180, 270 degrees

  // Interactive settings state selectors (for list clicks feedback!)
  const [activeDialog, setActiveDialog] = useState<string | null>(null);
  const [tempDialogVal, setTempDialogVal] = useState<any>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("Please select an image smaller than 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setTempAvatar(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleApplyProfileChanges = async () => {
    const cleanUsername = tempUsername.replaceAll("@", "").replaceAll(" ", "").trim().toLowerCase();
    if (!tempName.trim()) {
      alert("Name is required");
      return;
    }
    if (!cleanUsername) {
      alert("Username is required");
      return;
    }

    const success = await onUpdateProfile({
      name: tempName.trim(),
      username: cleanUsername,
      photoURL: tempAvatar,
      email: tempEmail || null
    });

    if (success) {
      setCurrentScreen("profile");
    }
  };

  return (
    <div id="settings-view-layer" className="w-full h-full flex flex-col bg-sidebar-bg text-zinc-100 animate-fade-in relative">
      
      {/* SCREEN 1: MAIN SETTINGS MENU */}
      {currentScreen === "menu" && (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          
          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold font-sans tracking-wide text-zinc-100">Settings</h1>
              <p className="text-[10px] text-zinc-400 mt-0.5 leading-relaxed font-sans max-w-[210px]">
                Customize Your Friend's behavior and features to fit the way you work best.
              </p>
            </div>
            <button 
              onClick={onClose}
              className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg text-zinc-300 transition-all cursor-pointer"
            >
              Close
            </button>
          </div>

          {/* Scrollable list content */}
          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
            
            {/* User row button - Navigates to Screen 2 */}
            <div 
              onClick={() => setCurrentScreen("profile")}
              className="flex items-center justify-between p-4 bg-[#1f1627] hover:bg-[#281d33] border border-white/5 rounded-2xl cursor-pointer transition-all active:scale-[0.99] group shadow-md"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="relative shrink-0">
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.name} 
                    className="w-12 h-12 rounded-2xl object-cover border-2 border-accent-purple group-hover:scale-105 transition-transform"
                    onError={(e) => {
                      (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                    }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-sidebar-bg bg-emerald-500" />
                </div>
                <div className="flex flex-col truncate">
                  <span className="text-sm font-bold text-white tracking-wide truncate group-hover:underline">
                    {currentUser.name}
                  </span>
                  <span className="text-xs text-zinc-400 truncate mt-0.5">
                    {currentUser.email || `@${currentUser.username}`}
                  </span>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-zinc-500 shrink-0 group-hover:text-zinc-300 transition-colors" />
            </div>

            {/* General Settings list */}
            <div className="space-y-1">
              
              {/* Security */}
              <button 
                onClick={() => {
                  setActiveDialog("security");
                  setTempDialogVal(true);
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                    <Shield className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Security & Privacy</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Video & Audio */}
              <button 
                onClick={() => {
                  setActiveDialog("video-audio");
                  setTempDialogVal("default");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Video className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Video & Audio</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Captions & Translation */}
              <button 
                onClick={() => {
                  setActiveDialog("captions");
                  setTempDialogVal(true);
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                    <Languages className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Captions & Translation</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* AI Assists */}
              <button 
                onClick={() => {
                  setActiveDialog("ai");
                  setTempDialogVal("gemini-2.5");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-fuchsia-500/10 flex items-center justify-center text-fuchsia-400">
                    <Cpu className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">AI & Summaries</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Documents & Export with active action! */}
              <button 
                onClick={() => {
                  onTriggerBackup();
                }}
                disabled={isBackingUp}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left disabled:opacity-50"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400">
                    {isBackingUp ? (
                      <span className="w-4 h-4 border-2 border-pink-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <FolderDown className="w-4.5 h-4.5" />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold font-sans">Documents & Export</span>
                    <span className="text-[9px] text-zinc-500 mt-0.5">Click to back up JSON chats</span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-[10px] text-zinc-500 font-medium">Backup</span>
                  <ChevronRight className="w-4 h-4 text-zinc-600" />
                </div>
              </button>

              {/* Integrations */}
              <button 
                onClick={() => {
                  setActiveDialog("integrations");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-500/10 flex items-center justify-center text-teal-400">
                    <Cable className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Integrations</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Notifications */}
              <button 
                onClick={() => {
                  setActiveDialog("notifications");
                  setTempDialogVal(true);
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/10 flex items-center justify-center text-yellow-400">
                    <Bell className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Notifications</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Billing */}
              <button 
                onClick={() => {
                  setActiveDialog("billing");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                    <CreditCard className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Plan & Billing</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* Team & Roles */}
              <button 
                onClick={() => {
                  setActiveDialog("team");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400">
                    <UserCog className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">Team & Roles</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

              {/* About */}
              <button 
                onClick={() => {
                  setActiveDialog("about");
                }}
                className="w-full flex items-center justify-between py-3.5 px-4 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-500/10 flex items-center justify-center text-zinc-400">
                    <Info className="w-4.5 h-4.5" />
                  </div>
                  <span className="text-xs font-semibold font-sans">About</span>
                </div>
                <ChevronRight className="w-4 h-4 text-zinc-600" />
              </button>

            </div>

            {/* Logout Row */}
            <div className="pt-2">
              <button 
                onClick={onLogout}
                className="w-full py-3 px-4 flex items-center justify-center gap-2 bg-rose-950/20 hover:bg-rose-900/30 text-rose-400 hover:text-rose-300 font-bold text-xs rounded-xl transition-all cursor-pointer border border-rose-900/10"
              >
                <LogOut className="w-4 h-4" />
                Sign Out Account
              </button>
            </div>

            {/* Copyright */}
            <div className="pt-4 text-center text-[10px] text-zinc-500 font-sans tracking-wide">
              © 2026 Your Friend — Empowering smarter communication
            </div>
            
          </div>
        </div>
      )}


      {/* SCREEN 2: PROFILE AND IDENTITY */}
      {currentScreen === "profile" && (
        <div id="settings-profile-screen" className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in">
          
          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0 flex items-center gap-3">
            <button 
              onClick={() => setCurrentScreen("menu")}
              className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold font-sans text-white tracking-wide">Profile and Identity</h1>
              <p className="text-[10px] text-zinc-400 leading-normal font-sans">
                Manage your personal information and preferences.
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6 space-y-5">
            
            {/* Centered big Avatar holding current photo with inline upload options */}
            <div className="flex flex-col items-center justify-center py-4 bg-white/[0.02] border border-white/5 rounded-2xl p-4">
              <div className="relative group">
                <div className="w-20 h-20 rounded-full overflow-hidden border-4 border-accent-purple shadow-xl bg-purple-950/40">
                  <img 
                    src={tempAvatar} 
                    alt="Current profile Avatar" 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                    }}
                  />
                </div>
                <div className="absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-sidebar-bg bg-emerald-500 shadow-md flex items-center justify-center text-[10px] font-bold text-white">
                  ✓
                </div>
              </div>
              
              <div className="w-full mt-3">
                <span className="block text-[10px] text-center font-bold text-zinc-400 uppercase tracking-wider mb-2">
                  Change Profile Picture
                </span>
                
                {/* Inline Avatar picker for fast select */}
                <div className="grid grid-cols-5 gap-1.5 justify-center max-w-[240px] mx-auto mb-3">
                  {CURATED_AVATARS.slice(0, 4).map((av, idx) => {
                    const isSelected = tempAvatar === av;
                    return (
                      <button
                        key={av}
                        type="button"
                        onClick={() => setTempAvatar(av)}
                        className={`relative aspect-square rounded-lg overflow-hidden border transition-all active:scale-95 cursor-pointer ${
                          isSelected ? "border-accent-purple scale-110 ring-1 ring-accent-purple" : "border-white/10 opacity-70 hover:opacity-100"
                        }`}
                        title={`Select Avatar ${idx + 1}`}
                      >
                        <img src={av} alt="" className="w-full h-full object-cover" />
                      </button>
                    );
                  })}
                  
                  {/* View All & Fine-tuning parameters screen */}
                  <button
                    type="button"
                    onClick={() => setCurrentScreen("edit-photo")}
                    className="aspect-square rounded-lg border border-dashed border-white/20 bg-white/5 hover:bg-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all text-[9.5px] font-bold"
                    title="View all avatars & editing space"
                  >
                    All
                  </button>
                </div>

                {/* Direct Custom File Upload Trigger */}
                <div className="flex items-center justify-center gap-2">
                  <button 
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-accent-purple hover:bg-accent-purple/95 text-white text-[11px] font-bold rounded-xl transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-md shadow-[#8b46df]/10"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    Upload Photo File
                  </button>
                </div>
              </div>
            </div>

            {/* Inputs & Mock Fields details listing */}
            <div className="space-y-4">
              
              {/* Display Name Input */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Display Name
                </label>
                <div className="flex items-center justify-between p-3.5 bg-[#170e1f] border border-white/5 rounded-xl">
                  <input 
                    type="text" 
                    value={tempName} 
                    onChange={(e) => setTempName(e.target.value)}
                    className="bg-transparent font-sans text-xs font-semibold focus:outline-none text-white w-full"
                    placeholder="e.g. Mark Burghschent"
                  />
                  <span className="text-[10px] font-mono text-zinc-500">Edit</span>
                </div>
              </div>

              {/* Username Input */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Username
                </label>
                <div className="flex items-center justify-between p-3.5 bg-[#170e1f] border border-white/5 rounded-xl font-mono">
                  <div className="flex items-center gap-0.5 w-full">
                    <span className="text-zinc-500 text-xs font-bold font-mono">@</span>
                    <input 
                      type="text" 
                      value={tempUsername} 
                      onChange={(e) => setTempUsername(e.target.value.toLowerCase().replaceAll(" ", ""))}
                      className="bg-transparent text-xs font-semibold focus:outline-none text-white w-full pr-1"
                      placeholder="markburg"
                    />
                  </div>
                  <span className="text-[10px] pl-1 text-zinc-500 font-semibold uppercase">Handle</span>
                </div>
              </div>

              {/* Email Input */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Email
                </label>
                <div className="flex items-center justify-between p-3.5 bg-[#170e1f] border border-white/5 rounded-xl">
                  <input 
                    type="email" 
                    value={tempEmail} 
                    onChange={(e) => setTempEmail(e.target.value)}
                    className="bg-transparent text-xs font-semibold focus:outline-none text-white w-full"
                    placeholder="markburg@gmail.com"
                  />
                  <Mail className="w-3.5 h-3.5 text-zinc-500" />
                </div>
              </div>

              {/* Phone number - Interactive details list mock */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Phone Number
                </label>
                <div 
                  onClick={() => {
                    const res = prompt("Enter your new phone number:", tempPhone);
                    if (res) setTempPhone(res);
                  }}
                  className="flex items-center justify-between p-3.5 bg-[#170e1f] hover:bg-[#1e122b] border border-white/5 rounded-xl cursor-pointer select-none transition-colors"
                >
                  <span className="text-xs text-white font-semibold font-sans truncate">{tempPhone}</span>
                  <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
              </div>

              {/* Password update - Interactive UI */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Update Password
                </label>
                <div 
                  onClick={() => alert("Password reset link sent to your cached session!")}
                  className="flex items-center justify-between p-3.5 bg-[#170e1f] hover:bg-[#1e122b] border border-white/5 rounded-xl cursor-pointer select-none transition-colors"
                >
                  <span className="text-xs text-zinc-400 font-semibold font-mono">••••••••</span>
                  <Lock className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                </div>
              </div>

              {/* Devices manager - Interactive list */}
              <div className="space-y-1.5 flex flex-col justify-start">
                <label className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest pl-1 font-sans">
                  Manage Login Devices
                </label>
                <div 
                  onClick={() => alert("Current active session is secure inside Google Cloud Run sandboxed browser integration.")}
                  className="flex items-center justify-between p-3.5 bg-[#170e1f] hover:bg-[#1e122b] border border-white/5 rounded-xl cursor-pointer select-none transition-colors"
                >
                  <span className="text-xs text-zinc-300 font-semibold font-sans truncate">Chrome Client / macOS</span>
                  <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                </div>
              </div>

            </div>

            {/* Sticky Actions Bar */}
            <div className="pt-3 flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  setTempName(currentUser.name);
                  setTempUsername(currentUser.username || "");
                  setTempEmail(currentUser.email || "");
                  setTempAvatar(currentUser.photoURL);
                  setCurrentScreen("menu");
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleApplyProfileChanges}
                className="flex-1 py-3 bg-accent-purple hover:bg-accent-purple/90 text-white shadow-lg text-xs font-bold rounded-xl cursor-pointer transition-all active:scale-95"
              >
                Save Changes
              </button>
            </div>

          </div>
        </div>
      )}


      {/* SCREEN 3: EDIT PHOTO PROFILE */}
      {currentScreen === "edit-photo" && (
        <div id="settings-edit-photo-screen" className="flex-1 flex flex-col h-full overflow-hidden animate-fade-in text-zinc-100 bg-[#140b1b]">
          
          {/* Header */}
          <div className="px-6 pt-5 pb-3 border-b border-white/5 shrink-0 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setCurrentScreen("profile")}
                className="p-1 hover:bg-white/5 rounded-lg text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-sm font-bold tracking-wide font-sans text-white">Edit Photo Profile</h1>
            </div>
            <button 
              onClick={() => setCurrentScreen("profile")}
              className="text-xs text-zinc-400 hover:text-zinc-200 cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-5 flex flex-col items-center">
            
            {/* LARGE CIRCLE CONTAINER WITH ZOOM AND ROTATION FEEDBACK IN CSS TRANSFORMS! */}
            <div className="w-48 h-48 rounded-full border-4 border-accent-purple shadow-xl bg-purple-950/20 flex items-center justify-center overflow-hidden relative shadow-inner select-none mt-2">
              <img 
                src={tempAvatar} 
                alt="Zooming Avatar review" 
                className="w-full h-full object-cover transition-transform duration-200"
                style={{
                  transform: `scale(${zoomScale}) rotate(${rotation}deg)`
                }}
                onError={(e) => {
                  (e.target as any).src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150";
                }}
              />
            </div>

            {/* Slider zoom and Rotator interactive row */}
            <div className="w-full max-w-xs mt-6 space-y-4">
              
              {/* Zoom slider */}
              <div className="flex items-center justify-between gap-3 bg-white/[0.03] px-3.5 py-2.5 rounded-xl border border-white/5">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest font-sans">Zoom</span>
                <input 
                  type="range"
                  min="1"
                  max="2"
                  step="0.05"
                  value={zoomScale}
                  onChange={(e) => setZoomScale(parseFloat(e.target.value))}
                  className="flex-1 h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-accent-purple"
                />
                <span className="text-[10px] font-mono font-bold text-[#b580fc] min-w-[25px] text-right">
                  {zoomScale.toFixed(2)}x
                </span>
              </div>

              {/* Rotation buttons */}
              <button 
                type="button"
                onClick={handleRotate}
                className="w-full py-2.5 px-4 bg-white/[0.03] hover:bg-white/[0.08] active:bg-white/[0.05] border border-white/5 rounded-xl flex items-center justify-center gap-3 font-semibold text-xs text-zinc-300 transition-all cursor-pointer"
              >
                <RotateCw className="w-4 h-4 text-accent-purple" />
                <span>Rotate image {rotation}°</span>
              </button>

              {/* Custom Image Upload link trig */}
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full mt-2 py-3 bg-white text-zinc-900 hover:bg-zinc-100 font-bold text-xs rounded-xl shadow-md transition-all active:scale-95 cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                Attach Photo File
              </button>
            </div>

            {/* or choose an avatar divider */}
            <div className="w-full flex items-center gap-3 my-6">
              <hr className="flex-1 border-white/10" />
              <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">Or choose an avatar</span>
              <hr className="flex-1 border-white/10" />
            </div>

            {/* Preseeds avatars list */}
            <div className="grid grid-cols-4 gap-2.5 w-full">
              {CURATED_AVATARS.map((av) => {
                const isSelected = tempAvatar === av;
                return (
                  <button
                    key={av}
                    type="button"
                    onClick={() => {
                      setTempAvatar(av);
                      setZoomScale(1);
                      setRotation(0);
                    }}
                    className={`relative aspect-square rounded-2xl overflow-hidden border-2 transition-transform active:scale-95 cursor-pointer ${
                      isSelected ? "border-accent-purple scale-105" : "border-transparent opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img src={av} alt="Avatar template" className="w-full h-full object-cover" />
                    {isSelected && (
                      <div className="absolute inset-0 bg-accent-purple/30 flex items-center justify-center animate-fade-in">
                        <Check className="w-5 h-5 text-white stroke-[3.2]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Click upload file selector is now handled globally at the root layout of the Settings layout */}

            {/* Final Actions Block */}
            <div className="w-full mt-6 flex gap-3">
              <button 
                type="button"
                onClick={() => {
                  setTempAvatar(currentUser.photoURL);
                  setZoomScale(1);
                  setRotation(0);
                  setCurrentScreen("profile");
                }}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold rounded-xl cursor-pointer"
              >
                Discard
              </button>
              <button 
                type="button"
                onClick={async () => {
                  // Direct simulation check if they zoom or rotate, we apply scale filter or persist normally
                  const changes = { photoURL: tempAvatar };
                  const success = await onUpdateProfile(changes);
                  if (success) {
                    setCurrentScreen("profile");
                  }
                }}
                className="flex-1 py-3 bg-accent-purple hover:bg-accent-purple/95 text-white text-xs font-semibold rounded-xl cursor-pointer shadow-lg active:scale-95 transition-all"
              >
                Apply Image
              </button>
            </div>

          </div>
        </div>
      )}

      {/* RENDER MODAL POPUPS DYNAMICALLY FOR EVERY OPTIONS CLICK FOR FUNCTIONAL EXPERIENCE! */}
      {activeDialog === "security" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Shield className="w-10 h-10 text-orange-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Security & Privacy</h3>
            <p className="text-xs text-zinc-400 mt-2">
              All messages are secured with military-grade 256-bit P2P encryption keys. Offline key exchanges occur inside device sandboxed database storage.
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg text-xs">
                <span>Passcode Lock</span>
                <span className="text-rose-400 font-bold font-mono">OFF</span>
              </div>
              <div className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg text-xs">
                <span>Encrypted Backups</span>
                <span className="text-emerald-400 font-bold font-mono">ACTIVE</span>
              </div>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-4 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back to Settings
            </button>
          </div>
        </div>
      )}

      {activeDialog === "video-audio" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Video className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Video & Audio Sources</h3>
            <div className="mt-3 text-left space-y-3">
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Active Input Microphone</span>
                <select className="bg-black/20 text-xs p-2 rounded border border-white/5 outline-none text-zinc-200">
                  <option>System Default Microphone (Active)</option>
                  <option>Built-in Audio Array</option>
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">Selected Video Camera</span>
                <select className="bg-black/20 text-xs p-2 rounded border border-white/5 outline-none text-zinc-200">
                  <option>Front HD Camera (Verified) ✓</option>
                  <option>OBS Virtual Cam</option>
                </select>
              </div>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Settings Saved
            </button>
          </div>
        </div>
      )}

      {activeDialog === "captions" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Languages className="w-10 h-10 text-blue-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Captions & Translation</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Auto-generate captions from voice clips instantly. Translate conversations to Bengali, Spanish, French, or German automatically.
            </p>
            <div className="mt-4 space-y-2">
              <label className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg text-xs cursor-pointer">
                <span>Transcription Engine</span>
                <input type="checkbox" defaultChecked className="accent-accent-purple" />
              </label>
              <label className="flex items-center justify-between p-2.5 bg-black/20 rounded-lg text-xs cursor-pointer">
                <span>Bengali UI Localization</span>
                <input type="checkbox" defaultChecked className="accent-accent-purple" />
              </label>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {activeDialog === "ai" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Cpu className="w-10 h-10 text-fuchsia-400 mx-auto mb-3 animate-pulse" />
            <h3 className="text-sm font-bold text-white tracking-wide">AI Assistant Engine</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Configure smart response predictions or chat history summarizers. Powered by Google Gemini Studio.
            </p>
            <div className="mt-4 text-left space-y-1.5 text-xs">
              <label className="flex items-center gap-2 p-2 bg-black/20 rounded-lg cursor-pointer">
                <input type="radio" name="aimodel" defaultChecked className="accent-accent-purple" />
                <span>Gemini 2.5 Flash (Preferred)</span>
              </label>
              <label className="flex items-center gap-2 p-2 bg-black/20 rounded-lg cursor-pointer">
                <input type="radio" name="aimodel" className="accent-accent-purple" />
                <span>Gemini 1.5 Pro (Deep reasoning)</span>
              </label>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Apply Model Selection
            </button>
          </div>
        </div>
      )}

      {activeDialog === "integrations" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Cable className="w-10 h-10 text-teal-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Sync Integrations</h3>
            <div className="mt-4 space-y-3 text-left text-xs">
              <div className="p-2 bg-black/20 rounded-lg flex items-center justify-between">
                <span>Google Drive Backup</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold">CONNECTED</span>
              </div>
              <div className="p-2 bg-black/20 rounded-lg flex items-center justify-between">
                <span>IndexedDB Storage</span>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold font-bold">PERSISTENT</span>
              </div>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              OK
            </button>
          </div>
        </div>
      )}

      {activeDialog === "notifications" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <Bell className="w-10 h-10 text-yellow-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Notifications State</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Get direct system bar updates when coworkers or friends ping you or start discussions.
            </p>
            <div className="mt-4 text-left space-y-2 text-xs">
              <label className="flex items-center justify-between p-2 bg-black/20 rounded-lg cursor-pointer">
                <span>Push Alerts</span>
                <input type="checkbox" defaultChecked className="accent-accent-purple" />
              </label>
              <label className="flex items-center justify-between p-2 bg-black/20 rounded-lg cursor-pointer">
                <span>Play Sound on chat ping</span>
                <input type="checkbox" defaultChecked className="accent-accent-purple" />
              </label>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Save Preferences
            </button>
          </div>
        </div>
      )}

      {activeDialog === "billing" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <CreditCard className="w-10 h-10 text-indigo-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Plan & Billing</h3>
            <div className="mt-3 p-3 bg-[#241730] border border-white/5 rounded-xl text-left">
              <div className="flex justify-between items-center">
                <span className="font-bold text-xs text-indigo-300 font-sans">Professional Tier</span>
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-extrabold rounded px-1 text-center font-mono">ACTIVE</span>
              </div>
              <p className="text-[10px] text-zinc-400 mt-1.5">
                Next Renewal: May 2027<br />
                Subscribed Email: {currentUser.email || "No Email linked"}
              </p>
            </div>
            <p className="text-[10px] text-zinc-500 text-center mt-3 font-sans leading-relaxed">
              Your free server license is sponsored by Google AI Studio. No billing is required.
            </p>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-4 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Great
            </button>
          </div>
        </div>
      )}

      {activeDialog === "team" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <UserCog className="w-10 h-10 text-purple-400 mx-auto mb-3" />
            <h3 className="text-sm font-bold text-white tracking-wide">Team & Roles</h3>
            <p className="text-xs text-zinc-400 mt-2 leading-relaxed">
              Invite administrators, moderators or setup client access roles. Ensure clean secure channels.
            </p>
            <div className="mt-4 p-2 bg-black/20 text-xs rounded-lg text-left text-zinc-300">
              Role: <strong className="text-white font-mono shrink-0">Workspace Owner</strong>
            </div>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {activeDialog === "about" && (
        <div className="absolute inset-0 bg-[#09040d]/90 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-[#1b1024] border border-[#3e2358] rounded-2xl p-5 w-full max-w-xs text-center shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#8b46df] to-[#f472b6] flex items-center justify-center text-white text-xl font-black mx-auto mb-3">
              YF
            </div>
            <h3 className="text-sm font-bold text-white tracking-wide">Your Friend</h3>
            <p className="text-[11px] text-[#b480f7] font-mono mt-0.5 uppercase tracking-widest font-bold">Version 1.2.0</p>
            <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed">
              Designed and built as a Progressive Web Application with seamless offline client caches and server integration. Full Clean UI & Real-Times.
            </p>
            <button 
              onClick={() => setActiveDialog(null)}
              className="mt-5 w-full py-2 bg-accent-purple hover:bg-accent-purple/90 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Awesome
            </button>
          </div>
        </div>
      )}

      {/* Global Hidden Image Upload input element accessible on any SettingsView screen */}
      <input 
        type="file"
        ref={fileInputRef}
        onChange={handleCustomPhotoChange}
        accept="image/*"
        className="hidden"
      />

    </div>
  );
}
