import { 
    collection, 
    doc, 
    setDoc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    writeBatch, 
    onSnapshot, 
    query, 
    where, 
    orderBy, 
    getDocs,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { 
    DeveloperRecord, 
    DatasetVersion, 
    AdminUser, 
    Invoice, 
    CommunityAgreement, 
    CommunityEvent, 
    OutreachCampaign, 
    CommunityMasterRecord 
} from '../types';

// --- BATCH DATA HANDLING (Developers) ---

export const uploadDeveloperBatch = async (
    data: DeveloperRecord[], 
    fileName: string, 
    uploadedBy: string,
    onProgress: (progress: number) => void
) => {
    const batchId = `batch_${Date.now()}`;
    const batchRef = doc(db, 'batches', batchId);
    
    // 1. Create Batch Metadata
    const versionData: DatasetVersion = {
        id: batchId,
        fileName,
        uploadDate: new Date().toISOString(),
        recordCount: data.length,
        uploadedBy,
        data: [] // Data stored in sub-collection
    };
    await setDoc(batchRef, versionData);

    // 2. Upload Records in Chunks (Firestore limit: 500 ops per batch)
    const CHUNK_SIZE = 450; 
    const totalChunks = Math.ceil(data.length / CHUNK_SIZE);

    for (let i = 0; i < totalChunks; i++) {
        const batch = writeBatch(db);
        const chunk = data.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        
        chunk.forEach(record => {
            // Ensure ID is unique and clean
            const recordId = record.id || doc(collection(db, 'developers')).id;
            const ref = doc(db, 'developers', recordId);
            batch.set(ref, { ...record, ingestionBatchId: batchId });
        });

        await batch.commit();
        onProgress(Math.round(((i + 1) / totalChunks) * 100));
    }
    
    return batchId;
};

export const listenToBatches = (callback: (batches: DatasetVersion[]) => void) => {
    const q = query(collection(db, 'batches'), orderBy('uploadDate', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const batches = snapshot.docs.map(d => d.data() as DatasetVersion);
        callback(batches);
    });
};

export const fetchBatchData = async (batchId: string): Promise<DeveloperRecord[]> => {
    const q = query(collection(db, 'developers'), where('ingestionBatchId', '==', batchId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => d.data() as DeveloperRecord);
};

// NEW: Real-time listener for developer data to ensure persistence on reload
export const listenToDeveloperData = (batchId: string, callback: (data: DeveloperRecord[]) => void) => {
    const q = query(collection(db, 'developers'), where('ingestionBatchId', '==', batchId));
    return onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => d.data() as DeveloperRecord);
        callback(data);
    }, (error) => {
        console.error("Error listening to developer data:", error);
        callback([]);
    });
};

export const deleteBatch = async (batchId: string) => {
    // 1. Delete Metadata
    await deleteDoc(doc(db, 'batches', batchId));
    
    // 2. Delete Records (Note: In production, use Cloud Functions for recursive delete)
    const q = query(collection(db, 'developers'), where('ingestionBatchId', '==', batchId));
    const snapshot = await getDocs(q);
    const batch = writeBatch(db);
    snapshot.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
};

// --- ADMINS ---

// Targeted listener for the CURRENT USER only
export const listenToAdminProfile = (email: string, callback: (admin: AdminUser | null) => void) => {
    const q = query(collection(db, 'admins'), where('email', '==', email));
    
    // Robust error handling to ensure UI doesn't hang if permissions fail or doc doesn't exist
    return onSnapshot(q, {
        next: (snapshot) => {
            if (!snapshot.empty) {
                const doc = snapshot.docs[0];
                callback({ ...doc.data(), id: doc.id } as AdminUser);
            } else {
                callback(null);
            }
        },
        error: (error) => {
            console.warn("Profile listener warning (likely new user or permission issue):", error);
            callback(null); // Fallback to null (Access Pending) on error
        }
    });
};

// Full List Listener (Only for Super Admins)
export const listenToAdmins = (callback: (admins: AdminUser[]) => void) => {
    return onSnapshot(collection(db, 'admins'), (snapshot) => {
        callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as AdminUser)));
    });
};

export const addAdmin = async (admin: AdminUser) => {
    const { id, ...data } = admin;
    await addDoc(collection(db, 'admins'), data);
};

export const updateAdmin = async (id: string, data: Partial<AdminUser>) => {
    await updateDoc(doc(db, 'admins', id), data);
};

export const deleteAdmin = async (id: string) => {
    await deleteDoc(doc(db, 'admins', id));
};

// --- INVOICES ---

export const listenToInvoices = (callback: (invoices: Invoice[]) => void) => {
    return onSnapshot(collection(db, 'invoices'), (snapshot) => {
        callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as Invoice)));
    });
};

export const addInvoice = async (invoice: Invoice) => {
    const { id, ...data } = invoice; // Let Firestore auto-gen ID if needed, or use custom
    const docRef = id && id.length > 5 ? doc(db, 'invoices', id) : doc(collection(db, 'invoices'));
    await setDoc(docRef, data);
};

export const updateInvoice = async (id: string, data: Partial<Invoice>) => {
    await updateDoc(doc(db, 'invoices', id), data);
};

// --- AGREEMENTS ---

export const listenToAgreements = (callback: (agreements: CommunityAgreement[]) => void) => {
    return onSnapshot(collection(db, 'agreements'), (snapshot) => {
        callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CommunityAgreement)));
    });
};

export const saveAgreement = async (agreement: CommunityAgreement) => {
    const { id, ...data } = agreement;
    await setDoc(doc(db, 'agreements', id), data);
};

// --- EVENTS ---

export const listenToEvents = (callback: (events: CommunityEvent[]) => void) => {
    return onSnapshot(collection(db, 'events'), (snapshot) => {
        callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as CommunityEvent)));
    });
};

export const addEvent = async (event: CommunityEvent) => {
    const { id, ...data } = event;
    await setDoc(doc(db, 'events', id), data);
};

// --- CAMPAIGNS ---

export const listenToCampaigns = (callback: (campaigns: OutreachCampaign[]) => void) => {
    const q = query(collection(db, 'campaigns'), orderBy('sentAt', 'desc'));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(d => ({ ...d.data(), id: d.id } as OutreachCampaign)));
    });
};

export const addCampaign = async (campaign: OutreachCampaign) => {
    const { id, ...data } = campaign;
    await setDoc(doc(db, 'campaigns', id), data);
};

// --- REGISTRY ---

export const listenToRegistry = (callback: (registry: CommunityMasterRecord[]) => void) => {
    return onSnapshot(collection(db, 'registry'), (snapshot) => {
        callback(snapshot.docs.map(d => d.data() as CommunityMasterRecord));
    });
};

export const updateMasterRegistry = async (records: CommunityMasterRecord[]) => {
    await setDoc(doc(db, 'settings', 'community_registry'), { records });
};

// Helper for App to listen to the single registry doc
export const listenToRegistryDoc = (callback: (registry: CommunityMasterRecord[]) => void) => {
    return onSnapshot(doc(db, 'settings', 'community_registry'), (doc) => {
        if (doc.exists()) {
            callback(doc.data().records as CommunityMasterRecord[]);
        } else {
            callback([]);
        }
    });
};