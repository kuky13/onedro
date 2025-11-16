# Guia de Implementação - Sistema de Upload de Imagens

## 1. Instalação de Dependências

```bash
# Instalar bibliotecas necessárias
npm install heic2any browser-image-compression

# Verificar se as dependências do Supabase já estão instaladas
npm list @supabase/supabase-js
```

## 2. Estrutura de Arquivos

```
src/
├── components/
│   └── service-orders/
│       ├── ImageUploadSection.tsx          # Componente principal de upload
│       ├── ImagePreview.tsx                # Preview das imagens
│       ├── ImageProcessingProgress.tsx     # Barra de progresso
│       └── ImageDropZone.tsx               # Área de drag & drop
├── hooks/
│   ├── useImageUpload.ts                   # Hook para gerenciar upload
│   ├── useImageProcessing.ts               # Hook para processamento
│   └── useServiceOrderImages.ts            # Hook para CRUD de imagens
├── services/
│   ├── imageProcessingService.ts           # Serviço de processamento
│   └── supabaseStorageService.ts           # Serviço de storage
└── types/
    └── imageUpload.ts                      # Tipos TypeScript
```

## 3. Implementação dos Tipos TypeScript

**src/types/imageUpload.ts**

```typescript
export interface ImageFile {
  id: string;
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'completed' | 'error';
  progress: number;
  processedFile?: File;
  error?: string;
}

export interface ServiceOrderImage {
  id: string;
  service_order_id: string;
  image_url: string;
  image_name: string;
  file_size: number;
  upload_date: string;
  created_at: string;
}

export interface ImageProcessingOptions {
  maxSizeMB: number;
  maxWidthOrHeight: number;
  useWebWorker: boolean;
  fileType: string;
}

export interface UploadProgress {
  loaded: number;
  total: number;
  percentage: number;
}
```

## 4. Serviço de Processamento de Imagens

**src/services/imageProcessingService.ts**

```typescript
import heic2any from 'heic2any';
import imageCompression from 'browser-image-compression';

export class ImageProcessingService {
  private static readonly MAX_FILE_SIZE_MB = 3;
  private static readonly SUPPORTED_FORMATS = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic', 'image/heif'
  ];

  static async processImage(file: File): Promise<File> {
    // 1. Validar tipo de arquivo
    if (!this.isValidImageType(file)) {
      throw new Error(`Formato não suportado: ${file.type}`);
    }

    let processedFile = file;

    // 2. Converter HEIC/HEIF para JPEG
    if (this.isHeicFormat(file)) {
      processedFile = await this.convertHeicToJpeg(file);
    }

    // 3. Comprimir se necessário
    if (this.needsCompression(processedFile)) {
      processedFile = await this.compressImage(processedFile);
    }

    return processedFile;
  }

  private static isValidImageType(file: File): boolean {
    return this.SUPPORTED_FORMATS.includes(file.type) || 
           file.name.toLowerCase().endsWith('.heic') ||
           file.name.toLowerCase().endsWith('.heif');
  }

  private static isHeicFormat(file: File): boolean {
    return file.type === 'image/heic' || 
           file.type === 'image/heif' ||
           file.name.toLowerCase().endsWith('.heic') ||
           file.name.toLowerCase().endsWith('.heif');
  }

  private static async convertHeicToJpeg(file: File): Promise<File> {
    try {
      const blob = await heic2any({
        blob: file,
        toType: 'image/jpeg',
        quality: 0.9
      }) as Blob;

      const newFileName = file.name.replace(/\.(heic|heif)$/i, '.jpg');
      return new File([blob], newFileName, { type: 'image/jpeg' });
    } catch (error) {
      throw new Error(`Erro ao converter HEIC/HEIF: ${error.message}`);
    }
  }

  private static needsCompression(file: File): boolean {
    return file.size > this.MAX_FILE_SIZE_MB * 1024 * 1024;
  }

  private static async compressImage(file: File): Promise<File> {
    try {
      const options = {
        maxSizeMB: this.MAX_FILE_SIZE_MB,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        fileType: file.type
      };

      return await imageCompression(file, options);
    } catch (error) {
      throw new Error(`Erro ao comprimir imagem: ${error.message}`);
    }
  }

  static generateFileName(userId: string, originalName: string): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    const sanitizedName = originalName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9-_]/g, '-')
      .substring(0, 50);
    
    return `uploads/${userId}/${timestamp}-${sanitizedName}.${extension}`;
  }
}
```

