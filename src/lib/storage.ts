import { openDB, type IDBPDatabase } from 'idb';

// Types
export interface User {
  email: string;
  role: 'requestor' | 'it' | 'secretary' | 'finance' | 'raghu' | 'siva' | 'admin';
  createdAt: string;
}

export interface Request {
  requestId: string;
  type: 'plant' | 'company';
  title: string;
  status: 'draft' | 'pending-secretary' | 'pending-finance' | 'pending-raghu' | 'pending-siva' | 'approved' | 'rejected' | 'sap-updated';
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  version: number;
}

export interface PlantCodeDetails {
  requestId: string;
  companyCode: string;
  gstCertificate: string;
  pan: string;
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
  controllingArea: string;
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
    { email: 'fin@pel.com', role: 'finance', createdAt: new Date().toISOString() },
    { email: 'raghu@pel.com', role: 'raghu', createdAt: new Date().toISOString() },
    { email: 'siva@pel.com', role: 'siva', createdAt: new Date().toISOString() },
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
    finance: 'pending-finance',
    raghu: 'pending-raghu',
    siva: 'pending-siva',
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