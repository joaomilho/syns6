// IndexedDB storage for viewer connection state
const DB_NAME = 'syns-viewer';
const STORE_NAME = 'connection';
const VERSION = 1;

interface ViewerConnection {
  hostPeerId: string;
  timestamp: number;
}

// Open or create the database
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

// Save host peer ID to IndexedDB
export async function saveHostPeerId(hostPeerId: string): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    const data: ViewerConnection = {
      hostPeerId,
      timestamp: Date.now(),
    };
    
    store.put(data, 'current-host');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ Saved host peer ID to IndexedDB:', hostPeerId);
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to save host peer ID:', error);
    throw error;
  }
}

// Load saved host peer ID from IndexedDB
export async function loadHostPeerId(): Promise<string | null> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get('current-host');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        const data = request.result as ViewerConnection | undefined;
        if (data?.hostPeerId) {
          console.log('✅ Loaded host peer ID from IndexedDB:', data.hostPeerId);
          resolve(data.hostPeerId);
        } else {
          console.log('ℹ️ No saved host peer ID found');
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Failed to load host peer ID:', error);
    return null;
  }
}

// Clear saved host peer ID from IndexedDB
export async function clearHostPeerId(): Promise<void> {
  try {
    const db = await openDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    
    store.delete('current-host');
    
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => {
        console.log('✅ Cleared host peer ID from IndexedDB');
        resolve();
      };
      transaction.onerror = () => reject(transaction.error);
    });
  } catch (error) {
    console.error('Failed to clear host peer ID:', error);
    throw error;
  }
}