## 5. Serviço de Storage do Supabase

**src/services/supabaseStorageService.ts**

```typescript
import { supabase } from '@/integrations/supabase/client';
import { ImageProcessingService } from './imageProcessingService';

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'imagens';

  static async uploadImage(
    file: File, 
    userId: string,
    onProgress?: (progress: number) => void
  ): Promise<{ url: string; path: string }> {
    try {
      // Processar a imagem
      const processedFile = await ImageProcessingService.processImage(file);
      
      // Gerar nome único
      const fileName = ImageProcessingService.generateFileName(userId, file.name);
      
      // Upload para o Supabase Storage
      const { data, error } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        throw new Error(`Erro no upload: ${error.message}`);
      }

      // Obter URL pública
      const { data: urlData } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      return {
        url: urlData.publicUrl,
        path: fileName
      };
    } catch (error) {
      throw new Error(`Falha no upload: ${error.message}`);
    }
  }

  static async deleteImage(path: string): Promise<void> {
    const { error } = await supabase.storage
      .from(this.BUCKET_NAME)
      .remove([path]);

    if (error) {
      throw new Error(`Erro ao deletar imagem: ${error.message}`);
    }
  }

  static async saveImageReference(imageData: {
    service_order_id: string;
    image_url: string;
    image_name: string;
    file_size: number;
  }): Promise<string> {
    const { data, error } = await supabase
      .from('service_order_images')
      .insert([imageData])
      .select('id')
      .single();

    if (error) {
      throw new Error(`Erro ao salvar referência: ${error.message}`);
    }

    return data.id;
  }

  static async getServiceOrderImages(serviceOrderId: string) {
    const { data, error } = await supabase
      .from('service_order_images')
      .select('*')
      .eq('service_order_id', serviceOrderId)
      .order('upload_date', { ascending: true });

    if (error) {
      throw new Error(`Erro ao buscar imagens: ${error.message}`);
    }

    return data;
  }

  static async deleteImageReference(imageId: string): Promise<void> {
    const { error } = await supabase
      .from('service_order_images')
      .delete()
      .eq('id', imageId);

    if (error) {
      throw new Error(`Erro ao deletar referência: ${error.message}`);
    }
  }
}
```

## 6. Hook de Upload de Imagens

**src/hooks/useImageUpload.ts**

```typescript
import { useState, useCallback } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { SupabaseStorageService } from '@/services/supabaseStorageService';
import { ImageFile } from '@/types/imageUpload';
import { toast } from 'sonner';

export const useImageUpload = (serviceOrderId?: string) => {
  const { user } = useAuth();
  const [images, setImages] = useState<ImageFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const MAX_IMAGES = 3;

  const addImages = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const remainingSlots = MAX_IMAGES - images.length;
    
    if (fileArray.length > remainingSlots) {
      toast.error(`Máximo ${MAX_IMAGES} imagens permitidas`);
      return;
    }

    const newImages: ImageFile[] = fileArray.map(file => ({
      id: crypto.randomUUID(),
      file,
      preview: URL.createObjectURL(file),
      status: 'pending',
      progress: 0
    }));

    setImages(prev => [...prev, ...newImages]);
  }, [images.length]);

  const removeImage = useCallback((imageId: string) => {
    setImages(prev => {
      const image = prev.find(img => img.id === imageId);
      if (image?.preview) {
        URL.revokeObjectURL(image.preview);
      }
      return prev.filter(img => img.id !== imageId);
    });
  }, []);

  const uploadImages = useCallback(async (): Promise<string[]> => {
    if (!user?.id || !serviceOrderId) {
      throw new Error('Usuário ou ordem de serviço não identificados');
    }

    setIsUploading(true);
    const uploadedImageIds: string[] = [];

    try {
      for (const image of images) {
        if (image.status === 'completed') continue;

        // Atualizar status para processando
        setImages(prev => prev.map(img => 
          img.id === image.id 
            ? { ...img, status: 'processing', progress: 0 }
            : img
        ));

        try {
          // Upload da imagem
          const { url, path } = await SupabaseStorageService.uploadImage(
            image.file,
            user.id,
            (progress) => {
              setImages(prev => prev.map(img => 
                img.id === image.id 
                  ? { ...img, progress }
                  : img
              ));
            }
          );

          // Salvar referência no banco
          const imageId = await SupabaseStorageService.saveImageReference({
            service_order_id: serviceOrderId,
            image_url: url,
            image_name: image.file.name,
            file_size: image.file.size
          });

          uploadedImageIds.push(imageId);

          // Atualizar status para concluído
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'completed', progress: 100 }
              : img
          ));

        } catch (error) {
          // Atualizar status para erro
          setImages(prev => prev.map(img => 
            img.id === image.id 
              ? { ...img, status: 'error', error: error.message }
              : img
          ));
          throw error;
        }
      }

      return uploadedImageIds;
    } finally {
      setIsUploading(false);
    }
  }, [images, user?.id, serviceOrderId]);

  const clearImages = useCallback(() => {
    images.forEach(image => {
      if (image.preview) {
        URL.revokeObjectURL(image.preview);
      }
    });
    setImages([]);
  }, [images]);

  return {
    images,
    isUploading,
    canAddMore: images.length < MAX_IMAGES,
    addImages,
    removeImage,
    uploadImages,
    clearImages
  };
};
```

