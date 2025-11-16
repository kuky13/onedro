import imageCompression from 'browser-image-compression';
import heic2any from 'heic2any';
import { ImageProcessingOptions, IMAGE_UPLOAD_CONFIG } from '../types/imageUpload';

/**
 * Detecta se um arquivo é HEIC/HEIF
 */
function isHeicFile(file: File): boolean {
  const extension = file.name.toLowerCase().split('.').pop();
  return file.type === 'image/heic' || file.type === 'image/heif' || extension === 'heic' || extension === 'heif';
}

/**
 * Converte arquivos HEIC/HEIF para JPEG
 */
async function convertHeicToJpeg(file: File): Promise<File> {
  try {
    const convertedBlob = await heic2any({
      blob: file,
      toType: 'image/jpeg',
      quality: 0.8,
    });

    // heic2any pode retornar um array de blobs ou um único blob
    const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
    
    return new File([blob], file.name.replace(/\.(heic|heif)$/i, '.jpg'), {
      type: 'image/jpeg',
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.error('Erro ao converter HEIC/HEIF:', error);
    throw new Error('Falha na conversão do arquivo HEIC/HEIF');
  }
}

/**
 * Valida se o arquivo é uma imagem suportada
 */
function validateImageFile(file: File): void {
  let isValidType = false;
  
  // Primeiro, verifica o tipo MIME
  if (IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.includes(file.type as any)) {
    isValidType = true;
  } else {
    // Fallback: verifica a extensão do arquivo
    const extension = file.name.toLowerCase().split('.').pop();
    const mimeTypeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };
    const mimeFromExtension = extension ? mimeTypeMap[extension] : null;
    if (mimeFromExtension && IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.includes(mimeFromExtension as any)) {
      isValidType = true;
    }
  }

  if (!isValidType) {
    throw new Error(`Tipo de arquivo não suportado. Aceitos: ${IMAGE_UPLOAD_CONFIG.ACCEPTED_TYPES.join(', ')}`);
  }

  // Verifica o tamanho máximo (10MB)
  if (file.size > IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB * 1024 * 1024) {
    throw new Error(`Arquivo muito grande. Tamanho máximo: ${IMAGE_UPLOAD_CONFIG.MAX_SIZE_MB}MB`);
  }
}

export class ImageProcessingService {
  /**
   * Converte arquivos HEIC/HEIF para JPEG
   */
  static async convertHeicToJpeg(file: File): Promise<File> {
    return convertHeicToJpeg(file);
  }

  /**
   * Comprime uma imagem se ela exceder o tamanho máximo
   */
  static async compressImage(
    file: File,
    options: ImageProcessingOptions = IMAGE_UPLOAD_CONFIG.COMPRESSION_OPTIONS
  ): Promise<File> {
    try {
      console.log('🔍 CompressImage - Arquivo de entrada:', {
        name: file.name,
        type: file.type,
        size: file.size
      });

      console.log('🔍 CompressImage - Opções de compressão:', options);

      // Se o arquivo já está dentro do limite, retorna sem compressão
      if (file.size <= options.maxSizeInMB * 1024 * 1024) {
        console.log('🔍 CompressImage - Arquivo dentro do limite, sem compressão necessária');
        return file;
      }

      // Preservar o tipo MIME original
      const originalMimeType = file.type;
      const originalName = file.name;
      const originalLastModified = file.lastModified;

      console.log('🔍 CompressImage - Iniciando compressão com browser-image-compression...');
      
      // CORREÇÃO CRÍTICA: Configurar opções de compressão sem alterar o tipo MIME
      const compressionOptions = {
        maxSizeInMB: options.maxSizeInMB,
        maxWidthOrHeight: options.maxWidthOrHeight,
        useWebWorker: options.useWebWorker,
        initialQuality: options.initialQuality,
        // REMOVER fileType para evitar conversão forçada
        // fileType: originalMimeType, // Esta linha estava causando o problema
      };

      console.log('🔍 CompressImage - Opções finais de compressão:', compressionOptions);

      const compressedFile = await imageCompression(file, compressionOptions);
      
      console.log('🔍 CompressImage - Arquivo comprimido (antes da correção):', {
        name: compressedFile.name,
        type: compressedFile.type,
        size: compressedFile.size
      });

      // SEMPRE criar um novo File com o tipo MIME original preservado
      const finalFile = new File([compressedFile], originalName, {
        type: originalMimeType, // FORÇAR o tipo original
        lastModified: originalLastModified,
      });

      console.log('🔍 CompressImage - Arquivo final (após correção):', {
        name: finalFile.name,
        type: finalFile.type,
        size: finalFile.size
      });

      // Validação adicional para garantir que o tipo MIME está correto
      if (finalFile.type !== originalMimeType) {
        console.error('🔍 CompressImage - ERRO: Falha ao preservar tipo MIME!', {
          original: originalMimeType,
          final: finalFile.type
        });
        throw new Error(`Falha ao preservar tipo MIME: esperado ${originalMimeType}, obtido ${finalFile.type}`);
      }

      // Verificação final contra application/json
      if (finalFile.type === 'application/json') {
        console.error('🔍 CompressImage - ERRO CRÍTICO: Tipo MIME corrompido para application/json!');
        throw new Error('Tipo MIME foi corrompido para application/json durante a compressão');
      }

      return finalFile;
    } catch (error) {
      console.error('Erro na compressão da imagem:', error);
      throw error;
    }
  }

  /**
   * Detecta se um arquivo é HEIC/HEIF baseado na extensão
   */
  static isHeicOrHeifFile(fileName: string): boolean {
    const extension = fileName.toLowerCase().split('.').pop();
    return extension === 'heic' || extension === 'heif';
  }

  /**
   * Obtém o tipo MIME correto baseado na extensão do arquivo
   */
  static getMimeTypeFromExtension(fileName: string): string | null {
    const extension = fileName.toLowerCase().split('.').pop();
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'heic': 'image/heic',
      'heif': 'image/heif'
    };
    return mimeMap[extension || ''] || null;
  }

  /**
   * Valida se o arquivo é uma imagem suportada
   */
  static validateImageFile(file: File): { valid: boolean; error?: string } {
    try {
      validateImageFile(file);
      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: error instanceof Error ? error.message : 'Erro de validação desconhecido'
      };
    }
  }

  /**
   * Processa um arquivo de imagem completo (conversão + compressão)
   */
  static async processImage(file: File): Promise<File> {
    return processImage(file);
  }

  /**
   * Processa múltiplos arquivos de imagem
   */
  static async processMultipleImages(
    files: File[],
    onProgress?: (processed: number, total: number) => void
  ): Promise<File[]> {
    const processedFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const processedFile = await this.processImage(files[i]);
        processedFiles.push(processedFile);
        
        if (onProgress) {
          onProgress(i + 1, files.length);
        }
      } catch (error) {
        console.error(`Erro ao processar arquivo ${files[i].name}:`, error);
        throw error;
      }
    }

    return processedFiles;
  }

  /**
   * Cria uma URL de preview para um arquivo
   */
  static createPreviewUrl(file: File): string {
    return URL.createObjectURL(file);
  }

  /**
   * Libera uma URL de preview da memória
   */
  static revokePreviewUrl(url: string): void {
    URL.revokeObjectURL(url);
  }

  /**
   * Gera um nome único para o arquivo
   */
  static generateUniqueFileName(originalName: string, serviceOrderId: string, uploadOrder: number): string {
    const timestamp = Date.now();
    const extension = originalName.split('.').pop()?.toLowerCase() || 'jpg';
    return `${serviceOrderId}_${uploadOrder}_${timestamp}.${extension}`;
  }

  /**
   * Calcula o hash MD5 de um arquivo (para verificação de integridade)
   */
  static async calculateFileHash(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Corrige o tipo MIME de um arquivo baseado na extensão
   */
  static fixMimeType(file: File): File {
    return bulletproofMimeTypeCorrection(file);
  }
}

