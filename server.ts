import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = 3000;

// Increase body payload limit for high-res photo uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Shared In-Memory State
interface MockDatabase {
  sharedLinks: Record<string, any>;
  printQueue: any[];
  systemLogs: any[];
  analytics: {
    totalProjects: number;
    activeShares: number;
    totalPrints: number;
    totalDownloads: number;
  };
}

const db: MockDatabase = {
  sharedLinks: {},
  printQueue: [
    {
      id: 'q-1',
      customerName: 'Marcus Aurelius',
      phone: '+1 (555) 019-2831',
      fileName: 'drivers_license_draft.png',
      fileSrc: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="300" height="180" viewBox="0 0 300 180"><rect width="300" height="180" fill="%23e2e8f0" rx="10"/><text x="150" y="90" font-family="sans-serif" font-size="14" fill="%23475569" text-anchor="middle">Driver License Sample File</text></svg>',
      pages: 1,
      copies: 2,
      colorMode: 'color',
      paperSize: 'PVC_Card',
      status: 'waiting',
      createdAt: new Date(Date.now() - 3600000).toISOString(),
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
      ocrText: 'STATE OF NEW YORK DRIVER LICENSE ID 982-123-882 CLASS D EXPIRES 2028-12-04 MARCUS AURELIUS',
      barcodesDetected: ['982123882'],
      adjustmentsApplied: false,
    },
    {
      id: 'q-2',
      customerName: 'Sarah Jenkins',
      phone: '+1 (555) 120-4932',
      fileName: 'visa_photo_v2.jpg',
      fileSrc: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="%23cbd5e1" rx="8"/><circle cx="100" cy="80" r="40" fill="%2364748b"/><path d="M40,160 Q100,100 160,160 Z" fill="%2364748b"/><text x="100" y="190" font-family="sans-serif" font-size="10" fill="%23334155" text-anchor="middle">Visa Photo Preview</text></svg>',
      pages: 1,
      copies: 6,
      colorMode: 'color',
      paperSize: 'A4',
      status: 'completed',
      createdAt: new Date(Date.now() - 7200000).toISOString(),
      updatedAt: new Date(Date.now() - 5400000).toISOString(),
      ocrText: 'NO TEXT DETECTED (PORTRAIT PHOTO)',
      barcodesDetected: [],
      adjustmentsApplied: true,
    }
  ],
  systemLogs: [
    { id: 'log-1', timestamp: new Date(Date.now() - 7200000).toISOString(), level: 'info', category: 'System', message: 'ID Print Studio Engine initialized successfully' },
    { id: 'log-2', timestamp: new Date(Date.now() - 3600000).toISOString(), level: 'info', category: 'Print Queue', message: 'Inbound customer print job added by Marcus Aurelius' }
  ],
  analytics: {
    totalProjects: 12,
    activeShares: 2,
    totalPrints: 48,
    totalDownloads: 18,
  }
};

// Helper: Log event to memory db
const addLog = (level: 'info' | 'warn' | 'error', category: string, message: string) => {
  db.systemLogs.unshift({
    id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
    timestamp: new Date().toISOString(),
    level,
    category,
    message
  });
  if (db.systemLogs.length > 100) db.systemLogs.pop();
};

// Lazy Initializer for GoogleGenAI SDK
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key || key === 'MY_GEMINI_API_KEY') {
      console.warn('GEMINI_API_KEY is missing or configured with placeholder in environment variables. Gemini features will run in simulation mode.');
    }
    aiClient = new GoogleGenAI({
      apiKey: key || '',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build'
        }
      }
    });
  }
  return aiClient;
}

/**
 * ==========================================
 * API ENDPOINTS
 * ==========================================
 */

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    apiActive: !!process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY',
    timestamp: new Date().toISOString()
  });
});

