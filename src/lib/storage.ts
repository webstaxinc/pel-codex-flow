import { openDB, type IDBPDatabase } from 'idb';

// Types
export interface User {
  email: string;
  role: 'requestor' | 'it' | 'secretary' | 'siva' | 'raghu' | 'manoj' | 'admin';
  createdAt: string;
}

export interface Request {
  requestId: string;
  type: 'plant' | 'company';
  title: string;
  status: 'draft' | 'pending-secretary' | 'pending-siva' | 'pending-raghu' | 'pending-manoj' | 'approved' | 'rejected' | 'sap-updated' | 'completed';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  isCompleted?: boolean;
  completedAt?: string;
  turnaroundTime?: number; // in days
  tat?: number; // Alternative name for turnaround time
}

export interface Notification {
  id: string;
  recipientEmail: string;
  type: string;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  requestId?: string;
}

export interface PlantCodeDetails {
  requestId: string;
  companyCode: string;
  gstCertificate: string;
  plantCode: string;
  nameOfPlant: string;
  addressOfPlant: string;
  purchaseOrganization: string;
  nameOfPurchaseOrganization: string;
  salesOrganization: string;
  nameOfSalesOrganization: string;
  profitCenter: string;
  nameOfProfitCenter: string;
  costCenters: string;
  nameOfCostCenters: string;
  projectCode: string;
  projectCodeDescription: string;
  storageLocationCode: string;
  storageLocationDescription: string;
  version: number;
}

export interface CompanyCodeDetails {
  requestId: string;
  companyCode: string;
  nameOfCompanyCode: string;
  shareholdingPercentage: number;
  gstCertificate: string;
  cin: string;
  pan: string;
  segment: string;
  nameOfSegment: string;
  version: number;
}