/**
 * Preserva o MIME type original de forma à prova de falhas
 */
function preserveOriginalMimeType(originalFile: File, processedFile: File): File {
  console.log('🔒 Preservando MIME type original:', {
    original: originalFile.type,
    processed: processedFile.type,
    fileName: originalFile.name
  });

  // Se o MIME type já está correto, retorna o arquivo processado
  if (processedFile.type === originalFile.type && originalFile.type !== 'application/json') {
    console.log('✅ MIME type já está correto');
    return processedFile;
  }

  // Força a preservação do MIME type original
  const preservedFile = new File(
    [processedFile],
    originalFile.name,
    {
      type: originalFile.type, // SEMPRE usa o tipo original
      lastModified: originalFile.lastModified
    }
  );

  console.log('🔧 MIME type preservado:', {
    before: processedFile.type,
    after: preservedFile.type,
    size: preservedFile.size
  });

  return preservedFile;
}

/**
 * Detecta e corrige MIME type baseado na extensão do arquivo
 */
function bulletproofMimeTypeCorrection(file: File): File {
  const extension = file.name.toLowerCase().split('.').pop();
  let correctMimeType = file.type;

  // Mapeamento de extensões para MIME types corretos
  const mimeTypeMap: Record<string, string> = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'heic': 'image/heic',
    'heif': 'image/heif'
  };

  if (extension && mimeTypeMap[extension]) {
    correctMimeType = mimeTypeMap[extension];
  }

  // Se o MIME type está incorreto ou é application/json, corrige
  if (file.type !== correctMimeType || file.type === 'application/json' || !file.type.startsWith('image/')) {
    console.log('🚨 Corrigindo MIME type incorreto:', {
      fileName: file.name,
      extension,
      originalType: file.type,
      correctedType: correctMimeType
    });

    return new File([file], file.name, {
      type: correctMimeType,
      lastModified: file.lastModified
    });
  }

  return file;
}

