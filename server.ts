import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  type: "text" | "voice" | "file";
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  duration?: string; // for voice notes
  tempId?: string;
  recipientId: string; // "design-talk" or other user's uid
  status: "sent" | "delivered" | "seen";
}

interface UserProfile {
  uid: string;
  name: string;
  username: string; // unique, e.g. "ana"
  photoURL: string;
  status: "Online" | "Very busy" | "Away" | "Offline";
}

interface UserStatus {
  userId: string;
  status: "Online" | "Very busy" | "Away" | "Offline";
}

interface TypingState {
  userId: string;
  userName: string;
  isTyping: boolean;
  chatId: string;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Let's support larger payload sizes for base64 file attachments inside messages
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Pre-seed mock users matching our layout contacts
  let users: UserProfile[] = [
    {
      uid: "mario-sestak",
      name: "Mario Šestak",
      username: "mario",
      photoURL: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
      status: "Online"
    },
    {
      uid: "ana-sakac",
      name: "Ana Sakač",
      username: "ana",
      photoURL: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      status: "Online"
    },
    {
      uid: "hrvoje-dominko",
      name: "Hrvoje Dominko",
      username: "hrvoje_d",
      photoURL: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
      status: "Away"
    },
    {
      uid: "ena-begcevic",
      name: "Ena Begčević",
      username: "ena",
      photoURL: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
      status: "Offline"
    },
    {
      uid: "mario-simic",
      name: "Mario Šimić",
      username: "simic",
      photoURL: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
      status: "Online"
    },
    {
      uid: "bill-gates",
      name: "Bill Gates",
      username: "bill",
      photoURL: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150",
      status: "Offline"
    }
  ];

  // In-memory messages pre-seeded with recipientId and seen status
  let messages: Message[] = [
    {
      id: "1",
      senderId: "ana-sakac",
      senderName: "Ana Sakač",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      content: "Hey guys, what does the fox say?",
      timestamp: "09:23 AM",
      type: "text",
      recipientId: "design-talk",
      status: "seen"
    },
    {
      id: "2",
      senderId: "hrvoje",
      senderName: "Hrvoje Grubišić",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      content: "What? I have no idea... Mario?",
      timestamp: "09:24 AM",
      type: "text",
      recipientId: "design-talk",
      status: "seen"
    },
    {
      id: "3",
      senderId: "mario-sestak",
      senderName: "Mario Šestak",
      senderAvatar: "https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150",
      content: "Voice note",
      timestamp: "09:25 AM",
      type: "voice",
      duration: "01:18",
      fileUrl: "voice_0925_sample.mp3",
      recipientId: "design-talk",
      status: "seen"
    },
    {
      id: "4",
      senderId: "hrvoje",
      senderName: "Hrvoje Grubišić",
      senderAvatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      content: "Lol wtf? This is the dumbest shit I've ever heard!",
      timestamp: "09:26 AM",
      type: "text",
      recipientId: "design-talk",
      status: "seen"
    },
    {
      id: "5",
      senderId: "ana-sakac",
      senderName: "Ana Sakač",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      content: "Whaat?? This is not how foxes sound like",
      timestamp: "09:27 AM",
      type: "text",
      recipientId: "design-talk",
      status: "seen"
    },
    {
      id: "6",
      senderId: "ana-sakac",
      senderName: "Ana Sakač",
      senderAvatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
      content: "Who made this song? Can you send me...",
      timestamp: "09:29 AM",
      type: "text",
      recipientId: "design-talk",
      status: "seen"
    }
  ];

  // Active SSE clients for real-time streaming
  let sseClients: any[] = [];

  const broadcastEvent = (type: string, data: any) => {
    sseClients.forEach((client) => {
      client.write(`data: ${JSON.stringify({ type, data })}\n\n`);
    });
  };

  // Real-time Event Stream Endpoint
  app.get("/api/events", (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    sseClients.push(res);

    // Send initial ping to verify connection
    res.write(`data: ${JSON.stringify({ type: "ping", data: "connected" })}\n\n`);

    req.on("close", () => {
      sseClients = sseClients.filter((client) => client !== res);
    });
  });

  // Users search and registration endpoints
  app.get("/api/users", (req, res) => {
    res.json(users);
  });

  app.get("/api/users/search", (req, res) => {
    const query = (req.query.q as string || "").toLowerCase().trim();
    if (!query) {
      return res.json([]);
    }
    // Match either username (with or without @) or display name
    const cleanQuery = query.startsWith("@") ? query.slice(1) : query;
    const matched = users.filter(
      (u) =>
        u.username.toLowerCase().includes(cleanQuery) ||
        u.name.toLowerCase().includes(cleanQuery)
    );
    res.json(matched);
  });

  app.get("/api/users/find", (req, res) => {
    const username = (req.query.username as string || "").toLowerCase().trim().replaceAll("@", "");
    if (!username) {
      return res.status(400).json({ error: "Missing username parameter" });
    }
    const found = users.find((u) => u.username === username);
    if (found) {
      res.json(found);
    } else {
      res.status(404).json({ error: "User not found" });
    }
  });