export interface Attachment {
  attachmentId: string;
  requestId: string;
  fileName: string;
  fileContent: string; // base64
  fileType: string;
  version: number;
  title: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface Approval {
  requestId: string;
  approverEmail: string;
  role: string;
  decision: 'approve' | 'reject';
  comment: string;
  attachmentId?: string;
  timestamp: string;
}

export interface HistoryLog {
  requestId: string;
  action: 'create' | 'edit' | 'approve' | 'reject' | 'update-sap';
  user: string;
  timestamp: string;
  metadata: any;
}

export interface Session {
  email: string;
  role: string;
  expiresAt: string;
}

let dbInstance: IDBPDatabase | null = null;

export async function initDB() {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB('PELWorkflow', 1, {
    upgrade(db) {
      // Users store
      const userStore = db.createObjectStore('users', { keyPath: 'email' });
      userStore.createIndex('role', 'role');

      // Requests store
      const requestStore = db.createObjectStore('requests', { keyPath: 'requestId' });
      requestStore.createIndex('status', 'status');
      requestStore.createIndex('createdBy', 'createdBy');
      requestStore.createIndex('type', 'type');
      requestStore.createIndex('statusType', ['status', 'type']);

      // Plant code details
      const plantStore = db.createObjectStore('plantCodeDetails', { keyPath: ['requestId', 'version'] });
      plantStore.createIndex('requestId', 'requestId');

      // Company code details
      const companyStore = db.createObjectStore('companyCodeDetails', { keyPath: ['requestId', 'version'] });
      companyStore.createIndex('requestId', 'requestId');

      // Attachments
      const attachmentStore = db.createObjectStore('attachments', { keyPath: 'attachmentId' });
      attachmentStore.createIndex('requestId', 'requestId');

      // Approvals
      const approvalStore = db.createObjectStore('approvals', { keyPath: ['requestId', 'approverEmail'] });
      approvalStore.createIndex('requestId', 'requestId');

      // History logs
      const historyStore = db.createObjectStore('historyLogs', { keyPath: ['requestId', 'timestamp'] });
      historyStore.createIndex('requestId', 'requestId');

      // Sessions
      db.createObjectStore('sessions', { keyPath: 'email' });

      // Notifications
      const notificationsStore = db.createObjectStore('notifications', { keyPath: 'id' });
      notificationsStore.createIndex('recipientEmail', 'recipientEmail', { unique: false });
      notificationsStore.createIndex('timestamp', 'timestamp', { unique: false });
    },
  });

  // Initialize default users
  await initializeDefaultUsers();
  
  return dbInstance;
}

async function initializeDefaultUsers() {
  const db = await initDB();
  const tx = db.transaction('users', 'readwrite');
  
  const defaultUsers: User[] = [
    { email: 'it@pel.com', role: 'it', createdAt: new Date().toISOString() },
    { email: 'sec@pel.com', role: 'secretary', createdAt: new Date().toISOString() },
    { email: 'siva@pel.com', role: 'siva', createdAt: new Date().toISOString() },
    { email: 'raghu@pel.com', role: 'raghu', createdAt: new Date().toISOString() },
    { email: 'manoj@pel.com', role: 'manoj', createdAt: new Date().toISOString() },
    { email: 'aarnav@pel.com', role: 'admin', createdAt: new Date().toISOString() },
  ];

  for (const user of defaultUsers) {
    const exists = await tx.store.get(user.email);
    if (!exists) {
      await tx.store.add(user);
    }
  }
  
  await tx.done;
}

export async function getUserRole(email: string): Promise<string> {
  const db = await initDB();
  const user = await db.get('users', email);
  return user?.role || 'requestor';
}

export async function saveSession(session: Session) {
  const db = await initDB();
  await db.put('sessions', session);
}

export async function getSession(): Promise<Session | null> {
  const db = await initDB();
  const sessions = await db.getAll('sessions');
  if (sessions.length === 0) return null;
  
  const session = sessions[0];
  if (new Date(session.expiresAt) < new Date()) {
    await db.delete('sessions', session.email);
    return null;
  }
  
  return session;
}

export async function clearSession() {
  const db = await initDB();
  await db.clear('sessions');
}

export async function saveRequest(request: Request) {
  const db = await initDB();
  await db.put('requests', request);
}

export async function getRequestsByUser(email: string): Promise<Request[]> {
  const db = await initDB();
  const requests = await db.getAllFromIndex('requests', 'createdBy', email);
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getAllRequests(): Promise<Request[]> {
  const db = await initDB();
  const requests = await db.getAll('requests');
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function getPendingRequestsForRole(role: string): Promise<Request[]> {
  const db = await initDB();
  const statusMap: Record<string, string> = {
    secretary: 'pending-secretary',
    siva: 'pending-siva',
    raghu: 'pending-raghu',
    manoj: 'pending-manoj',
  };
  
  const status = statusMap[role];
  if (!status) return [];
  
  const requests = await db.getAllFromIndex('requests', 'status', status);
  return requests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

export async function savePlantCodeDetails(details: PlantCodeDetails) {
  const db = await initDB();
  await db.put('plantCodeDetails', details);
}

export async function saveCompanyCodeDetails(details: CompanyCodeDetails) {
  const db = await initDB();
  await db.put('companyCodeDetails', details);
}

export async function getLatestRequestDetails(requestId: string, type: 'plant' | 'company') {
  const db = await initDB();
  const store = type === 'plant' ? 'plantCodeDetails' : 'companyCodeDetails';
  const allVersions = await db.getAllFromIndex(store, 'requestId', requestId);
  return allVersions.sort((a, b) => b.version - a.version)[0] || null;
}

export async function saveApproval(approval: Approval) {
  const db = await initDB();
  await db.put('approvals', approval);
}

export async function getApprovalsForRequest(requestId: string): Promise<Approval[]> {
  const db = await initDB();
  const approvals = await db.getAllFromIndex('approvals', 'requestId', requestId);
  return approvals.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export async function saveHistoryLog(log: HistoryLog) {
  const db = await initDB();
  await db.put('historyLogs', log);
}

export async function getHistoryForRequest(requestId: string): Promise<HistoryLog[]> {
  const db = await initDB();
  const history = await db.getAllFromIndex('historyLogs', 'requestId', requestId);
  return history.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export function generateRequestId(): string {
  return `REQ-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}

export const getRequestsWithDetails = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['requests', 'plantCodeDetails', 'companyCodeDetails', 'approvals'], 'readonly');
    const requests = await tx.objectStore('requests').getAll();
    
    const requestsWithDetails = await Promise.all(
      requests.map(async (request) => {
        let details = null;
        if (request.type === 'plant') {
          const plantDetails = await tx.objectStore('plantCodeDetails').getAll();
          details = plantDetails.filter(d => d.requestId === request.requestId).sort((a, b) => b.version - a.version)[0];
        } else {
          const companyDetails = await tx.objectStore('companyCodeDetails').getAll();
          details = companyDetails.filter(d => d.requestId === request.requestId).sort((a, b) => b.version - a.version)[0];
        }
        
        const approvals = await tx.objectStore('approvals').getAll();
        const requestApprovals = approvals.filter(approval => approval.requestId === request.requestId);
        
        return {
          id: request.requestId,
          type: request.type,
          status: request.status,
          createdBy: request.createdBy,
          createdAt: request.createdAt,
          updatedAt: request.updatedAt,
          details: details || {},
          approvals: requestApprovals
        };
      })
    );
    
    return requestsWithDetails;
  } catch (error) {
    console.error('Failed to get requests with details:', error);
    throw error;
  }
};

export const getAllUsers = async (): Promise<any[]> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['users'], 'readonly');
    const users = await tx.objectStore('users').getAll();
    return users;
  } catch (error) {
    console.error('Failed to get all users:', error);
    throw error;
  }
};

export const createUser = async (email: string, role: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['users'], 'readwrite');
    const user = {
      email,
      role,
      createdAt: new Date().toISOString()
    };
    await tx.objectStore('users').add(user);
    await tx.done;
  } catch (error) {
    console.error('Failed to create user:', error);
    throw error;
  }
};

export const getUserByEmail = async (email: string): Promise<any | null> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['users'], 'readonly');
    const user = await tx.objectStore('users').get(email);
    return user || null;
  } catch (error) {
    console.error('Failed to get user by email:', error);
    throw error;
  }
};

export const deleteUser = async (email: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['users'], 'readwrite');
    await tx.objectStore('users').delete(email);
    await tx.done;
  } catch (error) {
    console.error('Failed to delete user:', error);
    throw error;
  }
};

export const markRequestCompleted = async (requestId: string, completedBy: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['requests'], 'readwrite');
    const request = await tx.objectStore('requests').get(requestId);
    
    if (request) {
      const completedAt = new Date().toISOString();
      const createdDate = new Date(request.createdAt);
      const completedDate = new Date(completedAt);
      const turnaroundTime = Math.ceil((completedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
      
      request.status = 'completed';
      request.isCompleted = true;
      request.completedAt = completedAt;
      request.turnaroundTime = turnaroundTime;
      request.updatedAt = completedAt;
      
      await tx.objectStore('requests').put(request);
      
      // Log the completion
      await saveHistoryLog({
        requestId,
        action: 'update-sap',
        user: completedBy,
        timestamp: completedAt,
        metadata: { turnaroundTime, completedBy }
      });
    }
    
    await tx.done;
  } catch (error) {
    console.error('Failed to mark request as completed:', error);
    throw error;
  }
};

export const getCompletedRequests = async (): Promise<Request[]> => {
  try {
    const db = await initDB();
    const requests = await db.getAllFromIndex('requests', 'status', 'completed');
    return requests.sort((a, b) => new Date(b.completedAt || b.updatedAt).getTime() - new Date(a.completedAt || a.updatedAt).getTime());
  } catch (error) {
    console.error('Failed to get completed requests:', error);
    throw error;
  }
};

export const addApproval = async (requestId: string, approverEmail: string, role: string, decision: string, comment: string, attachmentId?: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['approvals', 'historyLogs'], 'readwrite');
    const approval = {
      requestId,
      approverEmail,
      role,
      decision,
      comment,
      attachmentId,
      timestamp: new Date().toISOString()
    };
    await tx.objectStore('approvals').put(approval);
    
    // Log the approval action
    const historyLog = {
      requestId,
      action: decision === 'approve' ? 'approve' : (decision === 'reject' ? 'reject' : 'update-sap'),
      user: approverEmail,
      timestamp: approval.timestamp,
      metadata: { comment, role, decision }
    };
    await tx.objectStore('historyLogs').put(historyLog);
    
    await tx.done;
  } catch (error) {
    console.error('Failed to add approval:', error);
    throw error;
  }
};

export const updateRequestStatus = async (requestId: string, status: string): Promise<void> => {
  try {
    const db = await initDB();
    const tx = db.transaction(['requests'], 'readwrite');
    const request = await tx.objectStore('requests').get(requestId);
    if (request) {
      request.status = status;
      request.updatedAt = new Date().toISOString();
      await tx.objectStore('requests').put(request);
    }
    await tx.done;
  } catch (error) {
    console.error('Failed to update request status:', error);
    throw error;
  }
};

// Notification functions
export const saveNotification = async (notification: Omit<Notification, 'id' | 'timestamp'>): Promise<string> => {
  const db = await initDB();
  const tx = db.transaction(['notifications'], 'readwrite');
  const store = tx.objectStore('notifications');
  
  const notificationWithMeta: Notification = {
    ...notification,
    id: generateRequestId(),
    timestamp: new Date().toISOString(),
  };
  
  await store.add(notificationWithMeta);
  return notificationWithMeta.id;
};

export const getNotifications = async (userEmail: string): Promise<Notification[]> => {
  const db = await initDB();
  const tx = db.transaction(['notifications'], 'readonly');
  const store = tx.objectStore('notifications');
  const notifications = await store.getAll();
  
  return notifications
    .filter(n => n.recipientEmail === userEmail)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
};

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const db = await initDB();
  const tx = db.transaction(['notifications'], 'readwrite');
  const store = tx.objectStore('notifications');
  
  const notification = await store.get(notificationId);
  if (notification) {
    notification.read = true;
    await store.put(notification);
  }
};

export const sendNotificationToAllStakeholders = async (
  requestId: string, 
  type: string, 
  title: string, 
  message: string,
  excludeEmail?: string
): Promise<void> => {
  const stakeholders = [
    'sec@pel.com',
    'siva@pel.com', 
    'raghu@pel.com',
    'manoj@pel.com',
    'it@pel.com'
  ];

  // Get request details to include requestor
  const db = await initDB();
  const request = await db.get('requests', requestId);
  if (request && request.createdBy !== excludeEmail) {
    stakeholders.push(request.createdBy);
  }

  // Send notification to all stakeholders except the one who triggered the action
  for (const email of stakeholders) {
    if (email !== excludeEmail) {
      await saveNotification({
        recipientEmail: email,
        type,
        title,
        message,
        requestId,
        read: false
      });
    }
  }
};