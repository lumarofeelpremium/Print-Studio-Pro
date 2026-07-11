import React, { useState } from 'react';
import { 
  Settings, Printer, Sliders, Keyboard, ShieldAlert, Cpu, Sparkles, Check, 
  Moon, Sun, Languages, Eye, HelpCircle, HardDrive
} from 'lucide-react';

interface SettingsPanelProps {
  onNavigate: (tab: string) => void;
}

export default function SettingsPanel({ onNavigate }: SettingsPanelProps) {
  const [defaultPrinter, setDefaultPrinter] = useState('System High-Res PDF Driver');
  const [defaultPaperSize, setDefaultPaperSize] = useState('A4');
  const [defaultDpi, setDefaultDpi] = useState('300');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSaveSettings = () => {
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto px-4 sm:px-6 select-none text-xs">
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 tracking-tight flex items-center gap-2">
            <Settings className="w-5 h-5 text-indigo-600" />
            System Preferences
          </h1>
          <p className="text-slate-500 text-[10px] mt-0.5">Configure default printer margins, DPI speeds, and workspace layouts.</p>
        </div>

        <button 
          onClick={() => onNavigate('dashboard')}
          className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-xs transition border border-slate-200"
        >
          Main Dashboard
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6 shadow-sm space-y-6">
        
        {/* Settings Block: Default layout */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
            <Printer className="w-4 h-4 text-indigo-500" />
            Printer &amp; Quality Presets
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold">Primary Output Device</span>
              <input 
                type="text" 
                value={defaultPrinter}
                onChange={(e) => setDefaultPrinter(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-indigo-500 text-slate-800"
              />
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold">Standard Paper Size</span>
              <select
                value={defaultPaperSize}
                onChange={(e) => setDefaultPaperSize(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-none text-slate-800"
              >
                <option value="A4">A4 Standard Sheet</option>
                <option value="Letter">US Letter</option>
                <option value="PVC_Card">Thermal PVC Badge</option>
              </select>
            </div>

            <div className="space-y-1">
              <span className="text-slate-500 block font-semibold">Default DPI Speed</span>
              <select
                value={defaultDpi}
                onChange={(e) => setDefaultDpi(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded focus:outline-none text-slate-800"
              >
                <option value="300">300 DPI Standard Printing</option>
                <option value="600">600 DPI High Definition</option>
                <option value="1200">1200 DPI Studio Quality</option>
              </select>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div className="space-y-0.5">
                <span className="font-semibold block text-slate-700">Project Auto-Save</span>
                <span className="text-[10px] text-slate-400 block">Saves edited steps to local cache every 60s</span>
              </div>
              <input 
                type="checkbox"
                checked={autoSaveEnabled}
                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Settings Block: General Theme preferences */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
            <Sliders className="w-4 h-4 text-indigo-500" />
            General Preferences
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div className="space-y-0.5 flex items-center gap-2.5">
                {darkMode ? <Moon className="w-4 h-4 text-slate-500" /> : <Sun className="w-4 h-4 text-slate-500" />}
                <div>
                  <span className="font-semibold block text-slate-700">Interface Dark Mode</span>
                  <span className="text-[10px] text-slate-400 block">Switch workspace style to dark theme</span>
                </div>
              </div>
              <input 
                type="checkbox"
                checked={darkMode}
                onChange={(e) => setDarkMode(e.target.checked)}
                className="w-4 h-4 text-indigo-600 accent-indigo-600 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-150">
              <div className="space-y-0.5 flex items-center gap-2.5">
                <Languages className="w-4 h-4 text-slate-500" />
                <div>
                  <span className="font-semibold block text-slate-700">Applet Language</span>
                  <span className="text-[10px] text-slate-400 block">Default language translation standard</span>
                </div>
              </div>
              <select className="bg-white border border-slate-200 rounded px-2 py-1 text-xs">
                <option>English (US)</option>
                <option>Spanish</option>
                <option>French</option>
              </select>
            </div>

          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Shortcuts overview */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
            <Keyboard className="w-4 h-4 text-indigo-500" />
            Workspace Shortcuts Manual
          </h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2 bg-slate-50 p-4 rounded-lg border border-slate-150 font-mono text-[10px] text-slate-600">
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Ctrl + Z</span> <span className="font-semibold">Undo Last Change</span></div>
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Ctrl + Y</span> <span className="font-semibold">Redo Change</span></div>
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Ctrl + S</span> <span className="font-semibold">Save Project to Storage</span></div>
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Ctrl + P</span> <span className="font-semibold">Trigger Print Layout</span></div>
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Space + Mouse Drag</span> <span className="font-semibold">Pan Canvas Stage</span></div>
            <div className="flex justify-between border-b border-slate-150 py-1"><span>Ctrl + Scroll Wheel</span> <span className="font-semibold">Interactive Zoom</span></div>
          </div>
        </div>

        <div className="h-px bg-slate-100" />

        {/* Server status specifications info */}
        <div className="space-y-4">
          <h3 className="font-bold text-slate-800 flex items-center gap-2 text-xs">
            <Cpu className="w-4 h-4 text-indigo-500" />
            Infrastructure Status &amp; Integrations
          </h3>

          <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-lg flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-slate-800 block text-xs">Gemini AI Engine Binding Status</span>
              <p className="text-slate-500 leading-normal text-[10px]">
                The application has direct access to backend server-side Gemini 3.5 capabilities. When image adjustments, OCR extractions, or document translations are called, Gemini Vision provides optimal bounding coordinates and text alignments instantly.
              </p>
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center justify-between pt-4">
          {savedSuccess && (
            <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold text-xs">
              <Check className="w-4 h-4" /> Preferences saved and compiled!
            </span>
          )}
          <button 
            onClick={handleSaveSettings}
            className="ml-auto px-6 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded shadow-sm"
          >
            Save Preferences
          </button>
        </div>

      </div>

    </div>
  );
}