// Shared Link Management API
app.post('/api/share/create', (req, res) => {
  const { projectData, linkSettings } = req.body;
  if (!projectData) {
    return res.status(400).json({ error: 'Missing projectData' });
  }

  const shareId = `s-${Math.random().toString(36).substr(2, 8)}`;
  const expiresAt = linkSettings?.expiryHours
    ? new Date(Date.now() + linkSettings.expiryHours * 3600000).toISOString()
    : new Date(Date.now() + 24 * 3600000).toISOString();

  db.sharedLinks[shareId] = {
    id: shareId,
    projectId: projectData.id || `p-${Date.now()}`,
    projectName: projectData.name || 'Untitled Document',
    createdAt: new Date().toISOString(),
    expiresAt,
    passwordProtected: !!linkSettings?.password,
    passwordHash: linkSettings?.password || null,
    otpRequired: !!linkSettings?.otpRequired,
    otpCode: linkSettings?.otpRequired ? Math.floor(100000 + Math.random() * 900000).toString() : null,
    otpPhone: linkSettings?.otpPhone || null,
    accessMode: linkSettings?.accessMode || 'all',
    allowDownload: linkSettings?.allowDownload !== false,
    maxDownloads: linkSettings?.maxDownloads || 5,
    downloadCount: 0,
    maxPrints: linkSettings?.maxPrints || 5,
    printCount: 0,
    watermarkText: linkSettings?.watermarkText || '',
    isRevoked: false,
    projectData,
    syncEvents: []
  };

  db.analytics.activeShares += 1;
  addLog('info', 'Secure Sharing', `Generated secure sharing link: ${shareId} for project "${projectData.name}"`);

  res.json({
    shareId,
    expiresAt,
    otpCode: db.sharedLinks[shareId].otpCode, // return OTP code for previewing convenience
    shareUrl: `/share/${shareId}`
  });
});

app.get('/api/share/get/:id', (req, res) => {
  const { id } = req.params;
  const link = db.sharedLinks[id];

  if (!link) {
    return res.status(404).json({ error: 'Share link not found or expired' });
  }

  if (link.isRevoked || new Date() > new Date(link.expiresAt)) {
    return res.status(410).json({ error: 'This secure link has expired or has been revoked by the owner.' });
  }

  // Return redacted copy (no raw project data or passwords until validated)
  res.json({
    id: link.id,
    projectName: link.projectName,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
    passwordProtected: link.passwordProtected,
    otpRequired: link.otpRequired,
    otpPhone: link.otpPhone ? `***-***-${link.otpPhone.slice(-4)}` : null,
    accessMode: link.accessMode,
    allowDownload: link.allowDownload,
    downloadCount: link.downloadCount,
    maxDownloads: link.maxDownloads,
    printCount: link.printCount,
    maxPrints: link.maxPrints,
    watermarkText: link.watermarkText,
  });
});

app.post('/api/share/verify/:id', (req, res) => {
  const { id } = req.params;
  const { password, otp } = req.body;
  const link = db.sharedLinks[id];

  if (!link) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  if (link.passwordProtected && link.passwordHash !== password) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  if (link.otpRequired && link.otpCode !== otp) {
    return res.status(401).json({ error: 'Invalid OTP code' });
  }

  // Record access event
  link.syncEvents.unshift({
    id: `ev-${Date.now()}`,
    type: 'opened',
    timestamp: new Date().toISOString(),
    ipAddress: req.ip || '127.0.0.1'
  });

  addLog('info', 'Secure Sharing', `Access granted to shared link: ${id} for "${link.projectName}"`);

  res.json({
    success: true,
    projectData: link.projectData
  });
});

app.post('/api/share/action/:id', (req, res) => {
  const { id } = req.params;
  const { action } = req.body; // 'download' or 'print'
  const link = db.sharedLinks[id];

  if (!link) {
    return res.status(404).json({ error: 'Share link not found' });
  }

  if (action === 'download') {
    link.downloadCount++;
    db.analytics.totalDownloads++;
    link.syncEvents.unshift({
      id: `ev-${Date.now()}`,
      type: 'downloaded',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1'
    });
    addLog('info', 'Secure Sharing', `File downloaded from link ${id}`);
  } else if (action === 'print') {
    link.printCount++;
    db.analytics.totalPrints++;
    link.syncEvents.unshift({
      id: `ev-${Date.now()}`,
      type: 'printed',
      timestamp: new Date().toISOString(),
      ipAddress: req.ip || '127.0.0.1'
    });
    addLog('info', 'Secure Sharing', `Document printed directly from link ${id}`);
  }

  res.json({
    success: true,
    downloadCount: link.downloadCount,
    printCount: link.printCount
  });
});