## 7. Componente Principal de Upload

**src/components/service-orders/ImageUploadSection.tsx**

```typescript
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageDropZone } from './ImageDropZone';
import { ImagePreview } from './ImagePreview';
import { useImageUpload } from '@/hooks/useImageUpload';
import { Camera, Upload } from 'lucide-react';

interface ImageUploadSectionProps {
  serviceOrderId?: string;
  onImagesChange?: (imageCount: number) => void;
}

export const ImageUploadSection: React.FC<ImageUploadSectionProps> = ({
  serviceOrderId,
  onImagesChange
}) => {
  const {
    images,
    isUploading,
    canAddMore,
    addImages,
    removeImage,
    uploadImages,
    clearImages
  } = useImageUpload(serviceOrderId);

  React.useEffect(() => {
    onImagesChange?.(images.length);
  }, [images.length, onImagesChange]);

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          Anexar Imagens
          <span className="text-sm font-normal text-muted-foreground">
            ({images.length}/3)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {canAddMore && (
          <ImageDropZone
            onFilesSelected={addImages}
            disabled={isUploading}
          />
        )}
        
        {images.length > 0 && (
          <ImagePreview
            images={images}
            onRemove={removeImage}
            disabled={isUploading}
          />
        )}
      </CardContent>
    </Card>
  );
};
```

## 8. Integração com ServiceOrderFormPage

**Modificações necessárias em src/pages/ServiceOrderFormPage.tsx:**

```typescript
// Adicionar import
import { ImageUploadSection } from '@/components/service-orders/ImageUploadSection';

// Adicionar estado para controlar imagens
const [imageCount, setImageCount] = useState(0);

// Adicionar a seção de upload após os campos existentes
{/* Seção de Upload de Imagens */}
<ImageUploadSection
  serviceOrderId={formData.id} // Será definido após criar a ordem
  onImagesChange={setImageCount}
/>
```

## 9. Comandos de Execução

```bash
# 1. Instalar dependências
npm install heic2any browser-image-compression

# 2. Executar migração do banco
# (Aplicar o SQL do documento de arquitetura)

# 3. Configurar bucket no Supabase
# (Aplicar as políticas de storage)

# 4. Testar a aplicação
npm run dev
```

## 10. Checklist de Implementação

* [ ] Instalar dependências (heic2any, browser-image-compression)

* [ ] Criar tabela service\_order\_images no banco

* [ ] Configurar bucket 'imagens' no Supabase Storage

* [ ] Implementar tipos TypeScript

* [ ] Criar serviço de processamento de imagens

* [ ] Criar serviço de storage do Supabase

* [ ] Implementar hook useImageUpload

* [ ] Criar componentes de UI (ImageDropZone, ImagePreview, etc.)

* [ ] Integrar com ServiceOrderFormPage

* [ ] Testar upload, conversão e compressão

* [ ] Testar responsividade mobile

* [ ] Validar políticas de segurança RLS

* [ ] Documentar para a equipe

## 11. Considerações de Performance

* **Processamento assíncrono**: Usar Web Workers quando possível

* **Lazy loading**: Carregar bibliotecas apenas quando necessário

* **Cache de previews**: Reutilizar URLs de objeto quando possível

* **Compressão progressiva**: Mostrar progresso durante processamento

* **Cleanup de memória**: Revogar URLs de objeto após uso

* **Rate limiting**: Implementar throttling para uploads múltiplos

