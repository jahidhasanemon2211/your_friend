import { Message, Contact } from "../types";

const DB_NAME = "pwa_chat_db";
const DB_VERSION = 1;

export function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error("IndexedDB initialization failed:", event);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event: any) => {
      const db = event.target.result;

      // Object store for messages
      if (!db.objectStoreNames.contains("messages")) {
        const messageStore = db.createObjectStore("messages", { keyPath: "id" });
        messageStore.createIndex("isOffline", "isOffline", { unique: false });
      }

      // Object store for contacts
      if (!db.objectStoreNames.contains("contacts")) {
        db.createObjectStore("contacts", { keyPath: "id" });
      }
    };
  });
}

// Save a single message in the IndexedDB
export async function saveMessage(message: Message): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");
    const request = store.put(message);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// Bulk save messages to cache
export async function saveMessagesBulk(messages: Message[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");
    
    messages.forEach((msg) => {
      store.put(msg);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Get all messages cached in the store
export async function getSavedMessages(): Promise<Message[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    const request = store.getAll();

    request.onsuccess = () => {
      // Sort messages chronologically if required, or simply return
      const msgs = request.result || [];
      resolve(msgs);
    };
    request.onerror = () => reject(request.error);
  });
}

// Retrieve only the offline messages that need syncing
export async function getOfflineMessages(): Promise<Message[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readonly");
    const store = transaction.objectStore("messages");
    const index = store.index("isOffline");
    const request = index.getAll(1); // 1 is equivalent to true because of index key matching

    request.onsuccess = () => {
      const results = request.result || [];
      // Secondary filter in case index storage coercion occurred
      const offlineOnes = results.filter((msg) => msg.isOffline === true);
      resolve(offlineOnes);
    };

    // Fallback: If index matches fail or is empty, fetch all and filter
    request.onerror = async () => {
      try {
        const all = await getSavedMessages();
        resolve(all.filter((msg) => msg.isOffline === true));
      } catch (err) {
        reject(err);
      }
    };
  });
}

// Mark message as synced and optionally change its id to server-provided one
export async function markMessageSynced(id: string, newId?: string): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages"], "readwrite");
    const store = transaction.objectStore("messages");
    
    // Fetch the existing message first
    const getRequest = store.get(id);

    getRequest.onsuccess = () => {
      const msg = getRequest.result;
      if (msg) {
        // Delete old entry if ID changes
        if (newId && newId !== id) {
          store.delete(id);
          msg.id = newId;
        }
        
        msg.isOffline = false;
        
        const putRequest = store.put(msg);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      } else {
        resolve();
      }
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

// Clear all local caches (on reload/logout)
export async function clearLocalCache(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["messages", "contacts"], "readwrite");
    transaction.objectStore("messages").clear();
    transaction.objectStore("contacts").clear();

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Clear only contacts
export async function clearContacts(): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["contacts"], "readwrite");
    transaction.objectStore("contacts").clear();
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Save contact logs cached
export async function saveContactsBulk(contacts: Contact[]): Promise<void> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["contacts"], "readwrite");
    const store = transaction.objectStore("contacts");

    contacts.forEach((contact) => {
      store.put(contact);
    });

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// Retrieve cached contact listings
export async function getSavedContacts(): Promise<Contact[]> {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(["contacts"], "readonly");
    const store = transaction.objectStore("contacts");
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}
