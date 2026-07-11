import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, Sliders, Printer, ShieldCheck, Settings, 
  Sparkles, Globe, Menu, X, ArrowLeftRight, HelpCircle
} from 'lucide-react';

// Import UI Components
import Dashboard from './components/Dashboard';
import Editor from './components/Editor';
import PrintShopDashboard from './components/PrintShopDashboard';
import AdminPanel from './components/AdminPanel';
import SettingsPanel from './components/SettingsPanel';
import SharePortal from './components/SharePortal';

// Import Constants & Types
import { CARD_TEMPLATES, DEFAULT_PRINT_SETTINGS, DEFAULT_ADJUSTMENTS } from './constants';
import { PrintProject, CardTemplate } from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>(() => {
    if (typeof window !== 'undefined' && window.location.hash === '#print') {
      return 'editor';
    }
    return 'dashboard';
  });
  const [activeProject, setActiveProject] = useState<PrintProject | null>(null);
  const [recentProjects, setRecentProjects] = useState<PrintProject[]>([]);
  const [queueCount, setQueueCount] = useState(0);
  const [activeSharesCount, setActiveSharesCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Poll counters for the dashboard stats
  useEffect(() => {
    const fetchCounters = async () => {
      try {
        const qRes = await fetch('/api/shop/queue');
        if (qRes.ok) {
          const qData = await qRes.json();
          setQueueCount(qData.length || 0);
        }
        const aRes = await fetch('/api/admin/dashboard');
        if (aRes.ok) {
          const aData = await aRes.json();
          setActiveSharesCount(aData.analytics?.activeShares || 0);
        }
      } catch (e) {
        console.warn('Dashboard counters polling deferred');
      }
    };
    fetchCounters();
    const interval = setInterval(fetchCounters, 8000);
    return () => clearInterval(interval);
  }, []);

  // Initialize default project template or load from localStorage on startup
  useEffect(() => {
    try {
      const savedActive = localStorage.getItem('id_print_studio_active_project');
      const savedRecents = localStorage.getItem('id_print_studio_recent_projects');
      
      let initialActive: PrintProject | null = null;
      if (savedActive) {
        try {
          initialActive = JSON.parse(savedActive);
        } catch (e) {
          console.error('Failed to parse saved active project:', e);
        }
      }
      
      const passportTemplate = CARD_TEMPLATES.find(t => t.id === 'passport_photo') || CARD_TEMPLATES[0];
      const defaultProj: PrintProject = {
        id: 'default-project-id',
        name: 'Untitled Passport Layout',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        imageSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80',
        originalImageSrc: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80',
        templateId: passportTemplate.id,
        printSettings: {
          ...DEFAULT_PRINT_SETTINGS,
          paperSize: 'A4',
          dpi: 300,
          copies: 8,
        },
        adjustments: {
          ...DEFAULT_ADJUSTMENTS,
          brightness: 0,
          contrast: 0,
        },
        overlays: [],
        zoom: 1,
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        skewX: 0,
        skewY: 0
      };

      if (initialActive) {
        setActiveProject(initialActive);
      } else {
        setActiveProject(defaultProj);
      }

      if (savedRecents) {
        try {
          setRecentProjects(JSON.parse(savedRecents));
        } catch (e) {
          setRecentProjects(initialActive ? [initialActive] : [defaultProj]);
        }
      } else {
        setRecentProjects(initialActive ? [initialActive] : [defaultProj]);
      }
    } catch (err) {
      console.warn('LocalStorage not available or accessible:', err);
    }
  }, []);

  // New Project created from Dashboard template selection
  const handleNewProject = (template: CardTemplate, fileDataUrl?: string) => {
    const imageToUse = fileDataUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&h=400&q=80';
    const newProj: PrintProject = {
      id: `proj-${Date.now()}`,
      name: `${template.name} Project`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageSrc: imageToUse,
      originalImageSrc: imageToUse,
      templateId: template.id,
      printSettings: {
        ...DEFAULT_PRINT_SETTINGS,
        copies: template.id === 'passport_photo' ? 8 : 1
      },
      adjustments: {
        ...DEFAULT_ADJUSTMENTS
      },
      overlays: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      skewX: 0,
      skewY: 0
    };
    setActiveProject(newProj);
    setRecentProjects(prev => [newProj, ...prev].slice(0, 10));
    setCurrentTab('editor');
  };

  const handleOpenProject = (project: PrintProject) => {
    setActiveProject(project);
    setCurrentTab('editor');
  };

  // Directly edit items from the Print Shop queue
  const handleEditQueueItem = (fileSrc: string, customerName: string) => {
    const passportTemplate = CARD_TEMPLATES.find(t => t.id === 'passport_photo') || CARD_TEMPLATES[0];
    const queueProj: PrintProject = {
      id: `queue-${Date.now()}`,
      name: `Queue: ${customerName}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      imageSrc: fileSrc,
      originalImageSrc: fileSrc,
      templateId: passportTemplate.id,
      printSettings: {
        ...DEFAULT_PRINT_SETTINGS,
        copies: 8,
      },
      adjustments: {
        ...DEFAULT_ADJUSTMENTS,
        brightness: 0,
        contrast: 0,
      },
      overlays: [],
      zoom: 1,
      panX: 0,
      panY: 0,
      rotation: 0,
      flipH: false,
      flipV: false,
      skewX: 0,
      skewY: 0
    };
    setActiveProject(queueProj);
    setRecentProjects(prev => [queueProj, ...prev].slice(0, 10));
    setCurrentTab('editor');
  };

  // Menu items list
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'editor', label: 'Photoshop Editor', icon: Sliders },
    { id: 'shop', label: 'Print Shop Kiosk', icon: Printer },
    { id: 'admin', label: 'Admin Logs', icon: ShieldCheck },
    { id: 'settings', label: 'Settings', icon: Settings },
    { id: 'portal', label: 'Share Portal', icon: Globe },
  ];

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex flex-col font-sans select-none antialiased">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => setCurrentTab('dashboard')}>
            <div className="w-8 h-8 bg-indigo-600 text-white rounded flex items-center justify-center font-bold">
              <span className="text-sm">ID</span>
            </div>
            <div>
              <span className="font-display font-bold text-gray-700 text-xs uppercase tracking-tight block">Print Studio <span className="text-indigo-600 ml-0.5">Pro</span></span>
              <span className="text-[9px] text-gray-400 font-bold tracking-widest uppercase block -mt-1 font-mono">PROJECT: ACTIVE_BATCH.IDP</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-gray-100 p-1 rounded-md border border-gray-200">
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentTab(item.id)}
                  className={`px-3 py-1.5 rounded text-xs font-semibold tracking-tight transition flex items-center gap-1.5 ${
                    isActive 
                      ? 'bg-white text-gray-800 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800 hover:bg-white/50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-indigo-600' : 'text-gray-400'}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Quick status counter */}
          <div className="hidden md:flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-gray-500 bg-gray-100 border border-gray-200 px-2 py-1 rounded font-mono uppercase">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              Gemini Vision Enabled
            </span>
          </div>

          {/* Mobile menu icon */}
          <button 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded lg:hidden transition"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="lg:hidden bg-white border-b border-gray-200 shadow-lg fixed top-14 left-0 right-0 z-30 p-3 space-y-1.5 no-print"
          >
            {navItems.map(item => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setCurrentTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-3 py-2 rounded text-xs font-bold transition flex items-center gap-2 ${
                    isActive 
                      ? 'bg-indigo-50 text-indigo-600' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* VIEW CONTROLLERS */}
      <main className="flex-1 py-6 overflow-x-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
          >
            {currentTab === 'dashboard' && (
              <Dashboard 
                onNewProject={handleNewProject}
                onOpenProject={handleOpenProject}
                onNavigate={setCurrentTab}
                recentProjects={recentProjects}
                queueCount={queueCount}
                activeSharesCount={activeSharesCount}
              />
            )}

            {currentTab === 'editor' && activeProject && (
              <Editor 
                project={activeProject}
                onBack={() => setCurrentTab('dashboard')}
                onSave={(updated) => {
                  setActiveProject(updated);
                  setRecentProjects(prev => {
                    const filtered = prev.filter(p => p.id !== updated.id);
                    const newRecents = [updated, ...filtered].slice(0, 10);
                    try {
                      localStorage.setItem('id_print_studio_recent_projects', JSON.stringify(newRecents));
                    } catch (e) {
                      console.warn('Recent projects localStorage write failed:', e);
                    }
                    return newRecents;
                  });
                  try {
                    localStorage.setItem('id_print_studio_active_project', JSON.stringify(updated));
                  } catch (e) {
                    console.warn('Active project localStorage write failed:', e);
                  }
                }}
              />
            )}

            {currentTab === 'shop' && (
              <PrintShopDashboard 
                onEditQueueItem={handleEditQueueItem}
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'admin' && (
              <AdminPanel 
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'settings' && (
              <SettingsPanel 
                onNavigate={setCurrentTab}
              />
            )}

            {currentTab === 'portal' && (
              <SharePortal 
                forcedMode="upload"
                onNavigate={setCurrentTab}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="py-4 border-t border-gray-200 text-center text-[9px] text-gray-400 font-bold font-mono uppercase no-print">
        ID Print Studio • Crafting Professional Print Geometry with Server-Side Gemini API
      </footer>

    </div>
  );
}