app.get('/api/share/events/:id', (req, res) => {
  const { id } = req.params;
  const link = db.sharedLinks[id];
  if (!link) return res.status(404).json({ error: 'Not found' });
  res.json(link.syncEvents);
});

app.post('/api/share/revoke/:id', (req, res) => {
  const { id } = req.params;
  const link = db.sharedLinks[id];
  if (!link) return res.status(404).json({ error: 'Not found' });

  link.isRevoked = true;
  db.analytics.activeShares = Math.max(0, db.analytics.activeShares - 1);
  addLog('warn', 'Secure Sharing', `Revoked shared link: ${id}`);
  res.json({ success: true, isRevoked: true });
});

// Print Queue APIs (Print Shop Mode)
app.get('/api/shop/queue', (req, res) => {
  res.json(db.printQueue);
});

app.post('/api/shop/upload', (req, res) => {
  const { customerName, phone, fileName, fileSrc, colorMode, paperSize, copies } = req.body;

  if (!fileSrc || !customerName) {
    return res.status(400).json({ error: 'Missing customer name or image data' });
  }

  const queueId = `q-${Date.now()}`;
  const newItem = {
    id: queueId,
    customerName,
    phone: phone || 'N/A',
    fileName: fileName || 'scanned_upload.jpg',
    fileSrc,
    pages: 1,
    copies: copies || 1,
    colorMode: colorMode || 'color',
    paperSize: paperSize || 'A4',
    status: 'waiting',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ocrText: 'AI processing queued...',
    barcodesDetected: [],
    adjustmentsApplied: false
  };

  db.printQueue.unshift(newItem);
  addLog('info', 'Print Shop', `New document uploaded to Print Shop Queue from ${customerName}`);

  res.json({
    success: true,
    queueId,
    message: 'Your document was submitted successfully to the Print Shop!'
  });
});

app.post('/api/shop/queue/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'waiting' | 'processing' | 'printing' | 'completed' | 'cancelled'

  const item = db.printQueue.find(q => q.id === id);
  if (!item) {
    return res.status(404).json({ error: 'Queue item not found' });
  }

  item.status = status;
  item.updatedAt = new Date().toISOString();

  if (status === 'completed') {
    db.analytics.totalPrints += item.copies;
  }

  addLog('info', 'Print Queue', `Job ${id} status updated to: ${status.toUpperCase()} (${item.customerName})`);
  res.json({ success: true, status });
});

app.delete('/api/shop/queue/:id', (req, res) => {
  const { id } = req.params;
  const idx = db.printQueue.findIndex(q => q.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });

  const name = db.printQueue[idx].customerName;
  db.printQueue.splice(idx, 1);
  addLog('warn', 'Print Queue', `Deleted job ${id} from queue (${name})`);
  res.json({ success: true });
});

// Admin Metrics API
app.get('/api/admin/dashboard', (req, res) => {
  const storageSum = db.printQueue.reduce((acc, curr) => acc + (curr.fileSrc.length / (1024 * 1024)), 0) +
    Object.values(db.sharedLinks).reduce((acc, curr: any) => acc + (JSON.stringify(curr.projectData).length / (1024 * 1024)), 0);

  res.json({
    analytics: {
      ...db.analytics,
      storageUsedMb: parseFloat(storageSum.toFixed(2)) + 4.25, // offset base
      queueWaiting: db.printQueue.filter(q => q.status === 'waiting').length,
      queueProcessing: db.printQueue.filter(q => q.status === 'processing').length,
      totalQueueCount: db.printQueue.length
    },
    recentLogs: db.systemLogs.slice(0, 20),
    activeSharesList: Object.values(db.sharedLinks).map((link: any) => ({
      id: link.id,
      projectName: link.projectName,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      downloadCount: link.downloadCount,
      printCount: link.printCount,
      isRevoked: link.isRevoked
    }))
  });
});

/**
 * ==========================================
 * BOOTSTRAP EXPRESS SERVER + VITE MIDDLEWARE
 * ==========================================
 */

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    
    app.use(vite.middlewares);
    console.log('Vite middleware mounted in Development mode');
  } else {
    // Production Mode
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    
    // Serve index.html for SPA route fallback
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Static routing active in Production mode');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ID Print Studio running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
