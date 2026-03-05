import { useState, useCallback, useEffect } from 'react';
import {
  ImageUploadState,
  ImageUploadHookReturn,
  ImageUploadResult,
  IMAGE_UPLOAD_CONFIG,
} from '../types/imageUpload';
import { RadicalImageProcessingService } from '../services/radicalImageProcessingService';
import { SupabaseStorageService } from '../services/supabaseStorageService';
import { useAuth } from './useAuth';

const initialState: ImageUploadState = {
  files: [],
  previews: [],
  uploading: false,
  progress: 0,
  error: null,
  uploadedImages: [],
};

const MAX_FILES = IMAGE_UPLOAD_CONFIG.MAX_FILES;

export function useImageUpload(serviceOrderId?: string): ImageUploadHookReturn {
  const [state, setState] = useState<ImageUploadState>(initialState);
  const { user } = useAuth();

  // Debug: Log do serviceOrderId recebido
  console.log('🔍 useImageUpload - serviceOrderId recebido:', serviceOrderId);

  // Carregar imagens existentes quando serviceOrderId for fornecido
  useEffect(() => {
    console.log('🔍 useImageUpload - useEffect executado com serviceOrderId:', serviceOrderId);
    if (serviceOrderId) {
      console.log('🔍 useImageUpload - Chamando loadExistingImages para:', serviceOrderId);
      loadExistingImages();
    }
  }, [serviceOrderId]);

  // Limpar URLs de preview quando o componente for desmontado
  useEffect(() => {
    return () => {
      state.previews.forEach(url => {
        RadicalImageProcessingService.revokePreviewUrl(url);
      });
    };
  }, []);

  const loadExistingImages = useCallback(async () => {
    if (!serviceOrderId) return;

    try {
      console.log('🔍 loadExistingImages - Buscando imagens para:', serviceOrderId);
      const images = await SupabaseStorageService.getServiceOrderImages(serviceOrderId);
      
      console.log('🔍 loadExistingImages - Imagens retornadas:', {
        count: images?.length || 0,
        images: images
      });
      
      if (images && Array.isArray(images)) {
        console.log('🔍 loadExistingImages - Atualizando estado com', images.length, 'imagens');
        setState(prev => ({
          ...prev,
          uploadedImages: images,
          error: null
        }));
      } else {
        console.log('⚠️ loadExistingImages - Nenhuma imagem retornada ou formato inválido');
      }
    } catch (error) {
      console.error('❌ loadExistingImages - Erro ao carregar imagens:', error);
      setState(prev => ({
        ...prev,
        error: 'Erro ao carregar imagens existentes'
      }));
    }
  }, [serviceOrderId]);

  const addFiles = useCallback(async (files: File[] | FileList): Promise<void> => {
    const newFiles: File[] = Array.isArray(files) ? files : Array.from(files);
    console.log('📁 UPLOAD: Iniciando addFiles com', newFiles.length, 'arquivos');

    // 🔥 INTERCEPTADOR DEFINITIVO - FORÇA MIME TYPE CORRETO IMEDIATAMENTE
    const forcedJpegFiles = newFiles.map((file, index) => {
      console.log(`🔥 INTERCEPTADOR DEFINITIVO ${index + 1}: Forçando MIME type para image/jpeg:`, {
        originalName: file.name,
        originalType: file.type,
        originalSize: file.size,
        isApplicationJson: file.type === 'application/json'
      });

      // 🚨 REJEIÇÃO IMEDIATA DE application/json
      if (file.type === 'application/json') {
        console.error('🚨 INTERCEPTADOR: REJEITANDO application/json IMEDIATAMENTE!');
        setState(prev => ({
          ...prev,
          error: 'INTERCEPTADOR DEFINITIVO: application/json não é permitido'
        }));
        throw new Error('INTERCEPTADOR DEFINITIVO: application/json não é permitido');
      }

      // 🔥 FORÇA CRIAÇÃO DE NOVO FILE COM MIME TYPE CORRETO
      const forcedFile = new File([file], file.name, {
        type: 'image/jpeg', // SEMPRE image/jpeg
        lastModified: file.lastModified || Date.now()
      });

      console.log(`✅ INTERCEPTADOR DEFINITIVO ${index + 1}: Arquivo forçado para image/jpeg:`, {
        newName: forcedFile.name,
        newType: forcedFile.type,
        newSize: forcedFile.size,
        isNowJpeg: forcedFile.type === 'image/jpeg',
        isNotJson: forcedFile.type !== 'application/json'
      });

      return forcedFile;
    });

    console.log('🔥 INTERCEPTADOR DEFINITIVO: Todos os arquivos forçados para image/jpeg');

    // Verifica se adicionar os novos arquivos excederia o limite
    if (state.files.length + forcedJpegFiles.length > MAX_FILES) {
      const availableSlots = MAX_FILES - state.files.length;
      setState(prev => ({
        ...prev,
        error: `Máximo de ${MAX_FILES} imagens permitidas. Você pode adicionar apenas ${availableSlots} imagem(ns) a mais.`
      }));
      return;
    }

    const validFiles: File[] = [];
    const errors: string[] = [];

    // 🛡️ VALIDAÇÃO TRIPLA - PONTO 1
    forcedJpegFiles.forEach((file, index) => {
      console.log(`🛡️ VALIDAÇÃO TRIPLA PONTO 1 - Arquivo ${index + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });

      // 🚨 VERIFICAÇÃO TRIPLA CONTRA application/json
      if (file.type === 'application/json') {
        console.error(`🚨 VALIDAÇÃO TRIPLA PONTO 1: application/json detectado no arquivo ${index + 1}!`);
        errors.push(`Arquivo ${file.name}: MIME type application/json não é suportado`);
        return;
      }

      if (file.type !== 'image/jpeg') {
        console.error(`🚨 VALIDAÇÃO TRIPLA PONTO 1: Arquivo ${index + 1} não é image/jpeg:`, file.type);
        errors.push(`Arquivo ${file.name}: deve ser image/jpeg, recebido ${file.type}`);
        return;
      }

      // Validação usando o serviço
      const validation = RadicalImageProcessingService.validateImageFile(file);
      
      if (validation.valid) {
        console.log(`✅ VALIDAÇÃO TRIPLA PONTO 1: Arquivo ${index + 1} APROVADO`);
        validFiles.push(file);
      } else {
        console.error(`❌ VALIDAÇÃO TRIPLA PONTO 1: Arquivo ${index + 1} rejeitado:`, validation.error);
        errors.push(`${file.name}: ${validation.error}`);
      }
    });

    if (errors.length > 0) {
      setState(prev => ({
        ...prev,
        error: errors.join('; ')
      }));
      return;
    }

    // Criar previews para os arquivos válidos
    const newPreviews = validFiles.map(file => {
      console.log('🔍 Criando preview para:', {
        name: file.name,
        type: file.type
      });
      return RadicalImageProcessingService.createPreviewUrl(file);
    });

    setState(prev => ({
      ...prev,
      files: [...prev.files, ...validFiles],
      previews: [...prev.previews, ...newPreviews],
      error: null,
    }));
    
    console.log('🔍 Estado atualizado com novos arquivos');
  }, [state.files.length]);

  const removeFile = useCallback((index: number) => {
    setState(prev => {
      // Revogar URL do preview
      if (prev.previews[index]) {
        RadicalImageProcessingService.revokePreviewUrl(prev.previews[index]);
      }

      return {
        ...prev,
        files: prev.files.filter((_, i) => i !== index),
        previews: prev.previews.filter((_, i) => i !== index),
        error: null,
      };
    });
  }, []);

  const uploadImages = useCallback(async (orderId: string): Promise<ImageUploadResult[]> => {
    if (state.files.length === 0) {
      return [];
    }

    console.log('🔍 useImageUpload.uploadImages - Iniciando upload de', state.files.length, 'arquivos');
    console.log('🔍 useImageUpload.uploadImages - Arquivos a serem enviados:', state.files.map(f => ({
      name: f.name,
      type: f.type,
      size: f.size
    })));

    // 🛡️ VALIDAÇÃO TRIPLA - PONTO 2 (ANTES DO UPLOAD)
    console.log('🛡️ VALIDAÇÃO TRIPLA PONTO 2: Verificando arquivos antes do upload...');
    for (let i = 0; i < state.files.length; i++) {
      const file = state.files[i]!;
      console.log(`🛡️ VALIDAÇÃO TRIPLA PONTO 2 - Arquivo ${i + 1}:`, {
        name: file.name,
        type: file.type,
        size: file.size
      });

      if (file.type === 'application/json') {
        console.error(`🚨 VALIDAÇÃO TRIPLA PONTO 2: application/json detectado no arquivo ${i + 1}!`);
        setState(prev => ({
          ...prev,
          error: `ERRO CRÍTICO: Arquivo ${file.name} ainda é application/json antes do upload!`
        }));
        throw new Error(`VALIDAÇÃO TRIPLA PONTO 2: application/json detectado em ${file.name}`);
      }

      if (file.type !== 'image/jpeg') {
        console.error(`🚨 VALIDAÇÃO TRIPLA PONTO 2: Arquivo ${i + 1} não é image/jpeg:`, file.type);
        setState(prev => ({
          ...prev,
          error: `ERRO: Arquivo ${file.name} deve ser image/jpeg, mas é ${file.type}`
        }));
        throw new Error(`VALIDAÇÃO TRIPLA PONTO 2: Arquivo ${file.name} não é image/jpeg`);
      }
    }
    console.log('✅ VALIDAÇÃO TRIPLA PONTO 2: Todos os arquivos aprovados para upload');

    setState(prev => ({
      ...prev,
      uploading: true,
      progress: 0,
      error: null,
    }));

    try {
      const results: ImageUploadResult[] = [];

      // Calcular ordem de upload baseada nas imagens já existentes
      const startOrder = state.uploadedImages.length + 1;

      for (let i = 0; i < state.files.length; i++) {
        try {
          const file = state.files[i]!;
          console.log(`🔍 useImageUpload.uploadImages - Enviando arquivo ${i + 1}/${state.files.length}:`, {
            name: file.name,
            type: file.type,
            size: file.size,
            order: startOrder + i
          });

          const image = await SupabaseStorageService.uploadImage({
            file,
            serviceOrderId: orderId,
            uploadOrder: startOrder + i,
            userId: user?.id || '',
          });

          console.log(`🔍 useImageUpload.uploadImages - Upload ${i + 1} bem-sucedido:`, image);

          results.push({
            success: true,
            image,
          });

          // Atualizar progresso
          setState(prev => ({
            ...prev,
            progress: ((i + 1) / state.files.length) * 100,
          }));
        } catch (error) {
          console.error(`🔍 useImageUpload.uploadImages - Erro no upload ${i + 1}:`, error);

          results.push({
            success: false,
            error: error instanceof Error ? error.message : 'Erro desconhecido',
          });
        }
      }

      // Atualizar estado com imagens enviadas com sucesso
      const successfulImages = results
        .filter(result => result.success && result.image)
        .map(result => result.image!);

      console.log('🔍 useImageUpload.uploadImages - Imagens enviadas com sucesso:', successfulImages.length);

      setState(prev => ({
        ...prev,
        uploadedImages: [...prev.uploadedImages, ...successfulImages],
        files: [],
        previews: [],
        uploading: false,
        progress: 100,
      }));

      // Limpar previews
      state.previews.forEach(url => {
        RadicalImageProcessingService.revokePreviewUrl(url);
      });

      return results;
    } catch (error) {
      setState(prev => ({
        ...prev,
        uploading: false,
        progress: 0,
        error: error instanceof Error ? error.message : 'Erro no upload',
      }));
      throw error;
    }
  }, [state.files, state.uploadedImages.length, state.previews, user?.id]);

  const deleteImage = useCallback(async (imageId: string): Promise<boolean> => {
    try {
      const success = await SupabaseStorageService.deleteImage(imageId);
      
      if (success) {
        setState(prev => ({
          ...prev,
          uploadedImages: prev.uploadedImages.filter(img => img.id !== imageId),
          error: null,
        }));
      }

      return success;
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Erro ao deletar imagem',
      }));
      return false;
    }
  }, []);

  const clearAll = useCallback(() => {
    // Limpar previews
    state.previews.forEach(url => {
      RadicalImageProcessingService.revokePreviewUrl(url);
    });

    setState(initialState);
  }, [state.previews]);

  return {
    state,
    addFiles,
    removeFile,
    uploadImages,
    clearAll,
    deleteImage,
  };
}