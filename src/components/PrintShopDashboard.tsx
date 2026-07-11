import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Printer, QrCode, Search, Filter, Play, CheckCircle2, XCircle, Trash2,
  Clock, Eye, User, Phone, FileText, ChevronRight, RefreshCw, Layers, Sliders,
  Sparkles, ExternalLink, MessageSquare, AlertCircle
} from 'lucide-react';
import { PrintQueueItem } from '../types';

interface PrintShopDashboardProps {
  onEditQueueItem: (fileSrc: string, customerName: string) => void;
  onNavigate: (tab: string) => void;
}

export default function PrintShopDashboard({ onEditQueueItem, onNavigate }: PrintShopDashboardProps) {
  const [queue, setQueue] = useState<PrintQueueItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Detail preview Modal
  const [activePreviewItem, setActivePreviewItem] = useState<PrintQueueItem | null>(null);
  const [notificationMsg, setNotificationMsg] = useState<string>('');

  // Fetch queue from full-stack endpoint
  const fetchQueue = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/shop/queue');
      const data = await res.json();
      setQueue(data);
    } catch (e) {
      console.error('Failed to reload print queue.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchQueue();
    // Poll every 5 seconds for simulation of real-time sync!
    const interval = setInterval(fetchQueue, 5000);
    return () => clearInterval(interval);
  }, []);

  // Update Item Status
  const handleStatusUpdate = async (id: string, nextStatus: string) => {
    try {
      const res = await fetch(`/api/shop/queue/${id}/status`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus })
      });
      const data = await res.json();
      if (data.success) {
        // Trigger notification simulated SMS alert
        let pickupNote = '';
        if (nextStatus === 'processing') pickupNote = 'Document enhancement and layout alignment in progress.';
        else if (nextStatus === 'printing') pickupNote = 'Your ID is on the active print carousel.';
        else if (nextStatus === 'completed') pickupNote = 'Your print job is ready for pickup at counter 1!';
        else if (nextStatus === 'cancelled') pickupNote = 'Your print order was cancelled.';

        if (pickupNote) {
          const item = queue.find(q => q.id === id);
          if (item) {
            setNotificationMsg(`SMS ALERT Sent to ${item.customerName} (${item.phone}): "${pickupNote}"`);
            setTimeout(() => setNotificationMsg(''), 6000);
          }
        }
        fetchQueue();
      }
    } catch (e) {
      alert('Failed to modify job status');
    }
  };

  // Delete Item
  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to remove this customer job from the queue?')) return;
    try {
      const res = await fetch(`/api/shop/queue/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchQueue();
        if (activePreviewItem?.id === id) setActivePreviewItem(null);
      }
    } catch (e) {
      alert('Delete failed.');
    }
  };

  // Search & Filter local logic
  const filteredQueue = queue.filter(item => {
    const matchesSearch = 
      item.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.phone.includes(searchQuery) ||
      item.fileName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Dynamic SMS alert notifications banner */}
      <AnimatePresence>
        {notificationMsg && (
          <motion.div 
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -50, opacity: 0 }}
            className="bg-emerald-600 border border-emerald-500 shadow-xl text-white p-4 rounded-2xl flex items-center gap-3 z-50 relative"
          >
            <MessageSquare className="w-5 h-5 animate-bounce shrink-0" />
            <div className="text-xs">
              <span className="font-bold uppercase tracking-wider block text-[10px] opacity-75">Customer Notification Engine</span>
              <span>{notificationMsg}</span>
            </div>
            <button onClick={() => setNotificationMsg('')} className="ml-auto text-emerald-200 hover:text-white font-bold text-sm">
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header Banner Mode */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Printer className="w-6 h-6 text-indigo-600" />
            Xerox &amp; Print Shop Mode Console
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Real-time sync queue for inbound local wifi customer uploads.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            onClick={fetchQueue}
            className={`p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold ${
              isRefreshing ? 'opacity-70' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Queue
          </button>

          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs transition shadow-sm"
          >
            Back to Studio
          </button>
        </div>
      </div>

      {/* Grid: Print counter permanent QR display + Active Queue List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Permanent Countertop QR Placement Flyer Card */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 via-slate-950 to-black text-white p-6 rounded-lg border border-slate-850 shadow-xl flex flex-col justify-between">
          <div className="space-y-4 text-center">
            <div className="inline-flex items-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-bold uppercase tracking-wider text-[9px] px-2.5 py-1 rounded">
              <QrCode className="w-3.5 h-3.5" />
              Countertop Flyer QR Code
            </div>
            <h3 className="text-base font-bold tracking-tight">Generate uploads instantly</h3>
            <p className="text-slate-400 text-xs leading-relaxed max-w-xs mx-auto">
              Customers scan this code on their phones, drag documents on the portal page, and their uploads appear in your print queue immediately. No installs.
            </p>
          </div>

          <div className="my-6 bg-white p-4 rounded-lg max-w-[180px] mx-auto shadow-2xl border border-slate-800 flex flex-col items-center gap-2">
            <QrCode className="w-32 h-32 text-slate-950" />
            <span className="font-mono text-[9px] text-slate-500 font-bold uppercase tracking-widest">SCAN TO PRINT</span>
          </div>

          <div className="space-y-2 pt-4 border-t border-slate-900 text-center">
            <span className="text-[10px] text-slate-500 block">Print upload server portal address:</span>
            <span className="text-xs font-mono text-indigo-400 font-bold block select-all">
              {window.location.origin}/share/shop-portal
            </span>
            <a 
              href="/share/shop-portal" 
              target="_blank" 
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-300 hover:text-white transition mt-2 bg-slate-800 px-3 py-1.5 rounded border border-slate-700/60"
            >
              Open Customer Portal Tab
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        {/* Live Queue list */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar */}
          <div className="bg-white border border-slate-200 p-4 rounded-lg shadow-sm flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input 
                type="text" 
                placeholder="Search queue by customer, phone, or file..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5 bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'all', label: 'All Jobs' },
                { id: 'waiting', label: 'Pending' },
                { id: 'processing', label: 'Working' },
                { id: 'completed', label: 'Done' }
              ].map(p => (
                <button
                  key={p.id}
                  onClick={() => setStatusFilter(p.id)}
                  className={`px-3 py-1.5 rounded text-[10px] font-bold tracking-wider transition uppercase ${
                    statusFilter === p.id ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-850'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Queue Items List */}
          <div className="space-y-3">
            {filteredQueue.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-lg p-12 text-center text-slate-400 flex flex-col items-center justify-center">
                <Printer className="w-12 h-12 mb-3 text-slate-200 animate-pulse" />
                <p className="text-sm font-bold text-slate-700">No active print jobs</p>
                <p className="text-xs text-slate-400 max-w-xs mt-1 leading-relaxed">
                  The print queue is empty. Scan the countertop QR code on a mobile device to test uploading.
                </p>
              </div>
            ) : (
              filteredQueue.map(item => (
                <div 
                  key={item.id}
                  className={`bg-white border hover:shadow-md rounded-lg p-4 sm:p-5 transition flex flex-col sm:flex-row items-start sm:items-center gap-4 ${
                    item.status === 'completed' ? 'border-emerald-100 bg-emerald-50/5' :
                    item.status === 'processing' ? 'border-amber-100 bg-amber-50/5 animate-pulse' :
                    item.status === 'cancelled' ? 'border-slate-200 opacity-60' : 'border-slate-200'
                  }`}
                >
                  {/* Snapshot Thumbnail Preview */}
                  <div className="w-16 h-16 rounded border border-slate-200 overflow-hidden shrink-0 bg-slate-50 flex items-center justify-center cursor-pointer" onClick={() => setActivePreviewItem(item)}>
                    <img src={item.fileSrc} alt={item.fileName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>

                  {/* Customer Information details */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{item.customerName}</h4>
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase ${
                        item.status === 'waiting' ? 'bg-indigo-50 text-indigo-600' :
                        item.status === 'processing' ? 'bg-amber-50 text-amber-600' :
                        item.status === 'printing' ? 'bg-purple-50 text-purple-600' :
                        item.status === 'completed' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[11px] text-slate-400 font-medium">
                      <span className="flex items-center gap-1 shrink-0">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {item.phone}
                      </span>
                      <span className="flex items-center gap-1 shrink-0 truncate max-w-[150px]">
                        <FileText className="w-3 h-3 text-slate-400" />
                        {item.fileName}
                      </span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div className="flex items-center gap-3 pt-1 text-[10px] text-slate-500 font-semibold font-mono">
                      <span>Copies: {item.copies}</span>
                      <span>Paper: {item.paperSize}</span>
                      <span>Mode: {item.colorMode === 'color' ? 'Color' : 'Mono/B&W'}</span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0 justify-end pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                    <button 
                      onClick={() => setActivePreviewItem(item)}
                      className="p-2 hover:bg-slate-50 rounded text-slate-500 hover:text-slate-700 transition"
                      title="Inspect &amp; Analyze"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => onEditQueueItem(item.fileSrc, item.customerName)}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-semibold rounded text-[10px] tracking-wider uppercase transition"
                      title="Load File in Photoshop Canvas"
                    >
                      Open in Studio
                    </button>

                    <div className="h-4 w-px bg-slate-150 hidden sm:block" />

                    {item.status === 'waiting' && (
                      <button 
                        onClick={() => handleStatusUpdate(item.id, 'processing')}
                        className="p-2 bg-amber-50 hover:bg-amber-100 rounded-lg text-amber-600 transition"
                        title="Acquire job &amp; begin adjustments"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                    )}

                    {item.status === 'processing' && (
                      <button 
                        onClick={() => handleStatusUpdate(item.id, 'completed')}
                        className="p-2 bg-emerald-50 hover:bg-emerald-100 rounded-lg text-emerald-600 transition"
                        title="Finalize printing and complete layout"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}

                    <button 
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition"
                      title="Delete Customer item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>

      </div>

      {/* DETAIL INSPECT PREVIEW MODAL */}
      <AnimatePresence>
        {activePreviewItem && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-lg w-full max-w-2xl overflow-hidden shadow-2xl text-white flex flex-col"
            >
              
              <div className="p-5 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h3 className="font-semibold text-sm">{activePreviewItem.customerName}</h3>
                    <span className="text-[10px] text-slate-400 font-mono">{activePreviewItem.phone}</span>
                  </div>
                </div>
                <button onClick={() => setActivePreviewItem(null)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-y-auto max-h-[450px]">
                {/* Full-size image display */}
                <div className="space-y-2">
                  <div className="bg-black/40 rounded-lg overflow-hidden border border-slate-800 p-2 aspect-video flex items-center justify-center">
                    <img src={activePreviewItem.fileSrc} alt="inspect preview" className="max-w-full max-h-48 object-contain rounded-lg" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-slate-500">
                    <span>Uploaded: {new Date(activePreviewItem.createdAt).toLocaleString()}</span>
                    <span>Status: <span className="font-bold text-slate-300">{activePreviewItem.status.toUpperCase()}</span></span>
                  </div>
                </div>

                {/* AI Document analysis & metadata layout */}
                <div className="space-y-4 text-xs">
                  
                  {/* Status update widget */}
                  <div className="bg-slate-950 p-3.5 rounded-lg border border-slate-850 space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Advance Job Status</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(activePreviewItem.id, 'waiting')}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase border transition ${
                          activePreviewItem.status === 'waiting' ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Pending
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(activePreviewItem.id, 'processing')}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase border transition ${
                          activePreviewItem.status === 'processing' ? 'bg-amber-600 border-amber-500 text-white animate-pulse' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Working
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(activePreviewItem.id, 'printing')}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase border transition ${
                          activePreviewItem.status === 'printing' ? 'bg-purple-600 border-purple-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Printing
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(activePreviewItem.id, 'completed')}
                        className={`py-1.5 rounded text-[10px] font-bold uppercase border transition ${
                          activePreviewItem.status === 'completed' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        Done
                      </button>
                    </div>
                  </div>

                  {/* OCR & Document Details info list */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-indigo-400" />
                      Gemini Auto-Extracted details
                    </span>
                    
                    <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-[10px] space-y-1.5 text-slate-300">
                      <div><span className="text-slate-500">Document Class:</span> Standard Driver Permit</div>
                      <div><span className="text-slate-500">Full Name:</span> MARCUS AURELIUS</div>
                      <div><span className="text-slate-500">Barcodes Detected:</span> 982123882</div>
                      <p className="text-[9px] text-slate-500 border-t border-slate-800/80 pt-1.5 mt-2 leading-relaxed">
                        {activePreviewItem.ocrText || 'Analyzing document context structure...'}
                      </p>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action buttons */}
              <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-between gap-3">
                <button 
                  onClick={() => handleDeleteItem(activePreviewItem.id)}
                  className="px-4 py-2 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded font-semibold transition flex items-center gap-1.5 text-xs"
                >
                  <Trash2 className="w-4 h-4" /> Delete Job
                </button>
                <button 
                  onClick={() => {
                    onEditQueueItem(activePreviewItem.fileSrc, activePreviewItem.customerName);
                    setActivePreviewItem(null);
                  }}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition flex items-center gap-1.5 text-xs"
                >
                  Open in photoshop Editor <ChevronRight className="w-4 h-4" />
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
