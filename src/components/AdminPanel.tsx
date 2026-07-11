import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, Users, Share2, Printer, Shield, FileText, Settings, Trash2, 
  Trash, XCircle, RefreshCw, Layout, Database, Activity, HardDrive, ListFilter,
  AlertTriangle
} from 'lucide-react';
import { SystemLog } from '../types';

interface AdminPanelProps {
  onNavigate: (tab: string) => void;
}

export default function AdminPanel({ onNavigate }: AdminPanelProps) {
  const [stats, setStats] = useState<any>({
    totalProjects: 0,
    activeShares: 0,
    totalPrints: 0,
    totalDownloads: 0,
    storageUsedMb: 0,
    queueWaiting: 0,
    queueProcessing: 0,
    totalQueueCount: 0
  });
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [sharesList, setSharesList] = useState<any[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [logFilter, setLogFilter] = useState<string>('all');

  const fetchAdminData = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch('/api/admin/dashboard');
      const data = await res.json();
      setStats(data.analytics || {});
      setLogs(data.recentLogs || []);
      setSharesList(data.activeSharesList || []);
    } catch (e) {
      console.error('Failed to reload admin metrics.');
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
    const interval = setInterval(fetchAdminData, 6000);
    return () => clearInterval(interval);
  }, []);

  // Revoke Share URL Link
  const handleRevokeShare = async (id: string) => {
    if (!confirm('Are you sure you want to revoke this secure link? Recipients will instantly lose all access.')) return;
    try {
      const res = await fetch(`/api/share/revoke/${id}`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (e) {
      alert('Failed to revoke link.');
    }
  };

  const filteredLogs = logs.filter(log => {
    if (logFilter === 'all') return true;
    return log.level === logFilter;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight flex items-center gap-2.5">
            <Shield className="w-6 h-6 text-indigo-600" />
            Studio Administration Dashboard
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Control panel for logs, shared link directories, storage metrics, and analytics.</p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={fetchAdminData}
            className={`p-2 bg-white border border-slate-200 rounded hover:bg-slate-50 text-slate-600 transition flex items-center gap-1.5 text-xs font-semibold ${
              isRefreshing ? 'opacity-75' : ''
            }`}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh Logs
          </button>
          
          <button 
            onClick={() => onNavigate('dashboard')}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded text-xs transition shadow-sm"
          >
            Main Console
          </button>
        </div>
      </div>

      {/* Analytics Bento Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Prints */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-indigo-50 text-indigo-600 rounded">
            <Printer className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <span className="text-slate-500 text-xs block font-medium">Accumulated Prints</span>
            <span className="text-2xl font-bold text-slate-850 font-mono block">{stats.totalPrints}</span>
            <span className="text-[10px] text-indigo-600 block font-semibold">Tiled Copies Processed</span>
          </div>
        </div>

        {/* Active Shares */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-purple-50 text-purple-600 rounded">
            <Share2 className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <span className="text-slate-500 text-xs block font-medium">Active Secure Shares</span>
            <span className="text-2xl font-bold text-slate-850 font-mono block">{stats.activeShares}</span>
            <span className="text-[10px] text-purple-500 block font-semibold">Password/OTP links online</span>
          </div>
        </div>

        {/* Total Inbound Downloads */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-emerald-50 text-emerald-600 rounded">
            <FileText className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <span className="text-slate-500 text-xs block font-medium">Portal Downloads Logged</span>
            <span className="text-2xl font-bold text-slate-850 font-mono block">{stats.totalDownloads}</span>
            <span className="text-[10px] text-emerald-500 block font-semibold">Counter downloads logged</span>
          </div>
        </div>

        {/* Storage Size */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-orange-50 text-orange-600 rounded">
            <HardDrive className="w-5 h-5" />
          </div>
          <div className="space-y-2">
            <span className="text-slate-500 text-xs block font-medium">Upload Temp Storage</span>
            <span className="text-2xl font-bold text-slate-850 font-mono block">{stats.storageUsedMb} MB</span>
            <span className="text-[10px] text-orange-500 block font-semibold">Auto-purging temp files</span>
          </div>
        </div>

      </div>

      {/* Main split: Secure Share Links list + System Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Secure Shares Directory */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <Share2 className="w-4 h-4 text-indigo-500" />
                Active Sharing Directory
              </h3>
              <span className="text-[10px] font-mono text-slate-400">Total Shares: {sharesList.length}</span>
            </div>

            {sharesList.length === 0 ? (
              <div className="text-center py-12 text-slate-400 flex flex-col items-center justify-center">
                <Share2 className="w-10 h-10 text-slate-200 mb-2 animate-pulse" />
                <p className="text-xs font-semibold">No active shared links found</p>
                <p className="text-[10px] text-slate-400 leading-normal max-w-xs mt-0.5">
                  Generate share links inside the Photoshop Editor to view access events here.
                </p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[350px] overflow-y-auto">
                {sharesList.map(share => (
                  <div 
                    key={share.id}
                    className={`p-4 rounded-xl border flex items-center justify-between gap-4 ${
                      share.isRevoked ? 'bg-slate-50/50 border-slate-100 opacity-60' : 'bg-white border-slate-100'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-800 text-xs truncate">{share.projectName}</h4>
                        {share.isRevoked && (
                          <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-600 text-[8px] font-bold uppercase">
                            Revoked
                          </span>
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-x-4 text-[10px] text-slate-400 font-medium">
                        <span>ID: {share.id}</span>
                        <span>Prints: {share.printCount}</span>
                        <span>Downloads: {share.downloadCount}</span>
                      </div>
                    </div>

                    {!share.isRevoked && (
                      <button 
                        onClick={() => handleRevokeShare(share.id)}
                        className="p-1.5 hover:bg-red-50 text-slate-400 hover:text-red-500 border border-slate-100 rounded-lg transition"
                        title="Revoke Share URL immediately"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="pt-4 border-t border-slate-50 text-[10px] text-slate-400 flex gap-4">
            <span>OTP Required: Dynamic checks active</span>
            <span>Link Expiry: Max 24H from creation</span>
          </div>
        </div>

        {/* System Logs console */}
        <div className="lg:col-span-1 bg-slate-900 text-white rounded-lg p-5 border border-slate-800 shadow-xl flex flex-col h-[400px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="font-bold text-xs flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              Runtime Logs Stream
            </h3>
            
            <select
              value={logFilter}
              onChange={(e) => setLogFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-2 py-0.5 text-[9px] text-slate-300"
            >
              <option value="all">All Logs</option>
              <option value="info">Info</option>
              <option value="warn">Warn</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div className="flex-1 overflow-y-auto pt-3 space-y-2.5 font-mono text-[9px] text-slate-300">
            {filteredLogs.map(log => (
              <div key={log.id} className="space-y-0.5">
                <div className="flex justify-between text-slate-500">
                  <span>[{log.category.toUpperCase()}]</span>
                  <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
                <p className={`leading-relaxed ${
                  log.level === 'error' ? 'text-red-400 font-bold' :
                  log.level === 'warn' ? 'text-amber-400 font-bold' : 'text-slate-300'
                }`}>
                  ● {log.message}
                </p>
              </div>
            ))}
          </div>
        </div>

      </div>

    </div>
  );
}