/**
 * Validação rigorosa de MIME type antes de qualquer operação
 */
function validateMimeTypeBeforeOperation(file: File, operation: string): void {
  console.log(`🔍 Validando MIME type antes de ${operation}:`, {
    fileName: file.name,
    type: file.type,
    size: file.size
  });

  // Rejeita imediatamente application/json
  if (file.type === 'application/json') {
    throw new Error(`MIME type application/json detectado antes de ${operation}. Arquivo corrompido.`);
  }

  // Verifica se é um tipo de imagem válido
  if (!file.type.startsWith('image/')) {
    throw new Error(`MIME type inválido para ${operation}: ${file.type}. Esperado: image/*`);
  }

  console.log(`✅ MIME type válido para ${operation}`);
}

/**
 * Comprime uma imagem preservando o MIME type original
 */
async function compressImage(file: File, options: any): Promise<File> {
  console.log('🗜️ Iniciando compressão com preservação de MIME type:', {
    fileName: file.name,
    originalType: file.type,
    originalSize: file.size
  });

  // Validação antes da compressão
  validateMimeTypeBeforeOperation(file, 'compressão');

  // Armazena o MIME type original
  const originalMimeType = file.type;

  try {
    // Remove fileType das opções para evitar conversão forçada
    const compressionOptions = { ...options };
    delete compressionOptions.fileType;

    console.log('🔧 Opções de compressão (sem fileType):', compressionOptions);

    // Comprime a imagem
    const compressedFile = await imageCompression(file, compressionOptions);

    console.log('📦 Arquivo comprimido:', {
      originalSize: file.size,
      compressedSize: compressedFile.size,
      originalType: file.type,
      compressedType: compressedFile.type,
      reduction: `${((1 - compressedFile.size / file.size) * 100).toFixed(1)}%`
    });

    // Preserva o MIME type original
    const finalFile = preserveOriginalMimeType(file, compressedFile);

    // Validação final
    validateMimeTypeBeforeOperation(finalFile, 'pós-compressão');

    return finalFile;

  } catch (error) {
    console.error('❌ Erro na compressão:', error);
    throw new Error(`Erro na compressão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}

/**
 * Processa uma imagem com preservação rigorosa do MIME type
 */
export async function processImage(file: File): Promise<File> {
  console.log('🚀 Iniciando processamento de imagem:', {
    name: file.name,
    type: file.type,
    size: file.size,
    lastModified: new Date(file.lastModified).toISOString()
  });

  try {
    // 1. Correção inicial do MIME type
    let processedFile = bulletproofMimeTypeCorrection(file);
    console.log('🔧 Após correção inicial:', { type: processedFile.type });

    // 2. Validação antes do processamento
    validateMimeTypeBeforeOperation(processedFile, 'processamento');

    // 3. Validação do arquivo
    validateImageFile(processedFile);

    // 4. Conversão HEIC/HEIF se necessário
    if (isHeicFile(processedFile)) {
      console.log('🔄 Convertendo HEIC/HEIF para JPEG...');
      processedFile = await convertHeicToJpeg(processedFile);
      console.log('✅ Conversão HEIC concluída:', { type: processedFile.type });
    }

    // 5. Compressão com preservação de MIME type
    if (processedFile.size > 3 * 1024 * 1024) { // 3MB
      console.log('📦 Comprimindo imagem...');
      processedFile = await compressImage(processedFile, {
        maxSizeInMB: 3,
        maxWidthOrHeight: 1920,
        useWebWorker: true,
        initialQuality: 0.8
        // IMPORTANTE: Não incluir fileType para preservar o original
      });
    }

    // 6. Validação final rigorosa
    validateMimeTypeBeforeOperation(processedFile, 'finalização');

    // 7. Correção final de segurança
    processedFile = bulletproofMimeTypeCorrection(processedFile);

    console.log('✅ Processamento concluído com sucesso:', {
      name: processedFile.name,
      type: processedFile.type,
      size: processedFile.size,
      originalSize: file.size,
      reduction: file.size > processedFile.size ? `${((1 - processedFile.size / file.size) * 100).toFixed(1)}%` : '0%'
    });

    return processedFile;

  } catch (error) {
    console.error('❌ Erro no processamento da imagem:', error);
    throw new Error(`Erro no processamento: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
  }
}