import { supabase } from '../integrations/supabase/client';
import { RadicalImageProcessingService } from './radicalImageProcessingService';
import { ServiceOrderImage } from '../types/imageUpload';

/**
 * Serviço de armazenamento de imagens usando Supabase Storage nativo
 */

interface UploadImageParams {
  file: File;
  serviceOrderId: string;
  uploadOrder: number;
  userId: string;
}

export class SupabaseStorageService {
  private static readonly BUCKET_NAME = 'service-order-images';

  /**
   * Upload de imagem para Supabase Storage
   */
  static async uploadImage({ file, serviceOrderId, uploadOrder, userId }: UploadImageParams): Promise<ServiceOrderImage> {
    try {
      console.log('📤 Supabase Storage: Iniciando upload', {
        fileName: file.name,
        size: file.size,
        serviceOrderId,
        uploadOrder
      });

      // Processar imagem antes do upload
      const processedFile = await RadicalImageProcessingService.processImage(file);
      
      console.log('✅ Imagem processada:', {
        originalSize: file.size,
        processedSize: processedFile.size,
        originalType: file.type,
        processedType: processedFile.type
      });

      // Gerar nome único para o arquivo
      const fileExt = processedFile.name.split('.').pop();
      const fileName = `${serviceOrderId}/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

      // Upload para Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .upload(fileName, processedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('❌ Erro no upload para Supabase Storage:', uploadError);
        throw uploadError;
      }

      console.log('✅ Upload concluído:', uploadData);

      // Obter URL pública
      const { data: { publicUrl } } = supabase.storage
        .from(this.BUCKET_NAME)
        .getPublicUrl(fileName);

      console.log('📍 URL pública gerada:', publicUrl);

      // Salvar metadata no banco de dados
      const { data: dbData, error: dbError } = await supabase
        .from('service_order_images')
        .insert({
          service_order_id: serviceOrderId,
          storage_path: fileName,
          uploadthing_url: publicUrl,
          uploadthing_key: fileName,
          file_name: processedFile.name,
          file_size: processedFile.size,
          mime_type: processedFile.type,
          upload_order: uploadOrder,
          uploaded_by: userId,
        })
        .select()
        .single();

      if (dbError) {
        console.error('❌ Erro ao salvar no banco:', dbError);
        // Tentar remover arquivo do storage se falhar ao salvar no banco
        await supabase.storage.from(this.BUCKET_NAME).remove([fileName]);
        throw dbError;
      }

      console.log('✅ Metadata salva no banco:', dbData);
      return dbData as ServiceOrderImage;
    } catch (error) {
      console.error('❌ Erro no upload:', error);
      throw error;
    }
  }

  /**
   * Remove imagem do Storage e banco de dados
   */
  static async deleteImage(imageId: string): Promise<boolean> {
    try {
      console.log('🗑️ Removendo imagem:', imageId);

      // Buscar informações da imagem no banco
      const { data: imageData, error: fetchError } = await supabase
        .from('service_order_images')
        .select('storage_path')
        .eq('id', imageId)
        .single();

      if (fetchError) {
        console.error('❌ Erro ao buscar imagem:', fetchError);
        throw fetchError;
      }

      if (!imageData?.storage_path) {
        console.error('❌ Storage path não encontrado');
        return false;
      }

      // Remover do Storage
      const { error: storageError } = await supabase.storage
        .from(this.BUCKET_NAME)
        .remove([imageData.storage_path]);

      if (storageError) {
        console.error('⚠️ Erro ao remover do Storage (continuando):', storageError);
      }

      // Remover do banco de dados
      const { error: dbError } = await supabase
        .from('service_order_images')
        .delete()
        .eq('id', imageId);

      if (dbError) {
        console.error('❌ Erro ao remover do banco:', dbError);
        throw dbError;
      }

      console.log('✅ Imagem removida com sucesso');
      return true;
    } catch (error) {
      console.error('❌ Erro ao deletar imagem:', error);
      return false;
    }
  }

  /**
   * Lista imagens de uma ordem de serviço
   */
  static async getServiceOrderImages(serviceOrderId: string): Promise<ServiceOrderImage[]> {
    try {
      console.log('📋 Buscando imagens para service_order:', serviceOrderId);
      
      const { data, error } = await supabase
        .from('service_order_images')
        .select('*')
        .eq('service_order_id', serviceOrderId)
        .order('upload_order', { ascending: true });

      if (error) {
        console.error('❌ Erro ao buscar imagens:', error);
        throw error;
      }

      console.log('✅ Imagens encontradas:', data?.length || 0);
      return (data as ServiceOrderImage[]) || [];
    } catch (error) {
      console.error('❌ Erro ao buscar imagens:', error);
      return [];
    }
  }

  /**
   * Gera URL pública para a imagem
   */
  static getImageUrl(storagePath: string): string {
    const { data: { publicUrl } } = supabase.storage
      .from(this.BUCKET_NAME)
      .getPublicUrl(storagePath);
    
    return publicUrl;
  }
}