  app.post("/api/users/register", (req, res) => {
    const { uid, name, username, photoURL, status } = req.body;
    if (!uid || !name || !username) {
      return res.status(400).json({ error: "Missing uid, name, or username" });
    }

    const cleanUsername = username.replaceAll("@", "").trim().toLowerCase();
    
    // Check if username is already taken by another user
    const existing = users.find((u) => u.username === cleanUsername && u.uid !== uid);
    if (existing) {
      return res.status(400).json({ error: "Username was already claimed" });
    }

    const idx = users.findIndex((u) => u.uid === uid);
    const updatedProfile: UserProfile = {
      uid,
      name: name.trim(),
      username: cleanUsername,
      photoURL: photoURL || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150",
      status: status || "Online"
    };

    if (idx !== -1) {
      users[idx] = updatedProfile;
    } else {
      users.push(updatedProfile);
    }

    // Broadcast profile update event via SSE
    broadcastEvent("profile-update", updatedProfile);
    res.json({ success: true, user: updatedProfile });
  });

  // Get active message list
  app.get("/api/messages", (req, res) => {
    res.json(messages);
  });

  // Post single new message
  app.post("/api/messages", (req, res) => {
    const newMessage: Message = {
      id: req.body.id || Math.random().toString(36).substring(2, 9),
      senderId: req.body.senderId,
      senderName: req.body.senderName,
      senderAvatar: req.body.senderAvatar,
      content: req.body.content,
      timestamp: req.body.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      type: req.body.type || "text",
      fileUrl: req.body.fileUrl,
      fileName: req.body.fileName,
      fileSize: req.body.fileSize,
      duration: req.body.duration,
      tempId: req.body.tempId,
      recipientId: req.body.recipientId || "design-talk",
      status: req.body.status || "delivered"
    };

    messages.push(newMessage);
    broadcastEvent("new-message", newMessage);
    res.status(201).json(newMessage);
  });

  // Endpoint to mark messages as read / seen
  app.post("/api/messages/read", (req, res) => {
    const { senderId, recipientId } = req.body;
    if (!senderId || !recipientId) {
      return res.status(400).json({ error: "Missing senderId or recipientId" });
    }

    let changed = false;
    messages = messages.map((m) => {
      // If the message was sent by `senderId` and meant for `recipientId` (or part of design-talk group)
      const matchesDirect = (m.senderId === senderId && m.recipientId === recipientId);
      const matchesGroup = (recipientId === "design-talk" && m.recipientId === "design-talk" && m.senderId !== senderId);
      
      if ((matchesDirect || matchesGroup) && m.status !== "seen") {
        changed = true;
        return { ...m, status: "seen" };
      }
      return m;
    });

    if (changed) {
      broadcastEvent("messages-read", { senderId, recipientId, status: "seen" });
    }
    res.json({ success: true });
  });

  // Batch sync offline queued messages
  app.post("/api/messages/sync", (req, res) => {
    const queuedMessages: Message[] = req.body.messages || [];
    const addedMessages: Message[] = [];

    queuedMessages.forEach((msg) => {
      // Avoid duplicate syncing by checking ID or content matching
      if (!messages.find((m) => m.id === msg.id || (m.tempId && m.tempId === msg.id))) {
        const syncedMsg: Message = {
          ...msg,
          id: msg.id || Math.random().toString(36).substring(2, 9),
          recipientId: msg.recipientId || "design-talk",
          status: msg.status || "delivered"
        };
        messages.push(syncedMsg);
        addedMessages.push(syncedMsg);
        broadcastEvent("new-message", syncedMsg);
      }
    });

    res.json({ status: "synced", count: addedMessages.length, messages: addedMessages });
  });

  // Typing state updates
  app.post("/api/typing", (req, res) => {
    const typingState: TypingState = {
      userId: req.body.userId,
      userName: req.body.userName,
      isTyping: req.body.isTyping,
      chatId: req.body.chatId || "design-talk"
    };

    broadcastEvent("typing", typingState);
    res.json({ success: true });
  });

  // Presence state updates
  app.post("/api/user-status", (req, res) => {
    const statusUpdate: UserStatus = {
      userId: req.body.userId,
      status: req.body.status
    };

    broadcastEvent("user-status", statusUpdate);
    res.json({ success: true });
  });

  // Mock upload handler that processes Base64 or generates fake URL
  app.post("/api/upload", (req, res) => {
    const { fileName, fileType, fileData } = req.body;
    if (!fileName || !fileData) {
      return res.status(400).json({ error: "No file data received" });
    }

    // Since we want standard previews without complex multipart files systems,
    // we return the client's fileData (as a secure dataURI) or return a clean preview URL
    res.json({
      success: true,
      fileUrl: fileData, // Data-URI is fully self-contained!
      fileName: fileName,
      fileSize: (fileData.length / 1333).toFixed(1) + " KB"
    });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on public port ${PORT}`);
  });
}

startServer();
