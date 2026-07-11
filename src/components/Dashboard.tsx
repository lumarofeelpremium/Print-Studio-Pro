import React, { useState } from 'react';
import { motion } from 'motion/react';
import { 
  FilePlus, 
  FolderOpen, 
  FileText, 
  Layout, 
  Layers, 
  Share2, 
  Printer, 
  Settings, 
  ArrowRight, 
  UploadCloud, 
  Camera, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  Activity, 
  Sparkles,
  QrCode,
  Users,
  ShieldCheck,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import { CARD_TEMPLATES } from '../constants';
import { CardTemplate, PrintProject } from '../types';

interface DashboardProps {
  onNewProject: (template: CardTemplate, fileDataUrl?: string) => void;
  onOpenProject: (project: PrintProject) => void;
  onNavigate: (tab: string) => void;
  recentProjects: PrintProject[];
  queueCount: number;
  activeSharesCount: number;
}

export default function Dashboard({ 
  onNewProject, 
  onOpenProject, 
  onNavigate, 
  recentProjects, 
  queueCount,
  activeSharesCount
}: DashboardProps) {
  const [dragActive, setDragActive] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<'All' | 'ID Cards' | 'Government' | 'Photos'>('All');

  // Filter templates
  const filteredTemplates = CARD_TEMPLATES.filter(
    t => selectedCategory === 'All' || t.category === selectedCategory
  );

  // Native File Drop Handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      processFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        // Default to a general employee card template or let user select
        const defaultTemplate = CARD_TEMPLATES.find(t => t.id === 'employee_card') || CARD_TEMPLATES[0];
        onNewProject(defaultTemplate, event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6">
      
      {/* Dynamic Animated Hero Greeting */}
      <div className="relative overflow-hidden rounded-2xl bg-radial from-slate-900 via-slate-950 to-black p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-60 h-60 bg-indigo-500/5 rounded-full blur-3xl" />
        
        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-slate-700/50 text-xs text-indigo-400 font-medium tracking-wide">
            <Sparkles className="w-3.5 h-3.5" />
            Gemini 3.5 Pro Vision Active Engine
          </div>
          
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight leading-tight">
            Professional ID Editing &amp; Precision Print Studio
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm leading-relaxed">
            Upload, enhance, adjust perspective, and tile print jobs automatically. Features offline-first crop rulers, smart grid layouts, and real-time remote upload portals.
          </p>

          <div className="flex flex-wrap gap-2.5 pt-1">
            <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-semibold transition shadow-sm cursor-pointer">
              <UploadCloud className="w-4 h-4" />
              Upload Image/PDF
              <input 
                type="file" 
                accept="image/*,application/pdf" 
                className="hidden" 
                onChange={handleFileChange} 
              />
            </label>
            <button 
              onClick={() => onNewProject(CARD_TEMPLATES[0])}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition"
            >
              <FilePlus className="w-4 h-4" />
              Blank Canvas
            </button>
          </div>
        </div>
      </div>

      {/* Stats Quick-Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Printer className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Print Engine</div>
            <div className="text-xs font-bold text-gray-800">300/600/1200 DPI</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Print Queue</div>
            <div className="text-xs font-bold text-gray-800">{queueCount} Job(s) Active</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-lg">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Active Shares</div>
            <div className="text-xs font-bold text-gray-800">{activeSharesCount} Secure Link(s)</div>
          </div>
        </div>
        <div className="bg-white border border-gray-200 p-4 rounded-xl flex items-center gap-3 shadow-xs">
          <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">AI Accel</div>
            <div className="text-xs font-bold text-gray-800">GPU Accelerated</div>
          </div>
        </div>
      </div>

      {/* Main Grid: Actions + Drag Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Quick Actions Panel */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-500" />
              Quick Action Studio
            </h2>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <button 
              onClick={() => onNewProject(CARD_TEMPLATES[0])}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                <FilePlus className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">New Project</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Create blank ID print</span>
            </button>

            <button 
              onClick={() => onNavigate('editor')}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                <FolderOpen className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">Open Editor</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Photoshop Workspace</span>
            </button>

            <button 
              onClick={() => {
                const template = CARD_TEMPLATES.find(t => t.id === 'passport_photo') || CARD_TEMPLATES[0];
                onNewProject(template);
              }}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition">
                <FileText className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">Passport &amp; Visas</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Multi-photo arrays</span>
            </button>

            <button 
              onClick={() => onNavigate('shop')}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                <QrCode className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">Print Shop Mode</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Counter uploads QR</span>
            </button>

            <button 
              onClick={() => onNavigate('admin')}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">Admin Dashboard</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Usage &amp; logs</span>
            </button>

            <button 
              onClick={() => onNavigate('settings')}
              className="flex flex-col items-start p-4 bg-white border border-gray-200 rounded-xl hover:border-indigo-500 hover:shadow-sm transition text-left group"
            >
              <div className="p-2 bg-slate-100 text-slate-600 rounded-lg group-hover:bg-slate-700 group-hover:text-white transition">
                <Settings className="w-4 h-4" />
              </div>
              <span className="font-bold text-gray-800 text-xs mt-3">System Settings</span>
              <span className="text-gray-400 text-[10px] mt-0.5">Themes, printer presets</span>
            </button>
          </div>
        </div>

        {/* Drag-and-drop Image Capture Portal */}
        <div className="lg:col-span-1">
          <div 
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            className={`h-full min-h-[220px] bg-slate-50 border-2 border-dashed rounded-xl flex flex-col items-center justify-center p-5 text-center transition cursor-pointer relative ${
              dragActive ? 'border-indigo-500 bg-indigo-50/50 scale-[1.01]' : 'border-gray-250 hover:bg-slate-100/50'
            }`}
          >
            <input 
              type="file" 
              id="drag-file-upload" 
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full" 
              onChange={handleFileChange}
              accept="image/*"
            />
            <div className="p-3 bg-white rounded-full shadow-xs mb-2 text-slate-400">
              <UploadCloud className="w-6 h-6 text-indigo-500" />
            </div>
            <h3 className="font-bold text-gray-850 text-xs">Drag &amp; Drop Scan File</h3>
            <p className="text-gray-500 text-[10px] max-w-[180px] mt-0.5 leading-relaxed">
              Drop any photo or ID scan to instantly auto-crop &amp; enhance.
            </p>
            <div className="mt-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-white border border-gray-200 rounded-md text-[9px] font-medium text-gray-500">
              <Camera className="w-3 h-3 text-indigo-500" />
              Camera Capture Available
            </div>
          </div>
        </div>
      </div>

      {/* Standard Templates Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
              <Layout className="w-4 h-4 text-indigo-500" />
              Standard ID Card Templates
            </h2>
            <p className="text-gray-500 text-[10px] mt-0.5">Choose a pre-measured card template optimized for standard wallets.</p>
          </div>

          <div className="flex flex-wrap gap-1 bg-gray-100 p-1 rounded-lg">
            {(['All', 'ID Cards', 'Government', 'Photos'] as const).map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider transition ${
                  selectedCategory === cat 
                    ? 'bg-white text-gray-800 shadow-xs' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map(template => (
            <div 
              key={template.id}
              className="bg-white border border-gray-200 hover:border-indigo-500 hover:shadow-sm rounded-xl p-4 transition group relative flex flex-col justify-between"
            >
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase ${
                    template.category === 'ID Cards' ? 'bg-indigo-50 text-indigo-600' :
                    template.category === 'Government' ? 'bg-orange-50 text-orange-600' :
                    template.category === 'Photos' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
                  }`}>
                    {template.category}
                  </span>
                  <span className="text-[9px] text-gray-400 font-mono font-bold">
                    {template.widthMm}x{template.heightMm} mm
                  </span>
                </div>
                <h3 className="font-bold text-gray-800 text-xs group-hover:text-indigo-600 transition">
                  {template.name}
                </h3>
                <p className="text-gray-500 text-[11px] leading-normal line-clamp-2">
                  {template.description}
                </p>
              </div>

              <div className="pt-3 mt-3 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[9px] font-bold text-gray-400 font-mono">
                  {template.defaultDpi} DPI Output
                </span>
                <button 
                  onClick={() => onNewProject(template)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 hover:text-indigo-700 transition"
                >
                  Configure
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Section: Recent Projects + Print Shop Walkthrough */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Recent Projects */}
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-500" />
            Recent Studio Projects
          </h2>

          {recentProjects.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-slate-400 flex flex-col items-center justify-center">
              <FileText className="w-8 h-8 mb-2 text-slate-200" />
              <p className="text-xs font-bold text-slate-600">No recent projects found</p>
              <p className="text-[10px] text-slate-400 max-w-xs mt-0.5 leading-relaxed">
                Your edited projects are cached locally. Start editing an ID card to see recent history.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {recentProjects.slice(0, 4).map(proj => (
                <div 
                  key={proj.id}
                  onClick={() => onOpenProject(proj)}
                  className="bg-white border border-gray-200 hover:border-gray-300 hover:shadow-xs p-3 rounded-xl flex gap-3 items-center cursor-pointer transition group"
                >
                  <div className="w-12 h-9 bg-slate-50 rounded-lg overflow-hidden border border-gray-100 flex items-center justify-center relative">
                    <img src={proj.imageSrc} alt={proj.name} className="object-cover w-full h-full" referrerPolicy="no-referrer" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-gray-800 text-xs truncate group-hover:text-indigo-600 transition">
                      {proj.name}
                    </h4>
                    <span className="text-[9px] text-gray-400 block mt-0.5">
                      Updated {new Date(proj.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-600 transition-transform group-hover:translate-x-0.5" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Print Shop Promo Panel */}
        <div className="lg:col-span-1 bg-gradient-to-br from-slate-900 to-black rounded-2xl p-5 text-white border border-slate-850 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-bold text-emerald-400 tracking-wider uppercase">
              <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
              Print Shop Active
            </div>
            <h3 className="text-base font-bold tracking-tight">Need direct customer uploads?</h3>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Each installation has a unique permanent QR code. Place it on your counter: customers scan it, select files, and watch them stream into your dashboard instantly!
            </p>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-lg p-1.5 flex items-center justify-center shrink-0 shadow-lg">
              <div className="w-full h-full flex flex-col justify-between">
                <div className="h-1 bg-slate-900 w-full" />
                <div className="h-1 bg-slate-900 w-3/4" />
                <div className="h-2 bg-slate-900 w-1/2" />
                <div className="h-1 bg-slate-900 w-full" />
                <div className="h-1 bg-slate-900 w-5/6" />
              </div>
            </div>
            <div>
              <button 
                onClick={() => onNavigate('shop')}
                className="text-xs font-bold text-white hover:text-indigo-400 transition flex items-center gap-1"
              >
                Launch Console
                <ArrowRight className="w-3 h-3" />
              </button>
              <p className="text-[10px] text-slate-500 mt-0.5">No client-side apps needed.</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
