import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import imageCompression from 'browser-image-compression';

interface PhotoEntryManagerProps {
  orderId?: string;
  onPhotosComplete: (photos: File[]) => void;
  minPhotos?: number;
}

interface PhotoItem {
  id: string;
  file: File;
  preview: string;
  type: 'front' | 'back' | 'side' | 'other';
}

export const PhotoEntryManager: React.FC<PhotoEntryManagerProps> = ({
  orderId,
  onPhotosComplete,
  minPhotos = 3,
}) => {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setIsCompressing(true);

      try {
        const processedPhotos = await Promise.all(
          newFiles.map(async (file) => {
            const options = {
              maxSizeMB: 1,
              maxWidthOrHeight: 1920,
              useWebWorker: true,
            };
            
            let compressed = file;
            try {
              compressed = await imageCompression(file, options);
            } catch (err) {
              console.warn("Compression failed, using original", err);
            }
            
            return {
              id: Math.random().toString(36).substr(2, 9),
              file: compressed,
              preview: URL.createObjectURL(compressed),
              type: 'other' as const,
            };
          })
        );

        setPhotos((prev) => [...prev, ...processedPhotos]);
        toast.success(`${newFiles.length} foto(s) adicionada(s)`);
      } catch (error) {
        console.error('Error processing photos:', error);
        toast.error('Erro ao processar fotos');
      } finally {
        setIsCompressing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const removePhoto = (id: string) => {
    setPhotos((prev) => prev.filter((p) => p.id !== id));
  };

  const handleComplete = () => {
    if (photos.length < minPhotos) {
      toast.error(`Mínimo de ${minPhotos} fotos obrigatório.`);
      return;
    }
    onPhotosComplete(photos.map(p => p.file));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Fotos de Entrada
          <span className={cn(
            "text-xs px-2 py-0.5 rounded-full border",
            photos.length >= minPhotos 
              ? "bg-green-100 text-green-700 border-green-200"
              : "bg-amber-100 text-amber-700 border-amber-200"
          )}>
            {photos.length}/{minPhotos} Obrigatórias
          </span>
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {photos.map((photo) => (
          <Card key={photo.id} className="relative group overflow-hidden aspect-square border-2 border-dashed">
            <img 
              src={photo.preview} 
              alt="Preview" 
              className="w-full h-full object-cover"
            />
            <button
              onClick={() => removePhoto(photo.id)}
              className="absolute top-1 right-1 bg-black/50 hover:bg-red-500 text-white p-1 rounded-full transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="absolute bottom-0 inset-x-0 bg-black/60 text-white text-xs p-1 text-center truncate">
              {photo.type}
            </div>
          </Card>
        ))}

        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex flex-col items-center justify-center aspect-square border-2 border-dashed rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
        >
          <Camera className="h-8 w-8 text-muted-foreground mb-2" />
          <span className="text-sm text-muted-foreground">Adicionar Foto</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
            // capture="environment" // Good for mobile, but creates issues on desktop if not careful
          />
        </button>
      </div>

      <div className="flex justify-end pt-4">
        <Button 
          onClick={handleComplete} 
          disabled={photos.length < minPhotos || isCompressing}
          className={cn(photos.length >= minPhotos ? "bg-green-600 hover:bg-green-700" : "")}
        >
          {isCompressing ? (
            "Processando..."
          ) : (
            <>
              {photos.length >= minPhotos ? <Check className="mr-2 h-4 w-4" /> : <AlertCircle className="mr-2 h-4 w-4" />}
              Confirmar Fotos ({photos.length})
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
