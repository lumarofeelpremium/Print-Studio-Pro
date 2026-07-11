import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Key, Phone, FileText, CheckCircle2, Download, Printer, ShieldCheck, 
  UploadCloud, QrCode, Sliders, Sparkles, Send, Trash2, ArrowRight, User, Settings, Info,
  Loader2, AlertCircle, X, RotateCw
} from 'lucide-react';

interface SharePortalProps {
  forcedMode?: 'upload' | 'view';
  shareIdParam?: string;
  onNavigate: (tab: string) => void;
}

export default function SharePortal({ forcedMode = 'upload', shareIdParam = '', onNavigate }: SharePortalProps) {
  const [currentMode, setCurrentMode] = useState<'upload' | 'view'>(forcedMode);
  
  // -- CUSTOMER UPLOAD MODE STATE --
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadFileBase64, setUploadFileBase64] = useState<string>('');
  const [uploadCopies, setUploadCopies] = useState(1);
  const [uploadColorMode, setUploadColorMode] = useState<'color' | 'mono'>('color');
  const [uploadPaperSize, setUploadPaperSize] = useState('A4');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // -- SHARE VIEW MODE STATE --
  const [shareId, setShareId] = useState(shareIdParam || 's-demo-123');
  const [shareMetaData, setShareMetaData] = useState<any>(null);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [unlockError, setUnlockError] = useState('');
  const [projectData, setProjectData] = useState<any>(null);
  
  const [printCount, setPrintCount] = useState(0);
  const [downloadCount, setDownloadCount] = useState(0);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState(false);

  // Auto-fetch if direct shared link parameters are present
  useEffect(() => {
    if (shareIdParam) {
      setShareId(shareIdParam);
      setCurrentMode('view');
      fetchShareDetails(shareIdParam);
    }
  }, [shareIdParam]);

  // View Mode: Fetch Shared Metadata
  const fetchShareDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/share/get/${id}`);
      if (!res.ok) {
        const err = await res.json();
        setUnlockError(err.error || 'This shared document link has expired or has been revoked.');
        return;
      }
      const data = await res.json();
      setShareMetaData(data);
      setPrintCount(data.printCount);
      setDownloadCount(data.downloadCount);
      
      // If no password or OTP locks exist, auto-grant access
      if (!data.passwordProtected && !data.otpRequired) {
        verifyAndUnlock(id, '', '');
      }
    } catch (e) {
      setUnlockError('Connection error. Failed to retrieve metadata.');
    }
  };

  // View Mode: Verify access credentials
  const verifyAndUnlock = async (id: string, pass: string, otp: string) => {
    setUnlockError('');
    try {
      const res = await fetch(`/api/share/verify/${id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pass, otp })
      });
      if (!res.ok) {
        const err = await res.json();
        setUnlockError(err.error || 'Invalid credentials. Access denied.');
        return;
      }
      const data = await res.json();
      setProjectData(data.projectData);
      setIsUnlocked(true);
    } catch (e) {
      setUnlockError('Unlock verification failed. Check credentials.');
    }
  };

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAndUnlock(shareId, passwordInput, otpInput);
  };

  // View Mode: Handle print or download actions
  const handleAction = async (action: 'download' | 'print') => {
    if (!shareMetaData) return;
    
    // Check limits
    if (action === 'download' && shareMetaData.allowDownload === false) {
      alert('Downloading is disabled by the owner for security.');
      return;
    }
    if (action === 'download' && downloadCount >= shareMetaData.maxDownloads) {
      alert('Maximum download limits reached for this link.');
      return;
    }
    if (action === 'print' && printCount >= shareMetaData.maxPrints) {
      alert('Maximum print attempts reached for this link.');
      return;
    }

    if (action === 'print') {
      setShowPrintConfirmModal(true);
      return;
    }

    await triggerAction(action);
  };

  const triggerAction = async (action: 'download' | 'print') => {
    try {
      const res = await fetch(`/api/share/action/${shareId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });
      const data = await res.json();
      if (data.success) {
        if (action === 'download') {
          setDownloadCount(data.downloadCount);
          // Trigger file download
          const link = document.createElement('a');
          link.href = projectData.imageSrc;
          link.download = `high_dpi_${projectData.name.replace(/\s+/g, '_')}.png`;
          link.click();
        } else {
          setPrintCount(data.printCount);
          window.print();
        }
      }
    } catch (e) {
      console.error('Failed to log sync event.');
    }
  };

  // -- CUSTOMER UPLOAD MODE LOGIC --
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
      processUploadFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processUploadFile(e.target.files[0]);
    }
  };

  const processUploadFile = (file: File) => {
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setUploadFileBase64(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !uploadFileBase64) {
      alert('Please enter your name and upload a document.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/shop/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          phone: customerPhone,
          fileName: uploadFile?.name || 'customer_scan.jpg',
          fileSrc: uploadFileBase64,
          copies: uploadCopies,
          colorMode: uploadColorMode,
          paperSize: uploadPaperSize
        })
      });
      const data = await res.json();
      if (data.success) {
        setSubmitSuccess(true);
        // Reset fields
        setCustomerName('');
        setCustomerPhone('');
        setUploadFile(null);
        setUploadFileBase64('');
      }
    } catch (e) {
      alert('Upload failed. Try again or check local wifi signal.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-slate-950 text-white py-12 px-4 flex items-center justify-center relative overflow-hidden select-none font-sans">
      <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-lg p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Portal Branding */}
        <div className="text-center space-y-2">
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            <ShieldCheck className="w-6 h-6 text-indigo-500" />
            ID Print Studio Shared Portal
          </h2>
          <div className="flex justify-center gap-2">
            <button 
              onClick={() => { setCurrentMode('upload'); setSubmitSuccess(false); }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                currentMode === 'upload' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Customer Upload
            </button>
            <button 
              onClick={() => { setCurrentMode('view'); setUnlockError(''); setIsUnlocked(false); }}
              className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition ${
                currentMode === 'view' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              Verify Secure Link
            </button>
          </div>
        </div>

        {/* ==========================================
            MODE 1: CUSTOMER UPLOAD MODE
            ========================================== */}
        {currentMode === 'upload' && (
          <div className="space-y-5">
            {submitSuccess ? (
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8 space-y-4"
              >
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full w-16 h-16 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold">Document Submitted Successfully!</h3>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                    Your ID document has been dispatched directly to the print counter queue. The shop owner will crop and print it shortly.
                  </p>
                </div>
                <button 
                  onClick={() => setSubmitSuccess(false)}
                  className="px-5 py-2.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white rounded text-xs font-semibold transition"
                >
                  Upload Another File
                </button>
              </motion.div>
            ) : (
              <form onSubmit={handleCustomerSubmit} className="space-y-4 text-xs">
                
                {/* Input Customer name */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Your Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-500 absolute top-2.5 left-3" />
                    <input 
                      type="text"
                      required
                      placeholder="Enter full name for pickup badge"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-indigo-500 text-slate-200"
                    />
                  </div>
                </div>

                {/* Phone number */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Phone Number (For pickup SMS alert)</label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-slate-500 absolute top-2.5 left-3" />
                    <input 
                      type="tel"
                      placeholder="+1 (555) 000-0000"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-indigo-500 text-slate-200 font-mono"
                    />
                  </div>
                </div>

                {/* Native drag drop zone */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Select Document or Photo Scan</label>
                  <div 
                    onDragEnter={handleDrag}
                    onDragOver={handleDrag}
                    onDragLeave={handleDrag}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center relative transition ${
                      dragActive ? 'border-indigo-500 bg-indigo-50/5' : 'border-slate-800 hover:bg-slate-950/40 bg-slate-950/20'
                    }`}
                  >
                    <input 
                      type="file"
                      required={!uploadFileBase64}
                      onChange={handleFileChange}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      accept="image/*"
                    />
                    <UploadCloud className="w-8 h-8 text-slate-500 mx-auto mb-2" />
                    {uploadFile ? (
                      <div className="text-indigo-400 font-semibold">{uploadFile.name}</div>
                    ) : (
                      <>
                        <span className="font-semibold block text-slate-300">Choose Image or Drag here</span>
                        <span className="text-[10px] text-slate-500 mt-1 block">Supports standard scan formats up to 50MB</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Layout options */}
                <div className="grid grid-cols-3 gap-3 bg-slate-950 p-4 rounded-lg border border-slate-850">
                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Copies</span>
                    <input 
                      type="number" min="1" max="50"
                      value={uploadCopies}
                      onChange={(e) => setUploadCopies(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-center font-mono font-bold"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Format</span>
                    <select
                      value={uploadPaperSize}
                      onChange={(e) => setUploadPaperSize(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="A4">A4 Sheet</option>
                      <option value="PVC_Card">PVC Card</option>
                      <option value="Letter">Letter Size</option>
                    </select>
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 font-semibold block text-[10px] uppercase">Color Mode</span>
                    <select
                      value={uploadColorMode}
                      onChange={(e) => setUploadColorMode(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[11px]"
                    >
                      <option value="color">Full Color</option>
                      <option value="mono">Grayscale</option>
                    </select>
                  </div>
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded shadow-lg transition flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Uploading Scan File...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Submit to Printer Counter
                    </>
                  )}
                </button>

              </form>
            )}
          </div>
        )}

        {/* ==========================================
            MODE 2: SHARE SECURE DOCUMENT VIEW MODE
            ========================================== */}
        {currentMode === 'view' && (
          <div className="space-y-5">
            {!isUnlocked ? (
              <form onSubmit={handleUnlockSubmit} className="space-y-4 text-xs">
                
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-1.5 text-center">
                  <Lock className="w-6 h-6 text-amber-500 mx-auto" />
                  <h4 className="font-bold text-slate-200">Secure Access Check</h4>
                  <p className="text-[10px] text-slate-500 leading-normal max-w-xs mx-auto">
                    Enter the passcode or OTP shared by the owner to unlock high-fidelity viewing and direct remote printing.
                  </p>
                </div>

                {/* Password Protection */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">Project Passcode / Shared Link Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-500 absolute top-2.5 left-3" />
                    <input 
                      type="password"
                      placeholder="Passcode shared by sender"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>

                {/* OTP Requirement */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 block font-semibold">OTP Verification Code (If required)</label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-500 absolute top-2.5 left-3" />
                    <input 
                      type="text"
                      placeholder="6-digit verification code"
                      value={otpInput}
                      onChange={(e) => setOtpInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                {unlockError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{unlockError}</span>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    type="button"
                    onClick={() => {
                      if (shareId) fetchShareDetails(shareId);
                    }}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded transition border border-slate-700"
                  >
                    Query Link
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition"
                  >
                    Unlock Document
                  </button>
                </div>

              </form>
            ) : (
              <div className="space-y-5 text-xs">
                
                {/* Unlocked Info Banner */}
                <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-lg text-emerald-400 flex items-center gap-3">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                  <div>
                    <h4 className="font-bold">Access Verification Cleared!</h4>
                    <p className="text-[10px] leading-relaxed opacity-85">This document is ready to print directly from your browser. Print telemetry is being logged to the sender.</p>
                  </div>
                </div>

                {/* Printable Document watermarked Image Preview */}
                <div className="bg-black/50 border border-slate-800 rounded-lg p-4 flex flex-col items-center justify-center relative overflow-hidden group aspect-video">
                  
                  {/* Image */}
                  <img src={projectData.imageSrc} alt="Preview" className="max-w-full max-h-48 object-contain rounded-lg" referrerPolicy="no-referrer" />
                  
                  {/* Custom Diagonal Watermark Overlay */}
                  {shareMetaData?.watermarkText && (
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center select-none overflow-hidden">
                      <span className="text-red-500/15 font-black text-3xl font-sans tracking-widest uppercase transform -rotate-25 scale-150">
                        {shareMetaData.watermarkText}
                      </span>
                    </div>
                  )}
                </div>

                {/* Document Details metadata */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-850 space-y-2">
                  <h4 className="font-bold text-slate-200 text-sm">{projectData.name}</h4>
                  <div className="grid grid-cols-2 gap-4 text-[10px] text-slate-400 font-mono">
                    <div>Dimensions: {projectData.printSettings.paperSize} Format</div>
                    <div>Safe bleed: 2mm Standard margins</div>
                    <div>Downloads logged: {downloadCount}/{shareMetaData?.maxDownloads || 'N/A'}</div>
                    <div>Direct prints logged: {printCount}/{shareMetaData?.maxPrints || 'N/A'}</div>
                  </div>
                </div>

                {/* Control Action Buttons */}
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    disabled={shareMetaData?.allowDownload === false}
                    onClick={() => handleAction('download')}
                    className="py-2.5 bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-200 font-semibold rounded border border-slate-700 flex items-center justify-center gap-2 transition"
                  >
                    <Download className="w-4 h-4" />
                    Download original (High DPI)
                  </button>
                  <button 
                    onClick={() => handleAction('print')}
                    className="py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded flex items-center justify-center gap-2 transition"
                  >
                    <Printer className="w-4 h-4" />
                    Print Directly Now
                  </button>
                </div>

              </div>
            )}
          </div>
        )}

      </div>

      {/* MODAL: VERIFY PRINT SETTINGS CONFIRMATION */}
      <AnimatePresence>
        {showPrintConfirmModal && projectData && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-6 text-white"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Printer className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-lg text-slate-100">Verify Shared Print Settings</h3>
                </div>
                <button onClick={() => setShowPrintConfirmModal(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4 text-xs">
                <p className="text-slate-400">
                  Please confirm the document dimensions and printer setup before launching. Shared prints are counted dynamically.
                </p>

                <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden divide-y divide-slate-900">
                  {/* Document Name */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Document Name</span>
                    </div>
                    <span className="text-slate-200 font-semibold truncate max-w-[180px] block text-right">
                      {projectData.name}
                    </span>
                  </div>

                  {/* Paper Format */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <FileText className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Paper Format</span>
                    </div>
                    <span className="text-slate-200 font-semibold truncate max-w-[180px]">
                      {projectData.printSettings?.paperSize || 'A4 Standard'}
                    </span>
                  </div>

                  {/* Orientation */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Orientation</span>
                    </div>
                    <span className="text-slate-200 font-semibold capitalize">
                      {projectData.printSettings?.orientation || 'Portrait'}
                    </span>
                  </div>

                  {/* Print Quality */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Print Quality</span>
                    </div>
                    <span className="text-slate-200 font-semibold">
                      {projectData.printSettings?.dpi || 300} DPI
                    </span>
                  </div>

                  {/* Direct Print Quota */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Print Quota</span>
                    </div>
                    <span className="text-amber-400 font-semibold">
                      Used {printCount} of {shareMetaData?.maxPrints || 'N/A'}
                    </span>
                  </div>

                  {/* Color Scheme */}
                  <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                    <div className="flex items-center gap-2">
                      <Sliders className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-slate-400 font-medium">Color Scheme</span>
                    </div>
                    <span className="text-slate-200 font-semibold capitalize">
                      {projectData.printSettings?.colorMode || 'RGB Full Color'}
                    </span>
                  </div>
                </div>

                <div className="bg-slate-900/60 border border-slate-800 p-3 rounded-xl space-y-2">
                  <span className="text-[10px] font-bold text-indigo-400 block uppercase tracking-wider">Important Printer Setup:</span>
                  <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                    <li>Set <b>Margins to None</b> inside the browser print dialog.</li>
                    <li>Toggle on <b>Background Graphics</b> to print colors and card images correctly.</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPrintConfirmModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl transition text-center text-xs"
                >
                  Cancel / Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintConfirmModal(false);
                    triggerAction('print');
                  }}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl transition text-center text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/10"
                >
                  <Printer className="w-4 h-4" />
                  Proceed to Print
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
