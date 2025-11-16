import React from 'react';
import { X, FileImage, Loader2 } from 'lucide-react';
import { ImagePreviewProps } from '../../types/imageUpload';
export function ImagePreview({
  file,
  preview,
  index,
  onRemove,
  uploading = false
}: ImagePreviewProps) {
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const isHeicOrHeif = file.type === 'image/heic' || file.type === 'image/heif';
  return <div className="relative group">
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-gray-200">
        {/* Preview da imagem ou ícone para HEIC/HEIF */}
        {isHeicOrHeif ? <div className="w-full h-full flex flex-col items-center justify-center bg-gray-50">
            <FileImage className="h-8 w-8 text-gray-400 mb-2" />
            <span className="text-xs text-gray-500 font-medium">
              {file.type.split('/')[1].toUpperCase()}
            </span>
          </div> : <img src={preview} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" loading="lazy" />}

        {/* Overlay de carregamento */}
        {uploading && <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="text-center text-white">
              <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
              <span className="text-xs">Enviando...</span>
            </div>
          </div>}

        {/* Botão de remover */}
        {!uploading && <button onClick={() => onRemove(index)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 flex items-center justify-center" title="Remover imagem">
            <X className="h-4 w-4" />
          </button>}

        {/* Badge de ordem */}
        <div className="absolute top-2 left-2 bg-blue-500 text-white text-xs px-2 py-1 rounded">
          {index + 1}
        </div>
      </div>

      {/* Informações do arquivo */}
      <div className="mt-2 text-center">
        <p title={file.name} className="text-xs font-medium truncate text-gray-50">
          {file.name}
        </p>
        <p className="text-xs text-gray-500">
          {formatFileSize(file.size)}
        </p>
        {isHeicOrHeif && <p className="text-xs text-blue-600 mt-1">
            Será convertido para JPEG
          </p>}
      </div>
    </div>;
}