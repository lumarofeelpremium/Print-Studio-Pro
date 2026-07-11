import { CardTemplate, PrintSettings, ImageAdjustments } from './types';

export const CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'employee_card',
    name: 'Corporate Employee ID',
    category: 'ID Cards',
    widthMm: 85.6,
    heightMm: 53.98,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: true,
    hasQrCode: true,
    description: 'Standard corporate ID card size (CR-80 CR80 specs).'
  },
  {
    id: 'school_id',
    name: 'School Student Badge',
    category: 'ID Cards',
    widthMm: 85.6,
    heightMm: 53.98,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: true,
    hasQrCode: false,
    description: 'Standard vertical or horizontal primary school ID template.'
  },
  {
    id: 'college_id',
    name: 'College ID Badge',
    category: 'ID Cards',
    widthMm: 53.98,
    heightMm: 85.6,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: true,
    hasQrCode: true,
    description: 'Vertical orientation college badge card with scanner barcodes.'
  },
  {
    id: 'pvc_card',
    name: 'Universal PVC Plastic Card',
    category: 'ID Cards',
    widthMm: 85.6,
    heightMm: 53.98,
    defaultDpi: 600,
    hasPhotoArea: false,
    hasBarcode: false,
    hasQrCode: false,
    description: 'Direct print layout for thermal dye PVC card printers.'
  },
  {
    id: 'passport_photo',
    name: 'Passport Photo (EU / UK / Asia)',
    category: 'Photos',
    widthMm: 35,
    heightMm: 45,
    defaultDpi: 600,
    hasPhotoArea: true,
    hasBarcode: false,
    hasQrCode: false,
    description: 'Standard 35mm x 45mm passport dimensions with facial guides.'
  },
  {
    id: 'visa_photo',
    name: 'US Visa / Passport Photo (2" x 2")',
    category: 'Photos',
    widthMm: 50.8,
    heightMm: 50.8,
    defaultDpi: 600,
    hasPhotoArea: true,
    hasBarcode: false,
    hasQrCode: false,
    description: 'Standard 2x2 inches (51mm x 51mm) photo layout with centered guides.'
  },
  {
    id: 'pan_card',
    name: 'PAN Card (India)',
    category: 'Government',
    widthMm: 85.6,
    heightMm: 54,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: false,
    hasQrCode: true,
    description: 'Income Tax Department PAN card template layout.'
  },
  {
    id: 'driving_license',
    name: 'Driving License Format',
    category: 'Government',
    widthMm: 85.6,
    heightMm: 53.98,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: true,
    hasQrCode: true,
    description: 'National driving permit dimension configuration.'
  },
  {
    id: 'aadhaar_size',
    name: 'Aadhaar Card Snipped Size',
    category: 'Government',
    widthMm: 86,
    heightMm: 54,
    defaultDpi: 300,
    hasPhotoArea: true,
    hasBarcode: false,
    hasQrCode: true,
    description: 'Compact Aadhaar size for wallet PVC prints.'
  },
  {
    id: 'event_pass',
    name: 'VIP Event Pass / Large Ticket',
    category: 'Custom',
    widthMm: 101.6,
    heightMm: 152.4,
    defaultDpi: 300,
    hasPhotoArea: false,
    hasBarcode: true,
    hasQrCode: true,
    description: 'Lanyard pocket size VIP event and seminar badge (4" x 6").'
  }
];

export const DEFAULT_ADJUSTMENTS: ImageAdjustments = {
  brightness: 0,
  contrast: 0,
  exposure: 0,
  gamma: 1.0,
  highlights: 0,
  shadows: 0,
  temperature: 0,
  saturation: 0,
  sharpness: 0,
  blur: 0,
  noiseReduction: 0,
  grayscale: false,
  cmykPreview: false,
  opacity: 100
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  printerName: 'System Default PDF Printer',
  paperSize: 'A4',
  customPaperWidthMm: 210,
  customPaperHeightMm: 297,
  orientation: 'portrait',
  marginLeftMm: 10,
  marginRightMm: 10,
  marginTopMm: 10,
  marginBottomMm: 10,
  bleedMm: 2,
  safeAreaMm: 4,
  dpi: 300,
  colorMode: 'RGB',
  borderless: false,
  copies: 1,
  scaleMode: 'actual',
  customScalePercent: 100,
  showGrid: true,
  snapToGrid: true,
  showGuidelines: true
};

export const PAPER_SIZES = [
  { id: 'A4', name: 'A4 Standard (210 x 297 mm)', widthMm: 210, heightMm: 297 },
  { id: 'A5', name: 'A5 Compact (148 x 210 mm)', widthMm: 148, heightMm: 210 },
  { id: 'Letter', name: 'US Letter (8.5" x 11" / 216 x 279 mm)', widthMm: 215.9, heightMm: 279.4 },
  { id: 'Legal', name: 'US Legal (8.5" x 14" / 216 x 356 mm)', widthMm: 215.9, heightMm: 355.6 },
  { id: 'PVC_Card', name: 'Single PVC Card (54 x 86 mm)', widthMm: 53.98, heightMm: 85.6 },
];
