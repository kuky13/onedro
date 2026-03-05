import { useState, useRef, useEffect, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Upload, X, Image, Video, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

// Limits
const MAX_IMAGES = 3;
const MAX_VIDEOS = 2;
const MAX_IMAGE_SIZE_MB = 5;
const MAX_VIDEO_SIZE_MB = 50;
const COMPRESSION_MAX_SIZE_MB = 3;
const COMPRESSION_MAX_WIDTH = 1920;

// Supported natively by browsers
const CONVERTIBLE_IMAGE_TYPES = ['image/heic', 'image/heif', 'image/bmp', 'image/tiff', 'image/avif'];

interface PendingFile {
  file: File;
  preview: string;
  compressed: boolean;
  originalSize: number;
  finalSize: number;
  type: 'image' | 'video';
}

export interface ProductMediaUploadRef {
  uploadPendingFiles: () => Promise<{ images: string[]; videos: string[] }>;
  hasPendingFiles: () => boolean;
}

interface ProductMediaUploadProps {
  images: string[];
  videos: string[];
  onImagesChange: (images: string[]) => void;
  onVideosChange: (videos: string[]) => void;
  disabled?: boolean;
}

export const ProductMediaUpload = forwardRef<ProductMediaUploadRef, ProductMediaUploadProps>(({
  images,
  videos,
  onImagesChange,
  onVideosChange,
  disabled = false
}, ref) => {
  const [pendingImages, setPendingImages] = useState<PendingFile[]>([]);
  const [pendingVideos, setPendingVideos] = useState<PendingFile[]>([]);
  const [processing, setProcessing] = useState<'image' | 'video' | null>(null);
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  // Cleanup previews on unmount
  useEffect(() => {
    return () => {
      pendingImages.forEach(p => URL.revokeObjectURL(p.preview));
      pendingVideos.forEach(p => URL.revokeObjectURL(p.preview));
    };
  }, []);

  const compressImage = async (file: File): Promise<File> => {
    const isHeic = ['image/heic', 'image/heif'].includes(file.type) ||
      file.name.toLowerCase().endsWith('.heic') || file.name.toLowerCase().endsWith('.heif');

    let processedFile = file;

    // Convert HEIC/HEIF to JPEG first
    if (isHeic) {
      try {
        const heic2any = (await import('heic2any')).default;
        const blob = await heic2any({ blob: file, toType: 'image/jpeg', quality: 0.9 }) as Blob;
        processedFile = new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), { type: 'image/jpeg' });
      } catch (err) {
        console.error('HEIC conversion failed:', err);
        toast.error(`Falha ao converter "${file.name}" de HEIC`);
        throw err;
      }
    }

    // Convert other unsupported formats via canvas
    if (!isHeic && CONVERTIBLE_IMAGE_TYPES.includes(file.type)) {
      try {
        const bitmap = await createImageBitmap(file);
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(b => b ? resolve(b) : reject(new Error('Canvas conversion failed')), 'image/jpeg', 0.9);
        });
        processedFile = new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' });
        bitmap.close();
      } catch (err) {
        console.error('Image conversion failed:', err);
        throw err;
      }
    }

    // Compress if too large
    if (processedFile.size > COMPRESSION_MAX_SIZE_MB * 1024 * 1024) {
      try {
        processedFile = await imageCompression(processedFile, {
          maxSizeMB: COMPRESSION_MAX_SIZE_MB,
          maxWidthOrHeight: COMPRESSION_MAX_WIDTH,
          useWebWorker: true,
          initialQuality: 0.8,
        });
      } catch (err) {
        console.error('Compression failed:', err);
        // Still use the unconverted file if compression fails
      }
    }

    return processedFile;
  };

  const handleImageSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalImages = images.length + pendingImages.length;
    const remainingSlots = MAX_IMAGES - totalImages;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${MAX_IMAGES} imagens permitido`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setProcessing('image');

    try {
      const newPending: PendingFile[] = [];

      for (const file of filesToProcess) {
        if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
          toast.error(`"${file.name}" excede ${MAX_IMAGE_SIZE_MB}MB`);
          continue;
        }

        const isImage = file.type.startsWith('image/') ||
          ['heic', 'heif'].includes(file.name.split('.').pop()?.toLowerCase() || '');
        if (!isImage) {
          toast.error(`"${file.name}" não é uma imagem válida`);
          continue;
        }

        try {
          const originalSize = file.size;
          const compressed = await compressImage(file);
          const wasCompressed = compressed !== file || compressed.size < originalSize;
          const preview = URL.createObjectURL(compressed);

          newPending.push({
            file: compressed,
            preview,
            compressed: wasCompressed,
            originalSize,
            finalSize: compressed.size,
            type: 'image',
          });

          if (wasCompressed && compressed.size < originalSize) {
            const saved = Math.round((1 - compressed.size / originalSize) * 100);
            toast.success(`"${file.name}" comprimida (-${saved}%)`);
          }
        } catch {
          toast.error(`Erro ao processar "${file.name}"`);
        }
      }

      if (newPending.length > 0) {
        setPendingImages(prev => [...prev, ...newPending]);
      }
    } finally {
      setProcessing(null);
      if (imageInputRef.current) imageInputRef.current.value = '';
    }
  };

  const handleVideoSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const totalVideos = videos.length + pendingVideos.length;
    const remainingSlots = MAX_VIDEOS - totalVideos;
    if (remainingSlots <= 0) {
      toast.error(`Máximo de ${MAX_VIDEOS} vídeos permitido`);
      return;
    }

    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    setProcessing('video');

    try {
      const newPending: PendingFile[] = [];

      for (const file of filesToProcess) {
        if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
          toast.error(`"${file.name}" excede ${MAX_VIDEO_SIZE_MB}MB`);
          continue;
        }

        if (!file.type.startsWith('video/')) {
          toast.error(`"${file.name}" não é um vídeo válido`);
          continue;
        }

        const preview = URL.createObjectURL(file);
        newPending.push({
          file,
          preview,
          compressed: false,
          originalSize: file.size,
          finalSize: file.size,
          type: 'video',
        });
      }

      if (newPending.length > 0) {
        setPendingVideos(prev => [...prev, ...newPending]);
      }
    } finally {
      setProcessing(null);
      if (videoInputRef.current) videoInputRef.current.value = '';
    }
  };

  const removePendingImage = (index: number) => {
    setPendingImages(prev => {
      const updated = [...prev];
      if (updated[index]) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removePendingVideo = (index: number) => {
    setPendingVideos(prev => {
      const updated = [...prev];
      if (updated[index]) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const removeExistingImage = (index: number) => {
    const newImages = [...images];
    newImages.splice(index, 1);
    onImagesChange(newImages);
  };

  const removeExistingVideo = (index: number) => {
    const newVideos = [...videos];
    newVideos.splice(index, 1);
    onVideosChange(newVideos);
  };

  const uploadFile = async (file: File, type: 'image' | 'video'): Promise<string | null> => {
    const fileExt = file.name.split('.').pop() || (type === 'image' ? 'jpg' : 'mp4');
    const fileName = `${Date.now()}_${Math.random().toString(36).slice(2)}.${fileExt}`;
    const filePath = `products/${type === 'image' ? 'images' : 'videos'}/${fileName}`;

    const { error } = await supabase.storage.from('store_assets').upload(filePath, file);
    if (error) {
      console.error('Upload error:', error);
      return null;
    }

    const { data } = supabase.storage.from('store_assets').getPublicUrl(filePath);
    return data.publicUrl;
  };

  const uploadPendingFiles = useCallback(async (): Promise<{ images: string[]; videos: string[] }> => {
    const uploadedImageUrls: string[] = [];
    const uploadedVideoUrls: string[] = [];

    if (pendingImages.length === 0 && pendingVideos.length === 0) {
      return { images: [], videos: [] };
    }

    setUploading(true);

    try {
      for (const pending of pendingImages) {
        const url = await uploadFile(pending.file, 'image');
        if (url) {
          uploadedImageUrls.push(url);
        } else {
          toast.error(`Erro ao enviar imagem`);
        }
      }

      for (const pending of pendingVideos) {
        const url = await uploadFile(pending.file, 'video');
        if (url) {
          uploadedVideoUrls.push(url);
        } else {
          toast.error(`Erro ao enviar vídeo`);
        }
      }

      // Clear pending after successful upload
      pendingImages.forEach(p => URL.revokeObjectURL(p.preview));
      pendingVideos.forEach(p => URL.revokeObjectURL(p.preview));
      setPendingImages([]);
      setPendingVideos([]);

      return { images: uploadedImageUrls, videos: uploadedVideoUrls };
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao enviar arquivos');
      return { images: uploadedImageUrls, videos: uploadedVideoUrls };
    } finally {
      setUploading(false);
    }
  }, [pendingImages, pendingVideos]);

  useImperativeHandle(ref, () => ({
    uploadPendingFiles,
    hasPendingFiles: () => pendingImages.length > 0 || pendingVideos.length > 0,
  }), [uploadPendingFiles, pendingImages.length, pendingVideos.length]);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  const totalImages = images.length + pendingImages.length;
  const totalVideos = videos.length + pendingVideos.length;

  return (
    <div className="space-y-4">
      {/* Images Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Image className="h-4 w-4" />
            Imagens ({totalImages}/{MAX_IMAGES})
          </Label>
          <span className="text-xs text-muted-foreground">Máx. {MAX_IMAGE_SIZE_MB}MB • Auto-compressão</span>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {/* Existing uploaded images */}
          {images.map((url, index) => (
            <div key={`existing-${index}`} className="relative aspect-square rounded-lg overflow-hidden border bg-muted">
              <img src={url} alt={`Imagem ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                onClick={() => removeExistingImage(index)}
                disabled={disabled || uploading}
              >
                <X className="h-3 w-3" />
              </Button>
              {index === 0 && images.length > 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  Principal
                </span>
              )}
            </div>
          ))}

          {/* Pending images (not uploaded yet) */}
          {pendingImages.map((pending, index) => (
            <div key={`pending-${index}`} className="relative aspect-square rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-muted">
              <img src={pending.preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                onClick={() => removePendingImage(index)}
                disabled={disabled || uploading}
              >
                <X className="h-3 w-3" />
              </Button>
              {images.length === 0 && index === 0 && (
                <span className="absolute bottom-1 left-1 text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded">
                  Principal
                </span>
              )}
              <div className="absolute bottom-1 right-1 flex gap-1">
                {pending.compressed && (
                  <span className="text-[9px] bg-green-600 text-white px-1 py-0.5 rounded">
                    {formatSize(pending.finalSize)}
                  </span>
                )}
                <span className="text-[9px] bg-amber-600 text-white px-1 py-0.5 rounded">
                  Pendente
                </span>
              </div>
            </div>
          ))}

          {/* Add button */}
          {totalImages < MAX_IMAGES && (
            <label
              className={cn(
                "aspect-square rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={imageInputRef}
                type="file"
                accept="image/*,.heic,.heif"
                multiple
                className="hidden"
                onChange={handleImageSelect}
                disabled={disabled || processing === 'image' || uploading}
              />
              {processing === 'image' ? (
                <div className="flex flex-col items-center gap-1">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-[9px] text-muted-foreground">Comprimindo...</span>
                </div>
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Adicionar</span>
                </>
              )}
            </label>
          )}
        </div>

        {pendingImages.length > 0 && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pendingImages.length} imagem(ns) pendente(s) — serão enviadas ao salvar
          </p>
        )}
      </div>

      {/* Videos Section */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            Vídeos ({totalVideos}/{MAX_VIDEOS})
          </Label>
          <span className="text-xs text-muted-foreground">Máx. {MAX_VIDEO_SIZE_MB}MB por vídeo</span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {/* Existing videos */}
          {videos.map((url, index) => (
            <div key={`existing-v-${index}`} className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
              <video src={url} className="w-full h-full object-cover" controls playsInline preload="metadata" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                onClick={() => removeExistingVideo(index)}
                disabled={disabled || uploading}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}

          {/* Pending videos */}
          {pendingVideos.map((pending, index) => (
            <div key={`pending-v-${index}`} className="relative aspect-video rounded-lg overflow-hidden border-2 border-dashed border-primary/40 bg-muted">
              <video src={pending.preview} className="w-full h-full object-cover" controls playsInline preload="metadata" />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-1 right-1 h-6 w-6 rounded-full"
                onClick={() => removePendingVideo(index)}
                disabled={disabled || uploading}
              >
                <X className="h-3 w-3" />
              </Button>
              <span className="absolute bottom-1 right-1 text-[9px] bg-amber-600 text-white px-1 py-0.5 rounded">
                Pendente • {formatSize(pending.finalSize)}
              </span>
            </div>
          ))}

          {/* Add video button */}
          {totalVideos < MAX_VIDEOS && (
            <label
              className={cn(
                "aspect-video rounded-lg border-2 border-dashed flex flex-col items-center justify-center gap-1 cursor-pointer hover:bg-muted/50 transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                multiple
                className="hidden"
                onChange={handleVideoSelect}
                disabled={disabled || processing === 'video' || uploading}
              />
              {processing === 'video' ? (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              ) : (
                <>
                  <Upload className="h-5 w-5 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground">Adicionar vídeo</span>
                </>
              )}
            </label>
          )}
        </div>

        {pendingVideos.length > 0 && (
          <p className="text-[11px] text-amber-600 flex items-center gap-1">
            <AlertTriangle className="h-3 w-3" />
            {pendingVideos.length} vídeo(s) pendente(s) — serão enviados ao salvar
          </p>
        )}
      </div>

      {uploading && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Enviando arquivos...
        </div>
      )}
    </div>
  );
});

ProductMediaUpload.displayName = 'ProductMediaUpload';
