import { useEffect } from 'react';
import { AlertCircle, CheckCircle, Upload, Trash2 } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import { ImageDropZone } from './ImageDropZone';
import { ImagePreview } from './ImagePreview';
import { ImageUploadSectionProps, IMAGE_UPLOAD_CONFIG } from '../../types/imageUpload';
import heic2any from 'heic2any';

export function ImageUploadSection({
  serviceOrderId,
  onImagesChange,
  onPendingFilesChange,
  disabled = false,
  className = ''
}: ImageUploadSectionProps) {
  console.log('🔍 ImageUploadSection - Renderizando com serviceOrderId:', serviceOrderId);
  const {
    state,
    addFiles,
    removeFile,
    uploadImages,
    clearAll,
    deleteImage
  } = useImageUpload(serviceOrderId);
  console.log('🔍 ImageUploadSection - Estado atual:', {
    uploadedImages: state.uploadedImages,
    uploadedImagesLength: state.uploadedImages?.length,
    files: state.files,
    filesLength: state.files?.length,
    uploading: state.uploading,
    error: state.error
  });

  // Notificar mudanças nas imagens para o componente pai
  useEffect(() => {
    if (onImagesChange) {
      onImagesChange(state.uploadedImages || []);
    }
  }, [state.uploadedImages, onImagesChange]);

  // Notificar quando há arquivos pendentes de upload
  useEffect(() => {
    if (onPendingFilesChange) {
      onPendingFilesChange(state.files.length > 0);
    }
  }, [state.files.length, onPendingFilesChange]);
  const handleUpload = async () => {
    if (!serviceOrderId || state.files.length === 0) return;
    try {
      await uploadImages(serviceOrderId);
    } catch (error) {
      console.error('Erro no upload:', error);
    }
  };
  const handleDeleteUploadedImage = async (imageId: string) => {
    if (window.confirm('Tem certeza que deseja remover esta imagem?')) {
      await deleteImage(imageId);
    }
  };
  const totalImages = state.files.length + state.uploadedImages.length;
  const canUpload = state.files.length > 0 && !state.uploading && serviceOrderId;
  return <div className={`space-y-4 ${className}`}>
      {/* Cabeçalho da seção */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-slate-50">
            Imagens do Equipamento
          </h3>
          <p className="text-sm text-slate-50">
            Adicione até {IMAGE_UPLOAD_CONFIG.MAX_FILES} fotos do equipamento
          </p>
        </div>
        
        {state.files.length > 0 && <div className="flex space-x-2">
            <button onClick={clearAll} disabled={state.uploading} className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800 disabled:opacity-50">
              Limpar
            </button>
          </div>}
      </div>

      {/* Mensagens de erro */}
      {state.error && <div className="flex items-center space-x-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <span className="text-sm text-red-700">{state.error}</span>
        </div>}

      {/* Barra de progresso durante upload */}
      {state.uploading && <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Enviando imagens...</span>
            <span className="text-gray-600">{Math.round(state.progress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full transition-all duration-300" style={{
          width: `${state.progress}%`
        }} />
          </div>
        </div>}

      {/* Zona de drop para novos arquivos */}
      <ImageDropZone onFilesAdded={addFiles} maxFiles={IMAGE_UPLOAD_CONFIG.MAX_FILES} currentFileCount={totalImages} disabled={disabled || state.uploading} />

      {/* Preview das imagens selecionadas (ainda não enviadas) */}
      {state.files.length > 0 && <div className="space-y-3">
          <h4 className="text-sm font-medium text-slate-50">
            Imagens Selecionadas ({state.files.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {state.files.map((file, index) => <ImagePreview key={`${file.name}-${index}`} file={file} preview={state.previews[index] || ''} index={index} onRemove={removeFile} uploading={state.uploading} />)}
          </div>
          

        </div>}

      {/* Imagens já enviadas */}
      {state.uploadedImages.length > 0 && <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <h4 className="text-sm font-medium text-slate-50">
              Imagens Enviadas ({state.uploadedImages.length})
            </h4>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {state.uploadedImages.map(image => <div key={image.id} className="relative group">
                <div className="aspect-square rounded-lg overflow-hidden bg-gray-100 border-2 border-green-200">
                  <img
                    src={image.uploadthing_url || image.storage_path || ''}
                    alt={image.file_name || 'Imagem da ordem de serviço'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    onError={async e => {
                      const imageUrl = image.uploadthing_url || image.storage_path || '';
                      console.error('Erro ao carregar imagem:', imageUrl);
                      
                      const target = e.target as HTMLImageElement;

                      // Tentar converter HEIC se a URL terminar com .heic
                      if (imageUrl.toLowerCase().endsWith('.heic') || imageUrl.toLowerCase().endsWith('.heif')) {
                        try {
                          console.log('🔄 Tentando converter HEIC para exibição:', imageUrl);
                          const response = await fetch(imageUrl);
                          const blob = await response.blob();
                          const convertedBlob = await heic2any({
                            blob,
                            toType: 'image/jpeg',
                            quality: 0.7
                          });
                          const displayBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
                          if (!displayBlob) throw new Error('Falha na conversão do HEIC');
                          const objectUrl = URL.createObjectURL(displayBlob);
                          target.src = objectUrl;
                          return; // Sucesso na conversão
                        } catch (convError) {
                          console.error('❌ Falha na conversão on-the-fly do HEIC:', convError);
                        }
                      }

                      // Substituir por um SVG placeholder quando há erro
                      const svgPlaceholder = `data:image/svg+xml;base64,${btoa(`
                        <svg width="200" height="200" xmlns="http://www.w3.org/2000/svg">
                          <rect width="200" height="200" fill="#f3f4f6"/>
                          <rect x="50" y="50" width="100" height="100" fill="#d1d5db" rx="8"/>
                          <circle cx="75" cy="75" r="8" fill="#9ca3af"/>
                          <polygon points="85,95 115,95 100,75" fill="#9ca3af"/>
                          <text x="100" y="130" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="12">Imagem</text>
                          <text x="100" y="145" text-anchor="middle" fill="#6b7280" font-family="Arial" font-size="12">não encontrada</text>
                        </svg>
                      `)}`;
                      target.src = svgPlaceholder;
                    }}
                  />

                  {/* Botão de remover */}
                  <button onClick={() => handleDeleteUploadedImage(image.id)} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-red-600 flex items-center justify-center" title="Remover imagem">
                    <Trash2 className="h-4 w-4" />
                  </button>

                  {/* Badge de ordem */}
                  <div className="absolute top-2 left-2 bg-green-500 text-white text-xs px-2 py-1 rounded">
                    {image.upload_order}
                  </div>
                </div>

                {/* Informações do arquivo */}
                <div className="mt-2 text-center">
                  <p title={image.file_name} className="text-xs font-medium truncate text-slate-50">
                    {image.file_name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {image.file_size ? (image.file_size / 1024 / 1024).toFixed(2) + ' MB' : 'Tamanho desconhecido'}
                  </p>
                </div>
              </div>)}
          </div>
        </div>}

      {/* Botão de enviar imagens após todas as seções */}
      {state.files.length > 0 && canUpload && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-end gap-3 pt-4">
          <p className="text-sm text-slate-400">
            Envie imagens para atualizar a ordem
          </p>
          <button 
            onClick={handleUpload} 
            disabled={state.uploading} 
            className="px-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2 whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            <span>Enviar</span>
          </button>
        </div>
      )}

      {/* Informações de ajuda */}
      {totalImages === 0 && <div className="text-center py-8 text-gray-500">
          <Upload className="mx-auto h-12 w-12 text-gray-300 mb-4" />
          <p className="text-sm">
            Nenhuma imagem adicionada ainda.
          </p>
          <p className="text-xs mt-1">
            Adicione fotos do equipamento para documentar seu estado.
          </p>
        </div>}
    </div>;
}