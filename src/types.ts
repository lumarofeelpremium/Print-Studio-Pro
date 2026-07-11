/**
 * ID Print Studio Types
 */

export interface ImageAdjustments {
  brightness: number;   // -100 to 100
  contrast: number;     // -100 to 100
  exposure: number;     // -100 to 100
  gamma: number;        // 0.2 to 2.5
  highlights: number;   // -100 to 100
  shadows: number;      // -100 to 100
  temperature: number;  // -100 to 100 (warmth)
  saturation: number;   // -100 to 100
  sharpness: number;    // 0 to 100
  blur: number;         // 0 to 50 (px)
  noiseReduction: number; // 0 to 100
  grayscale: boolean;
  cmykPreview: boolean;
  opacity: number;      // 0 to 100
}

export type TemplateType =
  | 'employee_card'
  | 'school_id'
  | 'college_id'
  | 'visitor_card'
  | 'membership_card'
  | 'library_card'
  | 'event_pass'
  | 'pvc_card'
  | 'pan_card'
  | 'driving_license'
  | 'passport_photo'
  | 'visa_photo'
  | 'aadhaar_size'
  | 'custom';

export interface CardTemplate {
  id: TemplateType;
  name: string;
  category: 'ID Cards' | 'Government' | 'Photos' | 'Custom';
  widthMm: number;
  heightMm: number;
  defaultDpi: number;
  hasPhotoArea: boolean;
  hasBarcode: boolean;
  hasQrCode: boolean;
  description: string;
}

export interface PrintSettings {
  printerName: string;
  paperSize: 'A4' | 'A5' | 'Letter' | 'Legal' | 'PVC_Card' | 'Custom';
  customPaperWidthMm: number;
  customPaperHeightMm: number;
  orientation: 'portrait' | 'landscape';
  marginLeftMm: number;
  marginRightMm: number;
  marginTopMm: number;
  marginBottomMm: number;
  bleedMm: number;
  safeAreaMm: number;
  dpi: 300 | 600 | 1200;
  colorMode: 'RGB' | 'CMYK_Preview' | 'Grayscale';
  borderless: boolean;
  copies: number;
  scaleMode: 'fit' | 'actual' | 'custom';
  customScalePercent: number;
  showGrid: boolean;
  snapToGrid: boolean;
  showGuidelines: boolean;
}

export interface OverlayElement {
  id: string;
  type: 'text' | 'qrcode' | 'barcode' | 'image' | 'shape';
  x: number; // percentage or relative
  y: number;
  width: number;
  height: number;
  content: string; // text content, qr data, image src, etc.
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  italic?: boolean;
}

export interface PrintProject {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  imageSrc: string; // base64 or URL (Front side)
  originalImageSrc?: string;
  backImageSrc?: string; // base64 or URL (Back side)
  backOriginalImageSrc?: string;
  adjustments: ImageAdjustments;
  backAdjustments?: ImageAdjustments;
  templateId: TemplateType;
  printSettings: PrintSettings;
  overlays: OverlayElement[];
  zoom: number;
  panX: number;
  panY: number;
  rotation: number; // 0, 90, 180, 270 or free degrees
  backRotation?: number;
  flipH: boolean;
  flipV: boolean;
  backFlipH?: boolean;
  backFlipV?: boolean;
  skewX: number;
  skewY: number;
  cropRect?: { x: number; y: number; width: number; height: number };
  backCropRect?: { x: number; y: number; width: number; height: number };
  imageX?: number;
  imageY?: number;
  imageScale?: number;
  backImageX?: number;
  backImageY?: number;
  backImageScale?: number;
}

export interface SharedLink {
  id: string;
  projectId: string;
  projectName: string;
  createdAt: string;
  expiresAt: string;
  passwordProtected: boolean;
  passwordHash?: string;
  otpRequired: boolean;
  otpCode?: string;
  otpPhone?: string;
  accessMode: 'view' | 'print' | 'download' | 'all';
  allowDownload: boolean;
  maxDownloads: number;
  downloadCount: number;
  maxPrints: number;
  printCount: number;
  watermarkText: string;
  isRevoked: boolean;
  syncEvents: {
    id: string;
    type: 'opened' | 'downloaded' | 'printed' | 'deleted';
    timestamp: string;
    ipAddress?: string;
  }[];
}

export interface PrintQueueItem {
  id: string;
  customerName: string;
  phone: string;
  fileName: string;
  fileSrc: string; // Base64 image
  pages: number;
  copies: number;
  colorMode: 'color' | 'mono';
  paperSize: string;
  status: 'waiting' | 'processing' | 'printing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  ocrText?: string;
  barcodesDetected?: string[];
  adjustmentsApplied?: boolean;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  category: string;
  message: string;
}

export interface AnalyticsStats {
  totalProjects: number;
  activeShares: number;
  totalPrints: number;
  totalDownloads: number;
  storageUsedMb: number;
  queueWaiting: number;
  queueProcessing: number;
}
