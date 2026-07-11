import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ZoomIn, ZoomOut, Maximize, RotateCw, RotateCcw, FlipHorizontal, FlipVertical,
  Undo2, Redo2, Grid, Layers, Sparkles, Printer, Sliders, Type as FontIcon, 
  QrCode, Barcode, Eye, Settings, Image as ImageIcon, Check, Loader2, Copy,
  Share2, ArrowLeft, Trash2, X, RefreshCw, Send, Plus, Lock, Calendar, FileText, Download
} from 'lucide-react';
import { CardTemplate, PrintSettings, OverlayElement, ImageAdjustments, PrintProject } from '../types';
import { CARD_TEMPLATES, DEFAULT_ADJUSTMENTS, DEFAULT_PRINT_SETTINGS, PAPER_SIZES } from '../constants';

interface EditorProps {
  project: PrintProject;
  onBack: () => void;
  onSave: (proj: PrintProject) => void;
}

export default function Editor({ project: initialProject, onBack, onSave }: EditorProps) {
  // Application State
  const [project, setProject] = useState<PrintProject>(initialProject);
  const [activeTab, setActiveTab] = useState<'adjust' | 'transform' | 'enhance' | 'layout' | 'overlays'>('enhance');
  const [editorMode, setEditorMode] = useState<'card' | 'sheet'>('card'); // 'card' (focus crop/adjust) or 'sheet' (tiling on paper)
  
  // ID Card Dual Side State
  const [editingSide, setEditingSide] = useState<'front' | 'back'>('front');
  const [tilingMode, setTilingMode] = useState<'front' | 'back' | 'both'>('both');

  const getActiveSideData = () => {
    if (editingSide === 'front') {
      return {
        imageSrc: project.imageSrc,
        originalImageSrc: project.originalImageSrc,
        adjustments: project.adjustments,
        rotation: project.rotation,
        flipH: project.flipH,
        flipV: project.flipV,
        cropRect: project.cropRect,
        imageX: project.imageX || 0,
        imageY: project.imageY || 0,
        imageScale: project.imageScale || 100,
      };
    } else {
      return {
        imageSrc: project.backImageSrc || '',
        originalImageSrc: project.backOriginalImageSrc || '',
        adjustments: project.backAdjustments || { ...DEFAULT_ADJUSTMENTS },
        rotation: project.backRotation || 0,
        flipH: project.backFlipH || false,
        flipV: project.backFlipV || false,
        cropRect: project.backCropRect,
        imageX: project.backImageX || 0,
        imageY: project.backImageY || 0,
        imageScale: project.backImageScale || 100,
      };
    }
  };

  const activeSideData = getActiveSideData();
  
  // Undo/Redo History
  const [history, setHistory] = useState<PrintProject[]>([initialProject]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // UI States
  const [isAiProcessing, setIsAiProcessing] = useState<boolean>(false);
  const [aiFeedback, setAiFeedback] = useState<string>('');
  const [isSharingModalOpen, setIsSharingModalOpen] = useState<boolean>(false);
  const [showPrintConfirmModal, setShowPrintConfirmModal] = useState<boolean>(false);
  
  // Sharing Settings
  const [sharePassword, setSharePassword] = useState<string>('');
  const [shareOtpRequired, setShareOtpRequired] = useState<boolean>(false);
  const [shareOtpPhone, setShareOtpPhone] = useState<string>('');
  const [shareWatermark, setShareWatermark] = useState<string>('ID Print Studio');
  const [shareAccessMode, setShareAccessMode] = useState<'all' | 'print' | 'download'>('all');
  const [shareLinkDetails, setShareLinkDetails] = useState<any>(null);

  // Drag Overlay Element Selection
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [isDraggingOverlay, setIsDraggingOverlay] = useState<boolean>(false);

  // Canvas Viewport references for Zoom & Pan
  const workspaceRef = useRef<HTMLDivElement>(null);
  const isPanningRef = useRef<boolean>(false);
  const panStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isSpacePressed, setIsSpacePressed] = useState<boolean>(false);

  // Image Dragging & Zooming Refs
  const isImageDraggingRef = useRef<boolean>(false);
  const imageDragStartRef = useRef<{ x: number; y: number; imageX: number; imageY: number }>({ x: 0, y: 0, imageX: 0, imageY: 0 });
  const wheelCommitTimeoutRef = useRef<any>(null);
  const imageContainerRef = useRef<HTMLDivElement | null>(null);

  const projectRef = useRef<PrintProject>(project);
  projectRef.current = project;
  const editingSideRef = useRef<string>(editingSide);
  editingSideRef.current = editingSide;

  // Use a native non-passive wheel event listener to fully prevent default page scroll
  useEffect(() => {
    const el = imageContainerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      // Prevent browser zoom, body scroll, and workspace zoom from firing!
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY > 0 ? -4 : 4; // scroll down zoom out, scroll up zoom in
      const currentProj = projectRef.current;
      const currentSide = editingSideRef.current;

      if (currentSide === 'front') {
        const currentScale = currentProj.imageScale || 100;
        const nextScale = Math.min(Math.max(currentScale + delta, 50), 400);
        updateProject({
          ...currentProj,
          imageScale: nextScale
        }, false);
        
        if (wheelCommitTimeoutRef.current) clearTimeout(wheelCommitTimeoutRef.current);
        wheelCommitTimeoutRef.current = setTimeout(() => {
          updateProject({
            ...projectRef.current,
            imageScale: nextScale
          }, true);
        }, 300);
      } else {
        const currentScale = currentProj.backImageScale || 100;
        const nextScale = Math.min(Math.max(currentScale + delta, 50), 400);
        updateProject({
          ...currentProj,
          backImageScale: nextScale
        }, false);
        
        if (wheelCommitTimeoutRef.current) clearTimeout(wheelCommitTimeoutRef.current);
        wheelCommitTimeoutRef.current = setTimeout(() => {
          updateProject({
            ...projectRef.current,
            backImageScale: nextScale
          }, true);
        }, 300);
      }
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [editingSide]);

  // Use a native non-passive wheel listener on workspaceRef to allow smooth panning/scrolling & zoom in editor
  useEffect(() => {
    const el = workspaceRef.current;
    if (!el) return;

    const handleWorkspaceWheel = (e: WheelEvent) => {
      // Prevent browser default scroll
      e.preventDefault();
      
      const currentProj = projectRef.current;
      if (e.ctrlKey) {
        // Zoom workspace
        const delta = e.deltaY > 0 ? -0.08 : 0.08;
        const nextZoom = Math.min(Math.max(currentProj.zoom + delta, 0.3), 3.5);
        updateProject({ ...currentProj, zoom: nextZoom }, false);
      } else {
        // Scroll vertically/horizontally inside the workspace canvas using mouse wheel
        const scrollSpeed = 40;
        if (e.shiftKey) {
          // Horizontal scrolling
          const deltaX = e.deltaY > 0 ? -scrollSpeed : scrollSpeed;
          updateProject({ ...currentProj, panX: currentProj.panX + deltaX }, false);
        } else {
          // Vertical scrolling
          const deltaY = e.deltaY > 0 ? -scrollSpeed : scrollSpeed;
          updateProject({ ...currentProj, panY: currentProj.panY + deltaY }, false);
        }
      }
    };

    el.addEventListener('wheel', handleWorkspaceWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleWorkspaceWheel);
    };
  }, []);

  // Overlay creation state
  const [newTextContent, setNewTextContent] = useState<string>('John Doe');
  const [newQrContent, setNewQrContent] = useState<string>('ID-982123882');
  const [newBarcodeContent, setNewBarcodeContent] = useState<string>('982123882');

  // Constrain panning/scrolling to allow 2 inches (192px) of empty padding margin around the card/sheet in all directions
  const getConstrainedPan = (
    panX: number, 
    panY: number, 
    zoom: number, 
    currentMode: 'card' | 'sheet', 
    currentProj: PrintProject
  ) => {
    if (!workspaceRef.current) return { panX, panY };
    const viewportWidth = workspaceRef.current.clientWidth;
    const viewportHeight = workspaceRef.current.clientHeight;

    const template = CARD_TEMPLATES.find(t => t.id === currentProj.templateId) || CARD_TEMPLATES[0];
    const cardW = Math.max(template.widthMm, template.heightMm);
    const cardH = Math.min(template.widthMm, template.heightMm);

    const isLandscape = currentProj.printSettings.orientation === 'landscape';
    const paperBaseW = currentProj.printSettings.paperSize === 'A4' ? 210 : 215.9;
    const paperBaseH = currentProj.printSettings.paperSize === 'A4' ? 297 : 279.4;
    const paperW = isLandscape ? paperBaseH : paperBaseW;
    const paperH = isLandscape ? paperBaseW : paperBaseH;

    const W = currentMode === 'card' ? cardW * 3.78 : paperW * 3.78;
    const H = currentMode === 'card' ? cardH * 3.78 : paperH * 3.78;

    const W_screen = W * zoom;
    const H_screen = H * zoom;

    // 2 inches is exactly 192 pixels of safety scrollable margin on all sides
    const margin = 192;

    // Calculate maximum pan in screen space, giving at least 2 inches (192px) of space on all sides of the workspace
    const maxPanX_screen = Math.max(margin, Math.abs(W_screen - viewportWidth) / 2 + margin);
    const maxPanY_screen = Math.max(margin, Math.abs(H_screen - viewportHeight) / 2 + margin);

    const maxPanX = maxPanX_screen / zoom;
    const maxPanY = maxPanY_screen / zoom;

    return {
      panX: Math.min(Math.max(panX, -maxPanX), maxPanX),
      panY: Math.min(Math.max(panY, -maxPanY), maxPanY),
    };
  };

  // Push new state onto history stack
  const updateProject = (newProj: PrintProject, isHistoryEvent = true, overrideMode?: 'card' | 'sheet') => {
    const currentMode = overrideMode || editorMode;
    const constrained = getConstrainedPan(newProj.panX, newProj.panY, newProj.zoom, currentMode, newProj);
    const sanitizedProj = {
      ...newProj,
      panX: constrained.panX,
      panY: constrained.panY
    };

    setProject(sanitizedProj);
    if (isHistoryEvent) {
      const updatedHistory = history.slice(0, historyIndex + 1);
      setHistory([...updatedHistory, sanitizedProj]);
      setHistoryIndex(updatedHistory.length);
    }
  };

  // Keyboard Space Drag recognition
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
        e.preventDefault();
      }
      // Ctrl+Z Undo
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        handleUndo();
      }
      // Ctrl+Y Redo
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
      // Ctrl+S Save
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        onSave(project);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [project, history, historyIndex]);

  // Undo / Redo Execution
  const handleUndo = () => {
    if (historyIndex > 0) {
      const idx = historyIndex - 1;
      setHistoryIndex(idx);
      setProject(history[idx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const idx = historyIndex + 1;
      setHistoryIndex(idx);
      setProject(history[idx]);
    }
  };

  // Zoom Helpers
  const zoomIn = () => {
    updateProject({ ...project, zoom: Math.min(project.zoom + 0.15, 3.5) }, false);
  };
  const zoomOut = () => {
    updateProject({ ...project, zoom: Math.max(project.zoom - 0.15, 0.4) }, false);
  };
  const resetTransform = () => {
    if (editingSide === 'front') {
      updateProject({
        ...project,
        zoom: editorMode === 'sheet' ? 0.6 : 1.0,
        panX: 0,
        panY: 0,
        rotation: 0,
        flipH: false,
        flipV: false,
        skewX: 0,
        skewY: 0,
        cropRect: undefined,
        imageX: 0,
        imageY: 0,
        imageScale: 100
      });
    } else {
      updateProject({
        ...project,
        zoom: editorMode === 'sheet' ? 0.6 : 1.0,
        panX: 0,
        panY: 0,
        backRotation: 0,
        backFlipH: false,
        backFlipV: false,
        skewX: 0,
        skewY: 0,
        backCropRect: undefined,
        backImageX: 0,
        backImageY: 0,
        backImageScale: 100
      });
    }
  };

  // Pan & Image dragging Mouse Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed || e.button === 1) {
      isPanningRef.current = true;
      panStartRef.current = { x: e.clientX - project.panX, y: e.clientY - project.panY };
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanningRef.current) {
      const newPanX = e.clientX - panStartRef.current.x;
      const newPanY = e.clientY - panStartRef.current.y;
      updateProject({ ...project, panX: newPanX, panY: newPanY }, false);
    } else if (isImageDraggingRef.current) {
      const dx = e.clientX - imageDragStartRef.current.x;
      const dy = e.clientY - imageDragStartRef.current.y;
      
      // Divide by project.zoom to make drag distance 1:1 with screen coordinates
      const scaleFactor = project.zoom || 1;
      const finalDx = dx / scaleFactor;
      const finalDy = dy / scaleFactor;

      const newX = Math.round(imageDragStartRef.current.imageX + finalDx);
      const newY = Math.round(imageDragStartRef.current.imageY + finalDy);

      if (editingSide === 'front') {
        updateProject({
          ...project,
          imageX: newX,
          imageY: newY
        }, false);
      } else {
        updateProject({
          ...project,
          backImageX: newX,
          backImageY: newY
        }, false);
      }
    }
  };

  const handleMouseUp = () => {
    isPanningRef.current = false;
    if (isImageDraggingRef.current) {
      isImageDraggingRef.current = false;
      // Commit final drag state to history
      if (editingSide === 'front') {
        updateProject({
          ...project,
          imageX: project.imageX || 0,
          imageY: project.imageY || 0
        }, true);
      } else {
        updateProject({
          ...project,
          backImageX: project.backImageX || 0,
          backImageY: project.backImageY || 0
        }, true);
      }
    }
  };



  // Drag the image itself inside the card frame
  const handleImageMouseDown = (e: React.MouseEvent) => {
    if (isSpacePressed || e.button !== 0) return; // Only left click and when space is not pressed
    e.stopPropagation(); // Avoid workspace dragging trigger
    isImageDraggingRef.current = true;
    const currentX = editingSide === 'front' ? (project.imageX || 0) : (project.backImageX || 0);
    const currentY = editingSide === 'front' ? (project.imageY || 0) : (project.backImageY || 0);
    imageDragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      imageX: currentX,
      imageY: currentY
    };
  };

  // One-Click Local Auto Enhance (Instantly optimizes brightness, contrast, exposure, and sharpness)
  const runLocalAutoEnhance = (mode: 'smart' | 'text' | 'photocopy' | 'color' | 'reset') => {
    setIsAiProcessing(true);
    setAiFeedback('');
    
    // Simulate a brief, ultra-premium scan feeling for the user (400ms)
    setTimeout(() => {
      let targetAdjustments = { ...DEFAULT_ADJUSTMENTS };
      let msg = '';
      
      switch (mode) {
        case 'smart':
          targetAdjustments = {
            ...DEFAULT_ADJUSTMENTS,
            brightness: 12,
            contrast: 18,
            exposure: 8,
            saturation: 5,
            sharpness: 40,
            grayscale: false,
          };
          msg = 'Smart Auto-Enhancement applied! Improved card details, clarity, and contrast for crisp printing.';
          break;
        case 'text':
          targetAdjustments = {
            ...DEFAULT_ADJUSTMENTS,
            brightness: 5,
            contrast: 30,
            exposure: 5,
            saturation: -15,
            sharpness: 70,
            grayscale: false,
          };
          msg = 'Clear Text Booster applied! Amplified edge sharpness and contrast to highlight fine characters.';
          break;
        case 'photocopy':
          targetAdjustments = {
            ...DEFAULT_ADJUSTMENTS,
            brightness: -5,
            contrast: 45,
            exposure: 5,
            saturation: -100,
            sharpness: 60,
            grayscale: true,
          };
          msg = 'Photocopy (B&W Xerox) Mode applied! Image converted to optimized high-contrast grayscale format.';
          break;
        case 'color':
          targetAdjustments = {
            ...DEFAULT_ADJUSTMENTS,
            brightness: 10,
            contrast: 15,
            exposure: 5,
            saturation: 35,
            sharpness: 35,
            grayscale: false,
          };
          msg = 'Vivid Color Restore applied! Enriched dull, faded colors and elevated overall image vibrance.';
          break;
        case 'reset':
          targetAdjustments = { ...DEFAULT_ADJUSTMENTS };
          msg = 'All image enhancements and custom filters have been reset to default values.';
          break;
      }
      
      if (editingSide === 'front') {
        updateProject({
          ...project,
          adjustments: targetAdjustments,
        }, true);
      } else {
        updateProject({
          ...project,
          backAdjustments: targetAdjustments,
        }, true);
      }
      
      setAiFeedback(msg);
      setIsAiProcessing(false);
    }, 400);
  };

  // Overlay element drag & edit handlers
  const addOverlayElement = (type: 'text' | 'qrcode' | 'barcode', content: string) => {
    const newEl: OverlayElement = {
      id: `ov-${Date.now()}`,
      type,
      x: 10,
      y: 10,
      width: type === 'text' ? 120 : 60,
      height: type === 'text' ? 30 : 60,
      content,
      fontSize: type === 'text' ? 14 : undefined,
      color: type === 'text' ? '#1e293b' : undefined,
      fontFamily: 'sans-serif'
    };
    updateProject({
      ...project,
      overlays: [...project.overlays, newEl]
    });
  };

  const removeOverlayElement = (id: string) => {
    updateProject({
      ...project,
      overlays: project.overlays.filter(o => o.id !== id)
    });
    if (selectedOverlayId === id) setSelectedOverlayId(null);
  };

  // Safe manual slider adjustments updater
  const handleSliderChange = (key: keyof ImageAdjustments, val: number | boolean) => {
    if (editingSide === 'front') {
      updateProject({
        ...project,
        adjustments: {
          ...project.adjustments,
          [key]: val
        }
      }, false); // don't flood undo state during active dragging
    } else {
      const currentBackAdj = project.backAdjustments || { ...DEFAULT_ADJUSTMENTS };
      updateProject({
        ...project,
        backAdjustments: {
          ...currentBackAdj,
          [key]: val
        }
      }, false); // don't flood undo state during active dragging
    }
  };

  const handleRotationChange = (val: number, commitHistory = false) => {
    // Round to 1 decimal place. Stored rotation value can be positive or negative
    const rounded = Math.round(val * 10) / 10;
    if (editingSide === 'front') {
      updateProject({
        ...project,
        rotation: rounded
      }, commitHistory);
    } else {
      updateProject({
        ...project,
        backRotation: rounded
      }, commitHistory);
    }
  };

  const handleImagePositionChange = (key: 'X' | 'Y' | 'Scale', val: number, commitHistory = false) => {
    if (editingSide === 'front') {
      const updateKey = key === 'X' ? 'imageX' : key === 'Y' ? 'imageY' : 'imageScale';
      updateProject({
        ...project,
        [updateKey]: val
      }, commitHistory);
    } else {
      const updateKey = key === 'X' ? 'backImageX' : key === 'Y' ? 'backImageY' : 'backImageScale';
      updateProject({
        ...project,
        [updateKey]: val
      }, commitHistory);
    }
  };

  // Trigger browser print dialog for tiled layout
  const handlePrintSheet = () => {
    setShowPrintConfirmModal(true);
  };

  const executePrint = () => {
    setShowPrintConfirmModal(false);
    setEditorMode('sheet');
    setTimeout(() => {
      window.print();
    }, 250);
  };

  // Generate share link
  const createSecureShare = async () => {
    try {
      const res = await fetch('/api/share/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectData: project,
          linkSettings: {
            password: sharePassword || undefined,
            otpRequired: shareOtpRequired,
            otpPhone: shareOtpPhone || undefined,
            watermarkText: shareWatermark,
            accessMode: shareAccessMode
          }
        })
      });
      const data = await res.json();
      setShareLinkDetails(data);
    } catch (e) {
      alert('Failed to generate remote share link');
    }
  };

  const currentTemplate = CARD_TEMPLATES.find(t => t.id === project.templateId) || CARD_TEMPLATES[0];

  // Calculated front filters & transforms
  const frontFilterString = `
    brightness(${1 + project.adjustments.brightness / 100}) 
    contrast(${1 + project.adjustments.contrast / 100}) 
    saturate(${1 + project.adjustments.saturation / 100})
    ${project.adjustments.grayscale ? 'grayscale(1)' : ''}
    ${project.adjustments.blur > 0 ? `blur(${project.adjustments.blur}px)` : ''}
  `;

  const frontTransformStyle = {
    transform: `
      rotate(${project.rotation}deg) 
      scaleX(${project.flipH ? -1 : 1}) 
      scaleY(${project.flipV ? -1 : 1})
      skewX(${project.skewX}deg)
      skewY(${project.skewY}deg)
    `,
    opacity: project.adjustments.opacity / 100,
    filter: frontFilterString,
  };

  // Calculated back filters & transforms
  const backAdj = project.backAdjustments || {
    brightness: 0,
    contrast: 0,
    exposure: 0,
    saturation: 0,
    sharpness: 0,
    opacity: 100,
    grayscale: false,
    blur: 0,
  };
  const backFilterString = `
    brightness(${1 + backAdj.brightness / 100}) 
    contrast(${1 + backAdj.contrast / 100}) 
    saturate(${1 + backAdj.saturation / 100})
    ${backAdj.grayscale ? 'grayscale(1)' : ''}
    ${backAdj.blur > 0 ? `blur(${backAdj.blur}px)` : ''}
  `;

  const backTransformStyle = {
    transform: `
      rotate(${project.backRotation || 0}deg) 
      scaleX(${project.backFlipH ? -1 : 1}) 
      scaleY(${project.backFlipV ? -1 : 1})
      skewX(${project.skewX}deg)
      skewY(${project.skewY}deg)
    `,
    opacity: backAdj.opacity / 100,
    filter: backFilterString,
  };

  // Active side transformations
  const sideTransformStyle = editingSide === 'front' ? frontTransformStyle : backTransformStyle;

  // Image positional alignment styles applied directly to img tags
  const frontImagePositionStyle = {
    transform: `translate(${project.imageX || 0}px, ${project.imageY || 0}px) scale(${(project.imageScale || 100) / 100})`,
    transformOrigin: 'center center',
    transition: 'none', // absolute real-time positioning
  };

  const backImagePositionStyle = {
    transform: `translate(${project.backImageX || 0}px, ${project.backImageY || 0}px) scale(${(project.backImageScale || 100) / 100})`,
    transformOrigin: 'center center',
    transition: 'none', // absolute real-time positioning
  };

  const sideImagePositionStyle = editingSide === 'front' ? frontImagePositionStyle : backImagePositionStyle;

  const isLandscapePage = project.printSettings.orientation === 'landscape';
  const paperBaseWidth = project.printSettings.paperSize === 'A4' ? 210 : 215.9;
  const paperBaseHeight = project.printSettings.paperSize === 'A4' ? 297 : 279.4;
  const paperWidthMm = isLandscapePage ? paperBaseHeight : paperBaseWidth;
  const paperHeightMm = isLandscapePage ? paperBaseWidth : paperBaseHeight;

  // Swap template dimensions to always render landscape in editor
  const cardWidthMm = Math.max(currentTemplate.widthMm, currentTemplate.heightMm);
  const cardHeightMm = Math.min(currentTemplate.widthMm, currentTemplate.heightMm);

  return (
    <div id="editor-root" className="h-[calc(100vh-64px)] flex flex-col bg-slate-900 text-white overflow-hidden select-none">
      
      {/* Top Header Bar */}
      <div className="h-14 shrink-0 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-4 z-20 no-print">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition"
            title="Exit Editor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="h-4 w-px bg-slate-800" />
          
          <div>
            <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <span className="truncate max-w-[150px]">{project.name}</span>
              <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[9px] font-mono font-medium text-slate-400">
                {currentTemplate.name}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono">
              {currentTemplate.widthMm} x {currentTemplate.heightMm} mm @ {project.printSettings.dpi} DPI
            </div>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded-xl">
          <button
            onClick={() => {
              setEditorMode('card');
              updateProject({ ...project, zoom: 1.0 }, false, 'card');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1 ${
              editorMode === 'card' 
                ? 'bg-slate-800 text-white shadow-xs' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            Document Editor
          </button>
          <button
            onClick={() => {
              setEditorMode('sheet');
              updateProject({ ...project, zoom: 0.6 }, false, 'sheet');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition flex items-center gap-1 ${
              editorMode === 'sheet' 
                ? 'bg-slate-800 text-white shadow-xs' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            Tiling &amp; Print Sheet
          </button>
        </div>

        {/* Top Control Buttons */}
        <div className="flex items-center gap-2">
          {/* Undo / Redo */}
          <div className="flex gap-1">
            <button 
              disabled={historyIndex === 0}
              onClick={handleUndo}
              className="p-1.5 hover:bg-slate-850 disabled:opacity-40 rounded-lg text-slate-300 transition"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button 
              disabled={historyIndex >= history.length - 1}
              onClick={handleRedo}
              className="p-1.5 hover:bg-slate-850 disabled:opacity-40 rounded-lg text-slate-300 transition"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          {/* Quick Actions */}
          <button 
            onClick={() => setIsSharingModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-750 text-slate-200 hover:text-white rounded-lg text-xs font-semibold transition"
          >
            <Share2 className="w-4 h-4" />
            Share Portal
          </button>

          <button 
            onClick={() => onSave(project)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
          >
            Save Project
          </button>
        </div>
      </div>

      {/* Editor Main Section */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sidebar Menu Icons */}
        <div className="w-16 shrink-0 bg-slate-950 border-r border-slate-850 flex flex-col items-center py-4 gap-4 z-20 no-print">
          <button 
            onClick={() => setActiveTab('enhance')}
            className={`p-3 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeTab === 'enhance' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-[9px] font-semibold">Enhance</span>
          </button>
          <button 
            onClick={() => setActiveTab('adjust')}
            className={`p-3 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeTab === 'adjust' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Sliders className="w-5 h-5" />
            <span className="text-[9px] font-semibold">Adjust</span>
          </button>
          <button 
            onClick={() => setActiveTab('transform')}
            className={`p-3 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeTab === 'transform' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Maximize className="w-5 h-5" />
            <span className="text-[9px] font-semibold">Transform</span>
          </button>
          <button 
            onClick={() => setActiveTab('overlays')}
            className={`p-3 rounded-xl transition flex flex-col items-center justify-center gap-1 ${
              activeTab === 'overlays' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-900'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[9px] font-semibold">Layers</span>
          </button>
        </div>

        {/* Sidebar Expansion Content */}
        <div className="w-80 shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col z-10 no-print">
          <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">
              {activeTab === 'enhance' ? 'Intelligent Auto Enhance' : 
               activeTab === 'adjust' ? 'Manual Filters' :
               activeTab === 'transform' ? 'Position & Perspective' :
               activeTab === 'overlays' ? 'Graphic elements' : 'Grid Tiling Settings'}
            </span>
          </div>

          {/* ID CARD SIDES SELECTOR & UPLOADER */}
          <div className="p-3 bg-slate-950 border-b border-slate-850 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">ID Card Sides</span>
              <span className="text-[8px] text-indigo-400 font-bold bg-indigo-950 px-1.5 py-0.5 rounded uppercase border border-indigo-900/50">DUAL SIDES</span>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              {/* FRONT SIDE */}
              <button 
                onClick={() => setEditingSide('front')}
                className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition select-none ${
                  editingSide === 'front' 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold uppercase text-slate-200">Front Side</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${editingSide === 'front' ? 'bg-indigo-400' : 'bg-transparent'}`} />
                </div>
                <div className="h-12 w-full rounded bg-slate-950 border border-slate-850 overflow-hidden flex items-center justify-center relative group">
                  <img src={project.imageSrc} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[8px] font-bold cursor-pointer">
                    Change
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              updateProject({
                                ...project,
                                imageSrc: event.target.result as string,
                                originalImageSrc: event.target.result as string,
                              });
                            }
                          };
                          reader.readAsDataURL(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                </div>
              </button>

              {/* BACK SIDE */}
              <button 
                onClick={() => setEditingSide('back')}
                className={`p-2 rounded-lg border text-left flex flex-col gap-1 transition select-none ${
                  editingSide === 'back' 
                    ? 'border-indigo-500 bg-indigo-500/10' 
                    : 'border-slate-800 bg-slate-900/50 hover:border-slate-700'
                }`}
              >
                <div className="flex justify-between items-center w-full">
                  <span className="text-[10px] font-bold uppercase text-slate-200">Back Side</span>
                  <div className={`w-1.5 h-1.5 rounded-full ${editingSide === 'back' ? 'bg-indigo-400' : 'bg-transparent'}`} />
                </div>
                
                {project.backImageSrc ? (
                  <div className="h-12 w-full rounded bg-slate-950 border border-slate-850 overflow-hidden flex items-center justify-center relative group">
                    <img src={project.backImageSrc} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-[8px] font-bold cursor-pointer">
                      Change
                      <input 
                        type="file" 
                        accept="image/*" 
                        className="hidden" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) {
                            const reader = new FileReader();
                            reader.onload = (event) => {
                              if (event.target?.result) {
                                updateProject({
                                  ...project,
                                  backImageSrc: event.target.result as string,
                                  backOriginalImageSrc: event.target.result as string,
                                });
                              }
                            };
                            reader.readAsDataURL(e.target.files[0]);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <label className="h-12 w-full rounded border border-dashed border-slate-700 hover:border-slate-500 bg-slate-950 flex flex-col items-center justify-center cursor-pointer text-slate-400 hover:text-slate-200 transition">
                    <Plus className="w-4 h-4 text-slate-500" />
                    <span className="text-[8px] font-semibold uppercase tracking-wide">Upload Back</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            if (event.target?.result) {
                              updateProject({
                                ...project,
                                backImageSrc: event.target.result as string,
                                backOriginalImageSrc: event.target.result as string,
                                backAdjustments: { ...DEFAULT_ADJUSTMENTS, grayscale: false, opacity: 100, brightness: 0, contrast: 0, exposure: 0, saturation: 0, sharpness: 0, blur: 0 },
                                backRotation: 0,
                                backFlipH: false,
                                backFlipV: false,
                              });
                              setEditingSide('back');
                            }
                          };
                          reader.readAsDataURL(e.target.files[0]);
                        }
                      }}
                    />
                  </label>
                )}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            
            {/* AUTO ENHANCE TAB */}
            {activeTab === 'enhance' && (
              <div className="space-y-5 text-xs">
                
                {/* Introduction Header */}
                <div className="bg-slate-950/40 border border-slate-800/40 p-3 rounded-xl space-y-1.5">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                    Instant Image Enhancer
                  </h4>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    One-click presets that instantly correct shadows, exposure, white balance, and fine print readability. Optimizes the active side: <span className="text-indigo-400 font-bold uppercase">{editingSide} side</span>.
                  </p>
                </div>

                {/* Preset Options Grid */}
                <div className="space-y-2.5">
                  <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 block px-1">Choose Enhancement Preset</span>
                  
                  <div className="grid grid-cols-1 gap-2">
                    
                    {/* Preset 1: Smart Auto Enhance */}
                    <button 
                      onClick={() => runLocalAutoEnhance('smart')}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 rounded-xl text-left border border-slate-700/60 flex items-start gap-3 hover:border-indigo-500 transition group"
                    >
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 group-hover:bg-indigo-500/20 shrink-0">
                        <Sparkles className="w-4 h-4 animate-pulse" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-200 block text-xs">Smart Auto-Enhance</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">Perfect for scan copies - improves exposure &amp; clarity</span>
                      </div>
                    </button>

                    {/* Preset 2: Clear Text Booster */}
                    <button 
                      onClick={() => runLocalAutoEnhance('text')}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 rounded-xl text-left border border-slate-700/60 flex items-start gap-3 hover:border-indigo-500 transition group"
                    >
                      <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 group-hover:bg-emerald-500/20 shrink-0">
                        <FontIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-200 block text-xs">Super-Sharp Text Booster</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">Amplifies edge contrast for small print or barcodes</span>
                      </div>
                    </button>

                    {/* Preset 3: Xerox Photocopy Mode */}
                    <button 
                      onClick={() => runLocalAutoEnhance('photocopy')}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 rounded-xl text-left border border-slate-700/60 flex items-start gap-3 hover:border-indigo-500 transition group"
                    >
                      <div className="p-2 bg-slate-500/10 rounded-lg text-slate-300 group-hover:bg-slate-500/20 shrink-0">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-200 block text-xs">Xerox Photocopy Mode</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">High-contrast black &amp; white photocopy format</span>
                      </div>
                    </button>

                    {/* Preset 4: Vivid Color Restore */}
                    <button 
                      onClick={() => runLocalAutoEnhance('color')}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 rounded-xl text-left border border-slate-700/60 flex items-start gap-3 hover:border-indigo-500 transition group"
                    >
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400 group-hover:bg-amber-500/20 shrink-0">
                        <ImageIcon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-200 block text-xs">Vivid Color Restore</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">Revives faded, vintage, or dull colored cards</span>
                      </div>
                    </button>

                    {/* Preset 5: Reset All Filters */}
                    <button 
                      onClick={() => runLocalAutoEnhance('reset')}
                      className="p-3 bg-slate-800/80 hover:bg-slate-750 rounded-xl text-left border border-slate-700/60 flex items-start gap-3 hover:border-rose-500 transition group"
                    >
                      <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 group-hover:bg-rose-500/20 shrink-0">
                        <RotateCcw className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <span className="font-semibold text-slate-200 block text-xs">Reset All Adjustments</span>
                        <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">Restore the image to its original unedited state</span>
                      </div>
                    </button>

                  </div>
                </div>

                {/* Processing Indicator */}
                {isAiProcessing && (
                  <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                    <span>Analyzing &amp; optimizing image pixels...</span>
                  </div>
                )}

                {/* Feedback Display */}
                {aiFeedback && !isAiProcessing && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl relative">
                    <button onClick={() => setAiFeedback('')} className="absolute top-1.5 right-1.5 text-slate-500 hover:text-slate-300">
                      <X className="w-3.5 h-3.5" />
                    </button>
                    <p className="font-medium pr-4 leading-normal">{aiFeedback}</p>
                  </div>
                )}

              </div>
            )}

            {/* MANUAL ADJUSTMENTS TAB */}
            {activeTab === 'adjust' && (
              <div className="space-y-5">
                
                {/* Brightness */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Brightness</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.brightness}%</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" step="1"
                    value={activeSideData.adjustments.brightness}
                    onChange={(e) => handleSliderChange('brightness', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Contrast */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Contrast</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.contrast}%</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" step="1"
                    value={activeSideData.adjustments.contrast}
                    onChange={(e) => handleSliderChange('contrast', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Exposure */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Exposure</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.exposure}%</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" step="1"
                    value={activeSideData.adjustments.exposure}
                    onChange={(e) => handleSliderChange('exposure', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Saturation */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Saturation</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.saturation}%</span>
                  </div>
                  <input 
                    type="range" min="-100" max="100" step="1"
                    value={activeSideData.adjustments.saturation}
                    onChange={(e) => handleSliderChange('saturation', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Sharpen */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Sharpness (Unsharp Mask)</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.sharpness}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={activeSideData.adjustments.sharpness}
                    onChange={(e) => handleSliderChange('sharpness', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Opacity */}
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400 font-medium">Opacity</span>
                    <span className="text-slate-200 font-mono font-semibold">{activeSideData.adjustments.opacity}%</span>
                  </div>
                  <input 
                    type="range" min="0" max="100" step="1"
                    value={activeSideData.adjustments.opacity}
                    onChange={(e) => handleSliderChange('opacity', parseInt(e.target.value))}
                    className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                {/* Grayscale Toggle */}
                <div className="flex justify-between items-center bg-slate-950 p-3 rounded-xl border border-slate-800/60">
                  <div className="text-xs">
                    <span className="block font-semibold text-slate-300">Grayscale Photocopy Mode</span>
                    <span className="text-[10px] text-slate-500 block">Convert to black &amp; white document format</span>
                  </div>
                  <input 
                    type="checkbox"
                    checked={activeSideData.adjustments.grayscale}
                    onChange={(e) => handleSliderChange('grayscale', e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
                  />
                </div>

              </div>
            )}

            {/* TRANSFORM TAB */}
            {activeTab === 'transform' && (
              <div className="space-y-5">
                
                {/* ADVANCED ROTATION PANEL */}
                <div className="space-y-3 bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider font-mono">Rotation Tools</label>
                    <span className="text-[10px] text-indigo-400 font-bold bg-indigo-950/80 px-1.5 py-0.5 rounded border border-indigo-900/50">
                      {activeSideData.rotation}°
                    </span>
                  </div>

                  {/* Range Slider for free rotation */}
                  <div className="space-y-1.5">
                    <input 
                      type="range" 
                      min="-360" 
                      max="360" 
                      step="0.5"
                      value={activeSideData.rotation}
                      onChange={(e) => handleRotationChange(parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-mono">
                      <span>-360°</span>
                      <span>-180°</span>
                      <span>0°</span>
                      <span>180°</span>
                      <span>360°</span>
                    </div>
                  </div>

                  {/* Number Input and Plus / Minus Buttons */}
                  <div className="flex items-center gap-1.5">
                    {/* -5 deg button */}
                    <button
                      onClick={() => handleRotationChange(activeSideData.rotation - 5, true)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
                      title="Rotate -5°"
                    >
                      -5°
                    </button>
                    {/* -1 deg button */}
                    <button
                      onClick={() => handleRotationChange(activeSideData.rotation - 1, true)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
                      title="Rotate -1°"
                    >
                      -1°
                    </button>

                    {/* Numeric Input Field */}
                    <div className="flex-1 relative">
                      <input 
                        type="number" 
                        min="-360"
                        max="360"
                        step="any"
                        value={activeSideData.rotation}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value);
                          if (!isNaN(val)) {
                            handleRotationChange(val);
                          }
                        }}
                        onBlur={(e) => {
                          // commit history when user finishes typing
                          const val = parseFloat(e.target.value) || 0;
                          handleRotationChange(val, true);
                        }}
                        className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1 px-2 text-xs text-center font-semibold text-slate-200 focus:outline-hidden focus:border-indigo-500 pr-5 font-mono"
                      />
                      <span className="absolute right-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-semibold select-none pointer-events-none">°</span>
                    </div>

                    {/* +1 deg button */}
                    <button
                      onClick={() => handleRotationChange(activeSideData.rotation + 1, true)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
                      title="Rotate +1°"
                    >
                      +1°
                    </button>
                    {/* +5 deg button */}
                    <button
                      onClick={() => handleRotationChange(activeSideData.rotation + 5, true)}
                      className="w-8 h-8 flex items-center justify-center bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-300 text-xs font-bold rounded-lg transition"
                      title="Rotate +5°"
                    >
                      +5°
                    </button>
                  </div>

                  {/* 90 deg quick turn and reset buttons */}
                  <div className="grid grid-cols-3 gap-1.5 pt-1">
                    <button 
                      onClick={() => handleRotationChange(activeSideData.rotation - 90, true)}
                      className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1 transition text-slate-400 hover:text-slate-200"
                    >
                      <RotateCcw className="w-3 h-3" />
                      -90°
                    </button>
                    <button 
                      onClick={() => handleRotationChange(0, true)}
                      className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1 transition text-slate-400 hover:text-red-400"
                    >
                      Reset
                    </button>
                    <button 
                      onClick={() => handleRotationChange(activeSideData.rotation + 90, true)}
                      className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-bold uppercase rounded-lg flex items-center justify-center gap-1 transition text-slate-400 hover:text-slate-200"
                    >
                      <RotateCw className="w-3 h-3" />
                      +90°
                    </button>
                  </div>
                </div>

                {/* IMAGE POSITIONING & CENTER CORRECTION */}
                <div className="space-y-4 bg-slate-950 p-3 rounded-xl border border-slate-850">
                  <div className="flex justify-between items-center">
                    <label className="text-xs text-slate-300 font-bold uppercase tracking-wider font-mono">Image Alignment &amp; Position</label>
                    <button 
                      onClick={() => {
                        handleImagePositionChange('X', 0, false);
                        handleImagePositionChange('Y', 0, false);
                        handleImagePositionChange('Scale', 100, true);
                      }}
                      className="text-[10px] text-red-400 font-bold hover:underline"
                    >
                      Reset Position
                    </button>
                  </div>

                  {/* Horizontal Position (X Offset) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Horizontal Shift (X)</span>
                      <span className="text-slate-200 font-mono font-semibold">{activeSideData.imageX}px</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleImagePositionChange('X', activeSideData.imageX - 10, true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Shift -10px"
                      >
                        -10px
                      </button>
                      <input 
                        type="range" min="-300" max="300" step="1"
                        value={activeSideData.imageX}
                        onChange={(e) => handleImagePositionChange('X', parseInt(e.target.value))}
                        onMouseUp={() => handleImagePositionChange('X', activeSideData.imageX, true)}
                        className="flex-1 accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <button 
                        onClick={() => handleImagePositionChange('X', activeSideData.imageX + 10, true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Shift +10px"
                      >
                        +10px
                      </button>
                    </div>
                  </div>

                  {/* Vertical Position (Y Offset) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Vertical Shift (Y)</span>
                      <span className="text-slate-200 font-mono font-semibold">{activeSideData.imageY}px</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleImagePositionChange('Y', activeSideData.imageY - 10, true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Shift -10px"
                      >
                        -10px
                      </button>
                      <input 
                        type="range" min="-300" max="300" step="1"
                        value={activeSideData.imageY}
                        onChange={(e) => handleImagePositionChange('Y', parseInt(e.target.value))}
                        onMouseUp={() => handleImagePositionChange('Y', activeSideData.imageY, true)}
                        className="flex-1 accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <button 
                        onClick={() => handleImagePositionChange('Y', activeSideData.imageY + 10, true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Shift +10px"
                      >
                        +10px
                      </button>
                    </div>
                  </div>

                  {/* Image Scaling (Zoom) */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Image Scale (Zoom Inside Card)</span>
                      <span className="text-slate-200 font-mono font-semibold">{activeSideData.imageScale}%</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button 
                        onClick={() => handleImagePositionChange('Scale', Math.max(50, activeSideData.imageScale - 5), true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Scale -5%"
                      >
                        -5%
                      </button>
                      <input 
                        type="range" min="50" max="400" step="1"
                        value={activeSideData.imageScale}
                        onChange={(e) => handleImagePositionChange('Scale', parseInt(e.target.value))}
                        onMouseUp={() => handleImagePositionChange('Scale', activeSideData.imageScale, true)}
                        className="flex-1 accent-indigo-600 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                      />
                      <button 
                        onClick={() => handleImagePositionChange('Scale', Math.min(400, activeSideData.imageScale + 5), true)}
                        className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 text-[10px] rounded hover:bg-slate-800 text-slate-300"
                        title="Scale +5%"
                      >
                        +5%
                      </button>
                    </div>
                  </div>

                  {/* Dynamic Positioning Direction Pad */}
                  <div className="pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-400 block mb-2 font-semibold">Directional Arrow Alignment Pad</span>
                    <div className="flex items-center justify-between">
                      <div className="grid grid-cols-3 gap-1 w-28 mx-auto shrink-0">
                        <div />
                        <button 
                          onClick={() => handleImagePositionChange('Y', activeSideData.imageY - 2, true)}
                          className="p-1 bg-slate-900 hover:bg-slate-850 active:bg-indigo-650 border border-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center font-mono text-[10px] font-bold"
                          title="Move Image Up (2px)"
                        >
                          ▲
                        </button>
                        <div />
                        <button 
                          onClick={() => handleImagePositionChange('X', activeSideData.imageX - 2, true)}
                          className="p-1 bg-slate-900 hover:bg-slate-850 active:bg-indigo-650 border border-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center font-mono text-[10px] font-bold"
                          title="Move Image Left (2px)"
                        >
                          ◀
                        </button>
                        <button 
                          onClick={() => {
                            handleImagePositionChange('X', 0, false);
                            handleImagePositionChange('Y', 0, true);
                          }}
                          className="p-1 bg-slate-900 hover:bg-slate-850 active:bg-indigo-650 border border-indigo-900/60 text-indigo-400 hover:text-indigo-300 rounded flex items-center justify-center text-[8px] font-bold uppercase"
                          title="Center Image"
                        >
                          Center
                        </button>
                        <button 
                          onClick={() => handleImagePositionChange('X', activeSideData.imageX + 2, true)}
                          className="p-1 bg-slate-900 hover:bg-slate-850 active:bg-indigo-650 border border-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center font-mono text-[10px] font-bold"
                          title="Move Image Right (2px)"
                        >
                          ▶
                        </button>
                        <div />
                        <button 
                          onClick={() => handleImagePositionChange('Y', activeSideData.imageY + 2, true)}
                          className="p-1 bg-slate-900 hover:bg-slate-850 active:bg-indigo-650 border border-slate-800 text-slate-300 hover:text-white rounded flex items-center justify-center font-mono text-[10px] font-bold"
                          title="Move Image Down (2px)"
                        >
                          ▼
                        </button>
                        <div />
                      </div>
                      <div className="flex-1 pl-3 text-[10px] text-slate-500 italic leading-normal">
                        Tip: Use the Arrow pad or the sliders to nudge your document perfectly inside the card frame mask.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Flip H/V */}
                <div className="space-y-2">
                  <label className="text-xs text-slate-400 font-semibold block">Flip / Mirrors</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => {
                        if (editingSide === 'front') {
                          updateProject({ ...project, flipH: !project.flipH });
                        } else {
                          updateProject({ ...project, backFlipH: !(project.backFlipH || false) });
                        }
                      }}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        activeSideData.flipH ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <FlipHorizontal className="w-4 h-4" />
                      Horizontal
                    </button>
                    <button 
                      onClick={() => {
                        if (editingSide === 'front') {
                          updateProject({ ...project, flipV: !project.flipV });
                        } else {
                          updateProject({ ...project, backFlipV: !(project.backFlipV || false) });
                        }
                      }}
                      className={`py-2 px-3 text-xs font-semibold rounded-xl border flex items-center justify-center gap-1.5 transition ${
                        activeSideData.flipV ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                      }`}
                    >
                      <FlipVertical className="w-4 h-4" />
                      Vertical
                    </button>
                  </div>
                </div>

                {/* Free Skew controls */}
                <div className="space-y-3 pt-2">
                  <label className="text-xs text-slate-400 font-semibold block">Perspective Skew (Warp Correction)</label>
                  
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Skew Horizontal</span>
                      <span className="font-mono font-bold">{project.skewX}°</span>
                    </div>
                    <input 
                      type="range" min="-45" max="45" step="1"
                      value={project.skewX}
                      onChange={(e) => updateProject({ ...project, skewX: parseInt(e.target.value) }, false)}
                      className="w-full accent-indigo-600 h-1 bg-slate-800 rounded"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">Skew Vertical</span>
                      <span className="font-mono font-bold">{project.skewY}°</span>
                    </div>
                    <input 
                      type="range" min="-45" max="45" step="1"
                      value={project.skewY}
                      onChange={(e) => updateProject({ ...project, skewY: parseInt(e.target.value) }, false)}
                      className="w-full accent-indigo-600 h-1 bg-slate-800 rounded"
                    />
                  </div>
                </div>

                {/* Reset Transforms */}
                <button 
                  onClick={resetTransform}
                  className="w-full py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 text-xs font-semibold rounded-xl transition mt-4"
                >
                  Reset Document Position
                </button>

              </div>
            )}

            {/* OVERLAYS TAB */}
            {activeTab === 'overlays' && (
              <div className="space-y-6 text-xs">
                
                {/* Text Overlay Tool */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <FontIcon className="w-3.5 h-3.5 text-indigo-400" />
                    Custom Text Overlays
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newTextContent}
                      onChange={(e) => setNewTextContent(e.target.value)}
                      placeholder="Label content"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => addOverlayElement('text', newTextContent)}
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* QR Codes Overlay Tool */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-indigo-400" />
                    QR Code Generator
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newQrContent}
                      onChange={(e) => setNewQrContent(e.target.value)}
                      placeholder="QR data value"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => addOverlayElement('qrcode', newQrContent)}
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                <div className="h-px bg-slate-800" />

                {/* Barcodes Overlay Tool */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-indigo-400" />
                    Barcode Generator
                  </h4>
                  <div className="flex gap-2">
                    <input 
                      type="text"
                      value={newBarcodeContent}
                      onChange={(e) => setNewBarcodeContent(e.target.value)}
                      placeholder="EAN-13/UPC content"
                      className="flex-1 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl focus:border-indigo-500 focus:outline-none"
                    />
                    <button
                      onClick={() => addOverlayElement('barcode', newBarcodeContent)}
                      className="px-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl transition font-semibold"
                    >
                      Add
                    </button>
                  </div>
                </div>

                {/* Layer Stack Items */}
                {project.overlays.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h5 className="font-semibold text-slate-400 block border-b border-slate-800 pb-1.5">Active Overlay Layers</h5>
                    {project.overlays.map(ov => (
                      <div key={ov.id} className="flex items-center justify-between bg-slate-950 px-3 py-2 rounded-xl border border-slate-850">
                        <div className="flex items-center gap-2">
                          {ov.type === 'text' ? <FontIcon className="w-3.5 h-3.5 text-indigo-400" /> :
                           ov.type === 'qrcode' ? <QrCode className="w-3.5 h-3.5 text-emerald-400" /> : <Barcode className="w-3.5 h-3.5 text-purple-400" />}
                          <span className="font-mono text-[10px] text-slate-300 truncate max-w-[120px]">{ov.content}</span>
                        </div>
                        <button 
                          onClick={() => removeOverlayElement(ov.id)}
                          className="text-slate-500 hover:text-red-400 transition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

              </div>
            )}

            {/* BATCH TILING & LAYOUT TAB */}
            {activeTab === 'layout' && (
              <div className="space-y-4 text-xs">
                
                {/* Paper settings */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold block">Print Paper Size</label>
                  <select
                    value={project.printSettings.paperSize}
                    onChange={(e) => {
                      const sizeId = e.target.value;
                      const sizeObj = PAPER_SIZES.find(p => p.id === sizeId);
                      updateProject({
                        ...project,
                        printSettings: {
                          ...project.printSettings,
                          paperSize: sizeId as any,
                          customPaperWidthMm: sizeObj ? sizeObj.widthMm : project.printSettings.customPaperWidthMm,
                          customPaperHeightMm: sizeObj ? sizeObj.heightMm : project.printSettings.customPaperHeightMm,
                        }
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    {PAPER_SIZES.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                {/* Tiling arrangement style */}
                <div className="space-y-2 pt-1 border-t border-slate-800/50 mt-1">
                  <label className="text-slate-400 font-semibold block">Tiling Arrangement Style</label>
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-850">
                    <button
                      onClick={() => setTilingMode('front')}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase text-center transition select-none ${
                        tilingMode === 'front' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Front Only
                    </button>
                    <button
                      onClick={() => setTilingMode('back')}
                      disabled={!project.backImageSrc}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase text-center transition select-none ${
                        !project.backImageSrc ? 'opacity-45 cursor-not-allowed' : ''
                      } ${
                        tilingMode === 'back' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={!project.backImageSrc ? 'Upload Back Side first to enable' : 'Print Back side only'}
                    >
                      Back Only
                    </button>
                    <button
                      onClick={() => setTilingMode('both')}
                      disabled={!project.backImageSrc}
                      className={`py-1.5 px-2 rounded-lg text-[10px] font-bold uppercase text-center transition select-none ${
                        !project.backImageSrc ? 'opacity-45 cursor-not-allowed' : ''
                      } ${
                        tilingMode === 'both' 
                          ? 'bg-indigo-600 text-white shadow-xs' 
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                      title={!project.backImageSrc ? 'Upload Back Side first to enable' : 'Arrange Front and Back side-by-side'}
                    >
                      Front &amp; Back
                    </button>
                  </div>
                  {project.backImageSrc && tilingMode === 'both' && (
                    <div className="p-2 bg-indigo-950/40 border border-indigo-900/40 text-[9px] text-indigo-300 rounded-lg">
                      Alternating Front &amp; Back side-by-side. Ready for dual-side matched card prints!
                    </div>
                  )}
                </div>

                {/* Copies Row */}
                <div className="space-y-1.5">
                  <label className="text-slate-400 font-semibold block">Auto-Tile Copies Count</label>
                  <div className="flex items-center gap-3">
                    <input 
                      type="number" min="1" max="100"
                      value={project.printSettings.copies}
                      onChange={(e) => updateProject({
                        ...project,
                        printSettings: { ...project.printSettings, copies: Math.max(1, parseInt(e.target.value) || 1) }
                      })}
                      className="w-20 px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl font-mono text-center focus:outline-none"
                    />
                    <span className="text-[10px] text-slate-500">Auto arranged with safe margin limits.</span>
                  </div>
                </div>

                {/* Layout Margins */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px]">Top Margin (mm)</span>
                    <input 
                      type="number" min="0" max="100"
                      value={project.printSettings.marginTopMm}
                      onChange={(e) => updateProject({
                        ...project,
                        printSettings: { ...project.printSettings, marginTopMm: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-slate-500 text-[10px]">Left Margin (mm)</span>
                    <input 
                      type="number" min="0" max="100"
                      value={project.printSettings.marginLeftMm}
                      onChange={(e) => updateProject({
                        ...project,
                        printSettings: { ...project.printSettings, marginLeftMm: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-1 bg-slate-950 border border-slate-800 rounded-lg text-center"
                    />
                  </div>
                </div>

                {/* Rulers Guides Toggles */}
                <div className="space-y-2 pt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Show Safe Print Area Guidelines</span>
                    <input 
                      type="checkbox"
                      checked={project.printSettings.showGuidelines}
                      onChange={(e) => updateProject({
                        ...project,
                        printSettings: { ...project.printSettings, showGuidelines: e.target.checked }
                      })}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Show Ruler alignment Grid</span>
                    <input 
                      type="checkbox"
                      checked={project.printSettings.showGrid}
                      onChange={(e) => updateProject({
                        ...project,
                        printSettings: { ...project.printSettings, showGrid: e.target.checked }
                      })}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                  </div>
                </div>

              </div>
            )}

          </div>
        </div>

        {/* Center Main Stage Canvas */}
        <div 
          id="editor-workspace"
          ref={workspaceRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          className={`flex-1 relative overflow-hidden bg-slate-950 flex items-center justify-center p-8 ${
            isSpacePressed ? 'cursor-grab active:cursor-grabbing' : ''
          }`}
        >
          
          {/* Virtual Top & Left Canvas Rulers */}
          <div className="absolute top-0 left-0 right-0 h-5 bg-slate-900 border-b border-slate-800 flex items-center select-none font-mono text-[8px] text-slate-500 z-10 no-print">
            <span className="w-16 shrink-0 text-center border-r border-slate-800 text-slate-400 uppercase font-bold text-[7px] tracking-widest bg-slate-950">ID Studio</span>
            <div className="flex-1 flex justify-between px-4">
              {[0, 20, 40, 60, 80, 100, 120, 140, 160, 180, 200, 220, 240, 260, 280, 300].map(mm => (
                <span key={mm} className="relative">
                  {mm}mm
                  <span className="absolute top-full left-1/2 w-px h-1.5 bg-slate-800" />
                </span>
              ))}
            </div>
          </div>

          <div className="absolute top-5 left-0 bottom-0 w-6 bg-slate-900 border-r border-slate-800 flex flex-col justify-between py-4 select-none font-mono text-[8px] text-slate-500 z-10 no-print">
            {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300].map(mm => (
              <span key={mm} className="relative text-center block">
                {mm}
                <span className="absolute left-full top-1/2 w-1.5 h-px bg-slate-800" />
              </span>
            ))}
          </div>

          {/* Guidelines overlays */}
          {project.printSettings.showGrid && (
            <div className="absolute inset-0 pointer-events-none opacity-[0.03] no-print" style={{
              backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)',
              backgroundSize: '20px 20px'
            }} />
          )}

          {/* Interactive Document / Tiling Sheet Wrapper */}
          <div 
            style={{
              transform: `scale(${project.zoom}) translate(${project.panX}px, ${project.panY}px)`,
              transition: isPanningRef.current ? 'none' : 'transform 0.15s ease-out',
            }}
            className="shadow-2xl relative interactive-zoom-container"
          >
            
            {/* VIEW MODE 1: SINGLE CARD EDITOR */}
            {editorMode === 'card' && (
              <div 
                style={{
                  width: `${cardWidthMm * 3.78}px`,
                  height: `${cardHeightMm * 3.78}px`,
                }}
                className="bg-white border border-slate-300 relative select-none rounded-[6px] overflow-hidden"
              >
                
                {/* Bleed Guidelines */}
                {project.printSettings.showGuidelines && (
                  <>
                    <div className="absolute top-[7px] bottom-[7px] left-[7px] right-[7px] border border-dashed border-red-500/50 pointer-events-none z-10">
                      <span className="absolute -top-3.5 left-0 text-[6px] text-red-500 font-bold bg-white px-0.5 uppercase tracking-widest">Safe Area</span>
                    </div>
                    <div className="absolute top-[3px] bottom-[3px] left-[3px] right-[3px] border border-red-400/20 pointer-events-none z-10" />
                  </>
                )}

                {/* Primary Card Image */}
                <div 
                  ref={imageContainerRef}
                  className="w-full h-full relative overflow-hidden select-none" 
                  style={sideTransformStyle}
                  onMouseDown={handleImageMouseDown}
                >
                  {activeSideData.imageSrc ? (
                    <img 
                      src={activeSideData.imageSrc} 
                      alt="Loaded identity document" 
                      className={`w-full h-full object-contain select-none ${
                        isImageDraggingRef.current ? 'cursor-grabbing' : 'cursor-grab hover:brightness-105'
                      }`}
                      style={sideImagePositionStyle}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      title="Left-click & Drag to position image. Scroll mouse wheel to zoom."
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-6 text-center select-none">
                      <Plus className="w-8 h-8 text-slate-500 mb-2 animate-bounce" />
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">Back Side Image Empty</span>
                      <p className="text-[10px] text-slate-500 mt-1.5 max-w-[180px]">Upload the back side image using the "Upload Back" button in the left sidebar to start editing.</p>
                    </div>
                  )}
                </div>

                {/* Overlaid Layers (Text, Barcodes, QR Codes) */}
                {project.overlays.map(ov => (
                  <div
                    key={ov.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedOverlayId(ov.id);
                    }}
                    style={{
                      left: `${ov.x}%`,
                      top: `${ov.y}%`,
                      border: selectedOverlayId === ov.id ? '2px solid #4f46e5' : '1px dashed #64748b'
                    }}
                    className="absolute cursor-move p-1 bg-white/90 text-slate-900 rounded font-bold text-xs select-none z-10 flex items-center gap-1.5"
                  >
                    {ov.type === 'text' && <span style={{ fontFamily: ov.fontFamily, color: ov.color, fontSize: ov.fontSize }}>{ov.content}</span>}
                    {ov.type === 'qrcode' && (
                      <div className="flex flex-col items-center gap-1">
                        <QrCode className="w-8 h-8 text-slate-800" />
                        <span className="text-[7px] font-mono text-slate-500">{ov.content}</span>
                      </div>
                    )}
                    {ov.type === 'barcode' && (
                      <div className="flex flex-col items-center">
                        <Barcode className="w-10 h-6 text-slate-800" />
                        <span className="text-[7px] font-mono text-slate-500">{ov.content}</span>
                      </div>
                    )}

                    {selectedOverlayId === ov.id && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOverlayElement(ov.id);
                        }}
                        className="p-0.5 bg-red-500 hover:bg-red-600 text-white rounded cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}

              </div>
            )}

            {/* VIEW MODE 2: PRINT SHEET TILING PREVIEW */}
            {editorMode === 'sheet' && (
              <>
                {/* Dynamic @page configuration for print settings to automatically load in browser print dialog */}
                <style dangerouslySetInnerHTML={{ __html: `
                  @media print {
                    @page {
                      size: ${project.printSettings.paperSize || 'A4'} ${project.printSettings.orientation || 'portrait'};
                      margin: 0;
                    }
                  }
                `}} />
                
                <div 
                  id="print-sheet-content"
                  style={{
                    width: `${paperWidthMm * 3.78}px`,
                    height: `${paperHeightMm * 3.78}px`,
                  }}
                  className="bg-white border-2 border-slate-400 relative select-none rounded shadow-lg p-6 print-area"
                >
                
                {/* Paper limits overlay guides */}
                {project.printSettings.showGuidelines && (
                  <div 
                    style={{
                      top: `${project.printSettings.marginTopMm * 3.78}px`,
                      left: `${project.printSettings.marginLeftMm * 3.78}px`,
                      right: `${project.printSettings.marginRightMm * 3.78}px`,
                      bottom: `${project.printSettings.marginBottomMm * 3.78}px`,
                    }}
                    className="absolute border border-dashed border-indigo-400/50 pointer-events-none no-print"
                  >
                    <span className="absolute -top-3.5 left-0 text-[7px] text-indigo-600 font-bold bg-white px-0.5 uppercase tracking-widest">Safe Margin Bounds</span>
                  </div>
                )}

                {/* Auto Tiled Copies layout Grid */}
                <div 
                  style={{
                    top: `${project.printSettings.marginTopMm * 3.78}px`,
                    left: `${project.printSettings.marginLeftMm * 3.78}px`,
                  }}
                  className="absolute flex flex-wrap gap-4 p-2"
                >
                  {Array.from({ 
                    length: (tilingMode === 'both' && project.backImageSrc) 
                      ? project.printSettings.copies * 2 
                      : project.printSettings.copies 
                  }).map((_, idx) => {
                    // Determine which side is printed for this slot
                    let isBackSide = false;
                    if (tilingMode === 'back' && project.backImageSrc) {
                      isBackSide = true;
                    } else if (tilingMode === 'both' && project.backImageSrc) {
                      isBackSide = idx % 2 === 1;
                    }

                    const currentImg = isBackSide ? project.backImageSrc : project.imageSrc;
                    const currentStyle = isBackSide ? backTransformStyle : frontTransformStyle;

                    return (
                      <div
                        key={idx}
                        style={{
                          width: `${cardWidthMm * 3.78}px`,
                          height: `${cardHeightMm * 3.78}px`,
                        }}
                        className="border border-slate-300 print:border-none relative select-none rounded-[6px] print:rounded-none overflow-hidden bg-slate-50 print:bg-transparent"
                      >
                        <div className="w-full h-full relative" style={currentStyle}>
                          <img 
                            src={currentImg} 
                            alt={isBackSide ? "Back side print crop" : "Front side print crop"} 
                            className="w-full h-full object-contain"
                            style={isBackSide ? backImagePositionStyle : frontImagePositionStyle}
                            draggable={false}
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        
                        {/* Grid overlap simulation of custom elements */}
                        {project.overlays.map(ov => (
                          <div
                            key={ov.id}
                            style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
                            className="absolute p-0.5 bg-white/95 text-slate-900 rounded font-bold text-[8px] select-none"
                          >
                            {ov.type === 'text' && <span style={{ fontSize: '7px' }}>{ov.content}</span>}
                            {ov.type === 'qrcode' && <QrCode className="w-4 h-4 text-slate-800" />}
                            {ov.type === 'barcode' && <Barcode className="w-5 h-3 text-slate-800" />}
                          </div>
                        ))}

                        {/* Side Indicator Badge */}
                        <div className="absolute bottom-1 right-1 px-1 py-0.5 bg-slate-900/80 text-white rounded text-[6px] font-bold uppercase tracking-wider select-none pointer-events-none font-mono no-print">
                          {isBackSide ? 'Back' : 'Front'}
                        </div>

                        {/* Align Guides */}
                        {project.printSettings.showGuidelines && (
                          <div className="absolute inset-0 border border-slate-500/10 flex items-center justify-center pointer-events-none no-print">
                            <div className="w-px h-full bg-slate-600/10" />
                            <div className="h-px w-full bg-slate-600/10" />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

              </div>
            </>
          )}

          </div>

          {/* Overlay Stage Floating controls */}
          <div className="absolute bottom-5 right-5 flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1.5 rounded-xl backdrop-blur no-print">
            <button onClick={zoomOut} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition" title="Zoom Out (Ctrl+-)">
              <ZoomOut className="w-4 h-4" />
            </button>
            <span className="text-[10px] font-mono font-bold text-slate-400 w-12 text-center">
              {Math.round(project.zoom * 100)}%
            </span>
            <button onClick={zoomIn} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition" title="Zoom In (Ctrl++)">
              <ZoomIn className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-1" />
            <button onClick={resetTransform} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-300 transition" title="Fit Screen">
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

        </div>

        {/* Right Inspector Print controls */}
        <div className="w-80 shrink-0 bg-slate-950 border-l border-slate-850 flex flex-col z-10 no-print">
          <div className="h-12 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
            <span className="text-xs font-bold text-slate-300 tracking-wider uppercase">Print &amp; Shortcuts</span>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 text-xs">
            
            {/* Template Selector details */}
            <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl space-y-3">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Template Standards</span>
              <div className="space-y-1">
                <span className="text-slate-300 font-semibold">{currentTemplate.name}</span>
                <p className="text-[10px] text-slate-500 leading-normal">{currentTemplate.description}</p>
              </div>
            </div>

            {/* Keyboard Shortcuts Help */}
            <div className="bg-slate-900 border border-slate-850 p-3.5 rounded-2xl space-y-2.5">
              <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">Keyboard shortcuts</span>
              <div className="space-y-1.5 text-[10px] text-slate-400 font-mono">
                <div className="flex justify-between"><span>Ctrl+Z</span> <span>Undo</span></div>
                <div className="flex justify-between"><span>Ctrl+Y</span> <span>Redo</span></div>
                <div className="flex justify-between"><span>Ctrl+S</span> <span>Save Project</span></div>
                <div className="flex justify-between"><span>Ctrl++ / Ctrl+-</span> <span>Zoom</span></div>
                <div className="flex justify-between"><span>Space + Drag</span> <span>Pan View</span></div>
              </div>
            </div>

          </div>

          {/* Big Print Trigger button */}
          <div className="p-4 bg-slate-950 border-t border-slate-850 shrink-0">
            <button 
              onClick={handlePrintSheet}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded transition flex items-center justify-center gap-2 shadow-sm"
            >
              <Printer className="w-5 h-5" />
              Print Tiled Document (Sheet)
            </button>
          </div>
        </div>

      </div>

      {/* MODAL: ONLINE SECURE SHARE LINK DRAWER */}
      <AnimatePresence>
        {isSharingModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-white"
            >
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Share2 className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-lg text-slate-100">Configure Secure Sharing</h3>
                </div>
                <button onClick={() => { setIsSharingModalOpen(false); setShareLinkDetails(null); }} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!shareLinkDetails ? (
                <div className="space-y-4 text-xs">
                  
                  {/* Password Protection */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-semibold">Password Lock (Optional)</label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-500 absolute top-2.5 left-3" />
                      <input 
                        type="password"
                        placeholder="Leave blank for no password"
                        value={sharePassword}
                        onChange={(e) => setSharePassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* OTP and Phone details */}
                  <div className="flex items-start justify-between bg-slate-950 p-3 rounded-xl border border-slate-850">
                    <div className="space-y-1 pr-4">
                      <span className="block font-semibold text-slate-200">OTP SMS Authentication</span>
                      <span className="text-[10px] text-slate-500 block">Require recipients to verify with OTP before printing</span>
                    </div>
                    <input 
                      type="checkbox"
                      checked={shareOtpRequired}
                      onChange={(e) => setShareOtpRequired(e.target.checked)}
                      className="w-4 h-4 accent-indigo-600 mt-1 cursor-pointer"
                    />
                  </div>

                  {shareOtpRequired && (
                    <div className="space-y-1.5">
                      <label className="text-slate-400 block">Recipient Mobile Number</label>
                      <input 
                        type="tel"
                        placeholder="+1 (555) 000-0000"
                        value={shareOtpPhone}
                        onChange={(e) => setShareOtpPhone(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500 font-mono"
                      />
                    </div>
                  )}

                  {/* Watermark Choice */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-semibold">Custom Diagonal Watermark</label>
                    <input 
                      type="text"
                      placeholder="e.g. FOR PREVIEW ONLY"
                      value={shareWatermark}
                      onChange={(e) => setShareWatermark(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Access privileges */}
                  <div className="space-y-1.5">
                    <label className="text-slate-400 block font-semibold">Access Rights Privilege</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['all', 'print', 'download'] as const).map(mode => (
                        <button
                          key={mode}
                          onClick={() => setShareAccessMode(mode)}
                          className={`py-2 rounded-xl border text-center font-semibold text-xs capitalize transition ${
                            shareAccessMode === mode ? 'bg-indigo-600 border-indigo-500 text-white' : 'bg-slate-950 border-slate-800 text-slate-400'
                          }`}
                        >
                          {mode === 'all' ? 'Print & Download' : mode + ' Only'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button 
                    onClick={createSecureShare}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded transition mt-2 shadow"
                  >
                    Generate Secure Remote Link
                  </button>

                </div>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-emerald-400 space-y-1">
                    <div className="font-bold flex items-center gap-1.5 text-sm">
                      <Check className="w-4 h-4" /> Secure Share Generated
                    </div>
                    <p className="text-[11px] leading-relaxed">This project is now synchronized. Sharing and direct remote printing are fully active.</p>
                  </div>

                  {/* QR Link display */}
                  <div className="flex gap-4 items-center bg-slate-950 p-4 rounded-xl border border-slate-850">
                    <div className="p-2 bg-white rounded-lg shrink-0">
                      <QrCode className="w-20 h-20 text-slate-900" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <span className="text-slate-400 block font-semibold">Recipient Access URL</span>
                      <div className="flex gap-1.5">
                        <input 
                          type="text"
                          readOnly
                          value={`${window.location.origin}/share/${shareLinkDetails.shareId}`}
                          className="flex-1 px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[10px] text-slate-300 font-mono select-all focus:outline-none"
                        />
                        <button 
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/share/${shareLinkDetails.shareId}`);
                            alert('Share URL Copied!');
                          }}
                          className="p-1.5 bg-slate-850 hover:bg-slate-800 border border-slate-800 rounded-lg transition"
                        >
                          <Copy className="w-3.5 h-3.5 text-slate-300" />
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500 flex gap-4">
                        <span>Expires: {new Date(shareLinkDetails.expiresAt).toLocaleTimeString()}</span>
                        {shareLinkDetails.otpCode && <span className="text-amber-400 font-bold">Sim OTP: {shareLinkDetails.otpCode}</span>}
                      </div>
                    </div>
                  </div>

                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: VERIFY PRINT SETTINGS CONFIRMATION WITH INTEGRATED LIVE HIGH-FIDELITY PRINT PREVIEW */}
      <AnimatePresence>
        {showPrintConfirmModal && (
          <div className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start md:items-center justify-center z-50 p-4 md:p-8 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="my-auto bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl text-white flex flex-col md:flex-row overflow-hidden min-h-0"
            >
              {/* Left Side: Real-time Live Print Preview Pane */}
              <div className="flex-1 bg-slate-950 p-6 flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-slate-800 min-h-[380px] md:min-h-0">
                <div className="w-full flex items-center justify-between mb-4 border-b border-slate-900 pb-2">
                  <div className="flex items-center gap-2">
                    <Eye className="w-4 h-4 text-emerald-400" />
                    <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Live Output Print Preview</span>
                  </div>
                  <span className="text-[9px] font-mono text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                    Scale: {Math.round((330 / (paperWidthMm * 3.78)) * 100)}%
                  </span>
                </div>

                {/* Scaled Tiled Sheet Preview Box */}
                <div className="relative flex items-center justify-center p-4 bg-slate-900/40 rounded-2xl border border-slate-900/60 shadow-inner">
                  {(() => {
                    const previewBoxWidth = 330;
                    const realSheetWidth = paperWidthMm * 3.78;
                    const realSheetHeight = paperHeightMm * 3.78;
                    const previewScaleFactor = previewBoxWidth / realSheetWidth;
                    const previewBoxHeight = realSheetHeight * previewScaleFactor;

                    return (
                      <div 
                        style={{
                          width: `${previewBoxWidth}px`,
                          height: `${previewBoxHeight}px`,
                        }}
                        className="relative overflow-hidden bg-slate-950 rounded-lg shadow-2xl flex items-center justify-center"
                      >
                        {/* Miniature sheet itself */}
                        <div 
                          style={{
                            width: `${realSheetWidth}px`,
                            height: `${realSheetHeight}px`,
                            transform: `scale(${previewScaleFactor})`,
                            transformOrigin: 'top left',
                            position: 'absolute',
                            top: 0,
                            left: 0,
                          }}
                          className="bg-white relative select-none shadow-lg"
                        >
                          {/* Guidelines */}
                          {project.printSettings.showGuidelines && (
                            <div 
                              style={{
                                top: `${project.printSettings.marginTopMm * 3.78}px`,
                                left: `${project.printSettings.marginLeftMm * 3.78}px`,
                                right: `${project.printSettings.marginRightMm * 3.78}px`,
                                bottom: `${project.printSettings.marginBottomMm * 3.78}px`,
                              }}
                              className="absolute border border-dashed border-indigo-400 pointer-events-none"
                            />
                          )}

                          {/* Grid alignment */}
                          <div 
                            style={{
                              top: `${project.printSettings.marginTopMm * 3.78}px`,
                              left: `${project.printSettings.marginLeftMm * 3.78}px`,
                            }}
                            className="absolute flex flex-wrap gap-4 p-2"
                          >
                            {Array.from({ 
                              length: (tilingMode === 'both' && project.backImageSrc) 
                                ? project.printSettings.copies * 2 
                                : project.printSettings.copies 
                            }).map((_, idx) => {
                              let isBackSide = false;
                              if (tilingMode === 'back' && project.backImageSrc) {
                                isBackSide = true;
                              } else if (tilingMode === 'both' && project.backImageSrc) {
                                isBackSide = idx % 2 === 1;
                              }

                              const currentImg = isBackSide ? project.backImageSrc : project.imageSrc;
                              const currentStyle = isBackSide ? backTransformStyle : frontTransformStyle;

                              return (
                                <div
                                  key={idx}
                                  style={{
                                    width: `${cardWidthMm * 3.78}px`,
                                    height: `${cardHeightMm * 3.78}px`,
                                  }}
                                  className="border border-slate-300 relative select-none rounded-[5px] overflow-hidden bg-slate-50 shadow-xs"
                                >
                                  <div className="w-full h-full relative" style={currentStyle}>
                                    <img 
                                      src={currentImg} 
                                      alt="Preview" 
                                      className="w-full h-full object-contain"
                                      style={isBackSide ? backImagePositionStyle : frontImagePositionStyle}
                                      draggable={false}
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>

                                  {/* Custom Overlays inside preview */}
                                  {project.overlays.map(ov => (
                                    <div
                                      key={ov.id}
                                      style={{ left: `${ov.x}%`, top: `${ov.y}%` }}
                                      className="absolute p-0.5 bg-white/95 text-slate-900 rounded font-bold text-[8px] select-none"
                                    >
                                      {ov.type === 'text' && <span style={{ fontSize: '7px' }}>{ov.content}</span>}
                                      {ov.type === 'qrcode' && <QrCode className="w-3.5 h-3.5 text-slate-800" />}
                                      {ov.type === 'barcode' && <Barcode className="w-4 h-2.5 text-slate-800" />}
                                    </div>
                                  ))}

                                  {/* Side Indicator Badge */}
                                  <div className="absolute bottom-0.5 right-0.5 px-0.5 py-0.2 bg-slate-900/80 text-white rounded text-[5px] font-bold uppercase select-none pointer-events-none">
                                    {isBackSide ? 'Back' : 'Front'}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <p className="text-[10px] text-slate-500 mt-4 text-center leading-normal max-w-xs font-mono">
                  Guaranteed scale-matched preview.
                </p>
              </div>

              {/* Right Side: Print settings Verification panel */}
              <div className="w-full md:w-[380px] p-6 flex flex-col justify-between space-y-6">
                <div className="space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center gap-2">
                      <Printer className="w-5 h-5 text-indigo-500" />
                      <h3 className="font-semibold text-base text-slate-100">Verify Print Settings</h3>
                    </div>
                    <button onClick={() => setShowPrintConfirmModal(false)} className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition">
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4 text-xs">
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                      Please verify the document layout configuration before running. Match printer settings with values below:
                    </p>

                    <div className="flex flex-col bg-slate-950 rounded-2xl border border-slate-850 overflow-hidden divide-y divide-slate-900">
                      {/* Paper Format */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Paper Format</span>
                        </div>
                        <select
                          value={project.printSettings.paperSize}
                          onChange={(e) => {
                            const sizeId = e.target.value;
                            const sizeObj = PAPER_SIZES.find(p => p.id === sizeId);
                            updateProject({
                              ...project,
                              printSettings: {
                                ...project.printSettings,
                                paperSize: sizeId as any,
                                customPaperWidthMm: sizeObj ? sizeObj.widthMm : project.printSettings.customPaperWidthMm,
                                customPaperHeightMm: sizeObj ? sizeObj.heightMm : project.printSettings.customPaperHeightMm,
                              }
                            });
                          }}
                          className="bg-slate-900 text-slate-200 font-semibold text-[11px] rounded-lg px-2 py-1 border border-slate-800 focus:outline-none focus:border-indigo-500 max-w-[170px]"
                        >
                          {PAPER_SIZES.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </div>

                      {/* Orientation */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Orientation</span>
                        </div>
                        <select
                          value={project.printSettings.orientation}
                          onChange={(e) => updateProject({
                            ...project,
                            printSettings: { ...project.printSettings, orientation: e.target.value as 'portrait' | 'landscape' }
                          })}
                          className="bg-slate-900 text-slate-200 font-semibold text-[11px] rounded-lg px-2 py-1 border border-slate-800 focus:outline-none focus:border-indigo-500 capitalize"
                        >
                          <option value="portrait">Portrait</option>
                          <option value="landscape">Landscape</option>
                        </select>
                      </div>

                      {/* Tiling Arrangement Style */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Grid className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Tiling Style</span>
                        </div>
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => setTilingMode('front')}
                            className={`py-1 px-1.5 rounded text-[9px] font-bold uppercase transition select-none ${
                              tilingMode === 'front' 
                                ? 'bg-indigo-600 text-white shadow-xs' 
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                          >
                            Front
                          </button>
                          <button
                            type="button"
                            disabled={!project.backImageSrc}
                            onClick={() => setTilingMode('back')}
                            className={`py-1 px-1.5 rounded text-[9px] font-bold uppercase transition select-none ${
                              !project.backImageSrc ? 'opacity-40 cursor-not-allowed' : ''
                            } ${
                              tilingMode === 'back' 
                                ? 'bg-indigo-600 text-white shadow-xs' 
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                            title={!project.backImageSrc ? 'Upload back side first' : 'Back side only'}
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            disabled={!project.backImageSrc}
                            onClick={() => setTilingMode('both')}
                            className={`py-1 px-1.5 rounded text-[9px] font-bold uppercase transition select-none ${
                              !project.backImageSrc ? 'opacity-40 cursor-not-allowed' : ''
                            } ${
                              tilingMode === 'both' 
                                ? 'bg-indigo-600 text-white shadow-xs' 
                                : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                            }`}
                            title={!project.backImageSrc ? 'Upload back side first' : 'Front & Back side-by-side'}
                          >
                            Both
                          </button>
                        </div>
                      </div>

                      {/* DPI Speed */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Print Quality</span>
                        </div>
                        <select
                          value={project.printSettings.dpi}
                          onChange={(e) => updateProject({
                            ...project,
                            printSettings: { ...project.printSettings, dpi: parseInt(e.target.value) as any }
                          })}
                          className="bg-slate-900 text-slate-200 font-semibold text-[11px] rounded-lg px-2 py-1 border border-slate-800 focus:outline-none focus:border-indigo-500"
                        >
                          <option value="300">300 DPI (Standard)</option>
                          <option value="600">600 DPI (HD)</option>
                          <option value="1200">1200 DPI (Studio)</option>
                        </select>
                      </div>

                      {/* Color Mode */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Sliders className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Color Mode</span>
                        </div>
                        <select
                          value={project.printSettings.colorMode}
                          onChange={(e) => updateProject({
                            ...project,
                            printSettings: { ...project.printSettings, colorMode: e.target.value as any }
                          })}
                          className="bg-slate-900 text-slate-200 font-semibold text-[11px] rounded-lg px-2 py-1 border border-slate-800 focus:outline-none focus:border-indigo-500 max-w-[150px]"
                        >
                          <option value="RGB">RGB (Digital Color)</option>
                          <option value="CMYK_Preview">CMYK Commercial Press</option>
                          <option value="Grayscale">Grayscale (B&W)</option>
                        </select>
                      </div>

                      {/* Total Copies */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Total Copies</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => updateProject({
                              ...project,
                              printSettings: { ...project.printSettings, copies: Math.max(1, project.printSettings.copies - 1) }
                            })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded text-slate-400 font-bold border border-slate-800 active:scale-95 transition text-xs"
                          >
                            -
                          </button>
                          <input 
                            type="number" min="1" max="100"
                            value={project.printSettings.copies}
                            onChange={(e) => updateProject({
                              ...project,
                              printSettings: { ...project.printSettings, copies: Math.max(1, parseInt(e.target.value) || 1) }
                            })}
                            className="w-10 text-center bg-slate-900 text-slate-200 font-semibold text-[11px] rounded px-1 py-0.5 border border-slate-800 focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => updateProject({
                              ...project,
                              printSettings: { ...project.printSettings, copies: Math.min(100, project.printSettings.copies + 1) }
                            })}
                            className="w-5 h-5 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded text-slate-400 font-bold border border-slate-800 active:scale-95 transition text-xs"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Safe Margins */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Maximize className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Safe Margins</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-mono text-[9px] uppercase">Top:</span>
                            <input 
                              type="number" min="0" max="100"
                              value={project.printSettings.marginTopMm}
                              onChange={(e) => updateProject({
                                ...project,
                                printSettings: { ...project.printSettings, marginTopMm: parseInt(e.target.value) || 0 }
                              })}
                              className="w-9 text-center bg-slate-900 text-slate-200 font-semibold text-[11px] rounded px-1 py-0.5 border border-slate-800 focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-500">mm</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500 font-mono text-[9px] uppercase">Left:</span>
                            <input 
                              type="number" min="0" max="100"
                              value={project.printSettings.marginLeftMm}
                              onChange={(e) => updateProject({
                                ...project,
                                printSettings: { ...project.printSettings, marginLeftMm: parseInt(e.target.value) || 0 }
                              })}
                              className="w-9 text-center bg-slate-900 text-slate-200 font-semibold text-[11px] rounded px-1 py-0.5 border border-slate-800 focus:outline-none"
                            />
                            <span className="text-[9px] text-slate-500">mm</span>
                          </div>
                        </div>
                      </div>

                      {/* Guidelines Toggle */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Show Guidelines</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={project.printSettings.showGuidelines}
                          onChange={(e) => updateProject({
                            ...project,
                            printSettings: { ...project.printSettings, showGuidelines: e.target.checked }
                          })}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 accent-indigo-600 cursor-pointer"
                        />
                      </div>

                      {/* Alignment Grid Toggle */}
                      <div className="flex items-center justify-between p-3 hover:bg-slate-900/30 transition">
                        <div className="flex items-center gap-2">
                          <Grid className="w-3.5 h-3.5 text-slate-400" />
                          <span className="text-slate-400 font-medium">Show Alignment Grid</span>
                        </div>
                        <input 
                          type="checkbox"
                          checked={project.printSettings.showGrid}
                          onChange={(e) => updateProject({
                            ...project,
                            printSettings: { ...project.printSettings, showGrid: e.target.checked }
                          })}
                          className="w-3.5 h-3.5 rounded bg-slate-900 border-slate-800 text-indigo-600 focus:ring-0 focus:ring-offset-0 accent-indigo-600 cursor-pointer"
                        />
                      </div>
                    </div>

                    <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-850 space-y-2">
                      <span className="text-[9px] font-bold text-indigo-400 block uppercase tracking-wider">Browser Printing Best Practices:</span>
                      <ul className="list-disc list-inside space-y-1 text-slate-400 text-[11px] leading-relaxed">
                        <li>Set <b>Margins to None</b> (or Default) in printer settings.</li>
                        <li>Check/Enable <b>Background Graphics</b>.</li>
                        <li>Verify printer paper is loaded and matched.</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowPrintConfirmModal(false)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-750 text-slate-200 font-semibold rounded-xl transition text-center text-xs"
                  >
                    Adjust Settings
                  </button>
                  <button
                    type="button"
                    onClick={executePrint}
                    className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-semibold rounded-xl transition text-center text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-indigo-600/15"
                  >
                    <Printer className="w-4 h-4" />
                    Print Now
                  </button>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
