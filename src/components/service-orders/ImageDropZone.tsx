import React, { useCallback, useState } from 'react';
import { Upload, Image, AlertCircle, Camera } from 'lucide-react';
import { ImageDropZoneProps, IMAGE_UPLOAD_CONFIG } from '../../types/imageUpload';
import { useIsMobile } from '../../hooks/use-mobile';
export function ImageDropZone({
  onFilesAdded,
  maxFiles,
  currentFileCount,
  disabled = false,
  className = ''
}: ImageDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragCounter, setDragCounter] = useState(0);
  const isMobile = useIsMobile();
  const remainingSlots = maxFiles - currentFileCount;
  const canAddFiles = remainingSlots > 0 && !disabled;
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => prev + 1);
    if (canAddFiles) {
      setIsDragOver(true);
    }
  }, [canAddFiles]);
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragCounter(prev => {
      const newCounter = prev - 1;
      if (newCounter === 0) {
        setIsDragOver(false);
      }
      return newCounter;
    });
  }, []);
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    setDragCounter(0);
    if (!canAddFiles) return;
    const files = Array.from(e.dataTransfer.files);
    const imageFiles = files.filter(file => IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.includes(file.type as any));
    if (imageFiles.length > 0) {
      onFilesAdded(imageFiles);
    }
  }, [canAddFiles, onFilesAdded]);
  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAddFiles || !e.target.files) return;
    const files = Array.from(e.target.files);
    onFilesAdded(files);

    // Limpar o input para permitir selecionar o mesmo arquivo novamente
    e.target.value = '';
  }, [canAddFiles, onFilesAdded]);

  const handleCameraInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAddFiles || !e.target.files) return;
    const files = Array.from(e.target.files);
    onFilesAdded(files);
    e.target.value = '';
  }, [canAddFiles, onFilesAdded]);

  const handleGalleryInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canAddFiles || !e.target.files) return;
    const files = Array.from(e.target.files);
    onFilesAdded(files);
    e.target.value = '';
  }, [canAddFiles, onFilesAdded]);
  const getDropZoneContent = () => {
    if (!canAddFiles) {
      return <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            {disabled ? 'Upload desabilitado' : `Máximo de ${maxFiles} imagens atingido`}
          </p>
        </div>;
    }
    return <div className="text-center">
        <Upload className="mx-auto h-12 w-12 text-gray-400" />
        <p className="mt-2 text-sm font-medium text-slate-50">
          Arraste imagens aqui ou clique para selecionar
        </p>
        <p className="mt-1 text-xs text-gray-500">
          {remainingSlots} de {maxFiles} slots disponíveis
        </p>
        <p className="mt-1 text-xs text-gray-400">
          Formatos: JPEG, PNG, HEIC/HEIF • Máx: {IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB}MB
        </p>
      </div>;
  };
  return <div className={`relative ${className}`}>
      <div className={`
          border-2 border-dashed rounded-lg p-6 transition-all duration-200
          ${isDragOver && canAddFiles ? 'border-blue-400 bg-blue-50' : canAddFiles ? 'border-gray-300 hover:border-gray-400' : 'border-gray-200 bg-gray-50'}
          ${canAddFiles ? 'cursor-pointer' : 'cursor-not-allowed'}
        `} onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop} onClick={() => {
      if (canAddFiles) {
        document.getElementById('image-file-input')?.click();
      }
    }}>
        {getDropZoneContent()}
      </div>

      <input id="image-file-input" type="file" multiple accept={IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.join(',')} onChange={handleFileInput} disabled={!canAddFiles} className="hidden" />
      
      {/* Inputs específicos para dispositivos móveis */}
      <input id="camera-input" type="file" accept="image/*" capture="environment" onChange={handleCameraInput} disabled={!canAddFiles} className="hidden" />
      <input id="gallery-input" type="file" multiple accept={IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.join(',')} onChange={handleGalleryInput} disabled={!canAddFiles} className="hidden" />

      {/* Indicador de progresso de slots */}
      <div className="mt-2 flex space-x-1">
        {Array.from({
        length: maxFiles
      }).map((_, index) => <div key={index} className={`h-1 flex-1 rounded ${index < currentFileCount ? 'bg-green-500' : index < currentFileCount + (isDragOver ? 1 : 0) ? 'bg-blue-400' : 'bg-gray-200'}`} />)}
      </div>

      {/* Botões específicos para dispositivos móveis */}
      {isMobile && canAddFiles && (
        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('camera-input')?.click();
            }}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors duration-200"
          >
            <Camera className="h-5 w-5" />
            <span>Tirar Foto</span>
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              document.getElementById('gallery-input')?.click();
            }}
            className="flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors duration-200"
          >
            <Image className="h-5 w-5" />
            <span>Galeria</span>
          </button>
        </div>
      )}
    </div>;
}