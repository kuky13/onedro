import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/useToast';

export interface AdminImage {
  id: string;
  name: string;
  category: string;
  file_name: string;
  file_url: string;
  description?: string;
  uploaded_by: string;
  created_at: string;
  updated_at: string;
}

export const useAdminImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const sb = supabase as any;

  const { data: images, isLoading } = useQuery({
    queryKey: ['admin-images'],
    queryFn: async () => {
      const { data, error } = await sb
        .from('admin_images')
        .select('*')
        .order('category', { ascending: true })
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as AdminImage[];
    }
  });

  const uploadImageMutation = useMutation({
    mutationFn: async ({ 
      file, 
      name, 
      category, 
      description 
    }: { 
      file: File; 
      name: string; 
      category: string; 
      description?: string;
    }) => {
      setUploading(true);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${name}-${Date.now()}.${fileExt}`;
      const filePath = `${category}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await sb.storage
        .from('admin-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: publicData } = sb.storage
        .from('admin-assets')
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl as string;

      // Save to database
      const { data, error } = await sb
        .from('admin_images')
        .insert({
          name,
          category,
          file_name: fileName,
          file_url: publicUrl,
          description,
          uploaded_by: (await sb.auth.getUser()).data.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-images'] });
      toast({
        title: "Imagem enviada",
        description: "A imagem foi enviada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao enviar imagem",
        description: error.message,
        variant: "destructive",
      });
    },
    onSettled: () => {
      setUploading(false);
    }
  });

  const deleteImageMutation = useMutation({
    mutationFn: async (imageId: string) => {
      // Get image data first
      const { data: image, error: fetchError } = await sb
        .from('admin_images')
        .select('*')
        .eq('id', imageId)
        .single();

      if (fetchError) throw fetchError;

      // Delete from storage
      const filePath = `${image.category}/${image.file_name}`;
      const { error: storageError } = await sb.storage
        .from('admin-assets')
        .remove([filePath]);

      if (storageError) throw storageError;

      // Delete from database
      const { error: dbError } = await sb
        .from('admin_images')
        .delete()
        .eq('id', imageId);

      if (dbError) throw dbError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-images'] });
      toast({
        title: "Imagem removida",
        description: "A imagem foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover imagem",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const getImageByName = (name: string) => {
    return images?.find(img => img.name === name);
  };

  const getImagesByCategory = (category: string) => {
    return images?.filter(img => img.category === category) || [];
  };

  return {
    images,
    isLoading,
    uploading,
    uploadImage: uploadImageMutation.mutate,
    deleteImage: deleteImageMutation.mutate,
    getImageByName,
    getImagesByCategory,
    isDeleting: deleteImageMutation.isPending
  };
};