export interface ServiceOrderImage {
  id: string;
  service_order_id: string;
  uploadthing_key: string;
  uploadthing_url: string;
  file_name: string;
  file_size?: number; // Mantido para compatibilidade, mas pode ser null
  mime_type?: string; // Mantido para compatibilidade, mas pode ser null
  width?: number;
  height?: number;
  is_compressed?: boolean;
  original_format?: string;
  processed_format?: string;
  upload_status?: string;
  storage_path?: string;
  thumbnail_path?: string;
  original_size?: number;
  processed_size?: number;
  image_index?: number;
  upload_order: number;
  created_at: string;
  uploaded_by?: string;
  original_filename?: string;
  processed_filename?: string;
  metadata?: any;
}

export interface ImageUploadState {
  files: File[];
  previews: string[];
  uploading: boolean;
  progress: number;
  error: string | null;
  uploadedImages: ServiceOrderImage[];
}

export interface ImageProcessingOptions {
  maxSizeInMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType?: string; // Tornado opcional para evitar conversões forçadas
  initialQuality: number;
}

export interface ImageUploadResult {
  success: boolean;
  image?: ServiceOrderImage;
  error?: string;
}

export interface ImageUploadHookReturn {
  state: ImageUploadState;
  addFiles: (files: FileList | File[]) => Promise<void>;
  removeFile: (index: number) => void;
  uploadImages: (serviceOrderId: string) => Promise<ImageUploadResult[]>;
  clearAll: () => void;
  deleteImage: (imageId: string) => Promise<boolean>;
}

export interface ImageDropZoneProps {
  onFilesAdded: (files: FileList | File[]) => void;
  maxFiles: number;
  currentFileCount: number;
  disabled?: boolean;
  className?: string;
}

export interface ImagePreviewProps {
  file: File;
  preview: string;
  index: number;
  onRemove: (index: number) => void;
  uploading?: boolean;
}

export interface ImageUploadSectionProps {
  serviceOrderId?: string | undefined;
  onImagesChange?: (images: ServiceOrderImage[]) => void;
  onPendingFilesChange?: (hasPendingFiles: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const IMAGE_UPLOAD_CONFIG = {
  MAX_FILES: 3,
  MAX_SIZE_MB: 5,
  MAX_COMPRESSED_SIZE_MB: 3,
  ACCEPTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'],
  COMPRESSION_OPTIONS: {
    maxSizeInMB: 3,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    // REMOVIDO: fileType: 'image/jpeg', - Esta configuração estava forçando conversão e causando corrupção
    initialQuality: 0.8,
  },
} as const;

export type AcceptedImageType = typeof IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES[number];