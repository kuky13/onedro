/**
 * Página de Gerenciamento de Atualizações
 * OneDrip - Interface administrativa para gerenciar atualizações do sistema
 */

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff, 
  Save, 
  Send,
  X, 
  BarChart3,
  Users,
  MessageSquare,
  Calendar
} from 'lucide-react';
import { useUpdateManagement } from '@/hooks/useUpdateManagement';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/useToast';
import { Update, CreateUpdateRequest, UpdateUpdateRequest } from '@/types/update';
import { supabase } from '@/integrations/supabase/client';

interface UpdateFormData {
  title: string;
  content: string;
  link_text: string;
  link_url: string;
  is_active: boolean;
}

const initialFormData: UpdateFormData = {
  title: '',
  content: '',
  link_text: 'Para mais detalhes',
  link_url: 'https://onedrip.com.br',
  is_active: true
};

export const UpdateManagementPage: React.FC = () => {
  const {
    updates,
    currentUpdate,
    isLoading,
    isSaving,
    error,
    stats,
    createUpdate,
    updateUpdate,
    deleteUpdate,
    toggleUpdateStatus,
    loadUpdate,
    clearError
  } = useUpdateManagement();

  const { showSuccess, showError } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<UpdateFormData>(initialFormData);
  const [showPreview, setShowPreview] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Limpar erro apenas quando componente monta (não em toda mudança de erro)
  useEffect(() => {
    // Limpar erro inicial se existir
    if (error) {
      clearError();
    }
  }, []); // Array vazio para executar apenas uma vez

  // Handlers do formulário
  const handleInputChange = (field: keyof UpdateFormData, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleStartCreate = () => {
    setFormData(initialFormData);
    setIsEditing(true);
    setEditingId(null);
    setShowPreview(false);
  };

  const handleStartEdit = (update: Update) => {
    setFormData({
      title: update.title,
      content: update.content,
      link_text: update.link_text || 'Para mais detalhes',
      link_url: update.link_url || 'https://onedrip.com.br',
      is_active: update.is_active
    });
    setIsEditing(true);
    setEditingId(update.id);
    setShowPreview(false);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData(initialFormData);
    setShowPreview(false);
  };

  const handleSave = async () => {
    try {
      if (editingId) {
        // Atualizar existente
        const updateData: UpdateUpdateRequest = {
          id: editingId,
          ...formData
        };
        await updateUpdate(updateData);
      } else {
        // Criar novo
        const createData: CreateUpdateRequest = formData;
        await createUpdate(createData);
      }
      
      handleCancelEdit();
      showSuccess({
        title: editingId ? 'Atualização salva!' : 'Atualização criada!',
        description: 'A operação foi realizada com sucesso.'
      });
    } catch (err) {
      showError({ title: 'Erro ao salvar atualização' });
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (window.confirm(`Tem certeza que deseja excluir "${title}"?`)) {
      try {
        await deleteUpdate(id);
        showSuccess({
        title: 'Atualização excluída!',
        description: 'A atualização foi removida com sucesso.'
      });
      } catch (err) {
        showError({ title: 'Erro ao excluir atualização' });
      }
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleUpdateStatus(id);
    } catch (err) {
      showError({ title: 'Erro ao alterar status' });
    }
  };

  const handleSendUpdate = async () => {
    if (!editingId) {
      showError({ title: 'Nenhuma atualização selecionada para envio' });
      return;
    }

    setIsSending(true);
    try {
      // 1. Ativar a atualização
      const { error: updateError } = await supabase
        .from('updates')
        .update({ is_active: true })
        .eq('id', editingId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      // 2. Limpar todas as preferências de dismissal para esta atualização
      const { error: deleteError } = await supabase
        .from('user_update_preferences')
        .delete()
        .eq('update_id', editingId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

      // 3. Atualizar o estado local
      setFormData(prev => ({ ...prev, is_active: true }));
      
      showSuccess({
        title: 'Atualização enviada!',
        description: 'A atualização foi enviada para todos os usuários.'
      });
    } catch (err) {
      console.error('Erro ao enviar atualização:', err);
      showError({ title: 'Erro ao enviar atualização' });
    } finally {
      setIsSending(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <div className="container mx-auto p-6 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-white">Gerenciar Atualizações</h1>
            <p className="text-gray-300 mt-1">
              Controle as atualizações exibidas no dashboard dos usuários
            </p>
          </div>
          
          <Button onClick={handleStartCreate} disabled={isEditing} className="bg-[#fec832] hover:bg-[#e6b52e] text-black">
            <Plus className="h-4 w-4 mr-2" />
            Nova Atualização
          </Button>
        </div>

        {/* Estatísticas */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Card className="border-gray-700 bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <MessageSquare className="h-8 w-8 text-[#fec832]" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-300">Total de Atualizações</p>
                    <p className="text-2xl font-bold text-white">{updates.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-700 bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-gray-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-300">Ativas</p>
                    <p className="text-2xl font-bold text-white">{stats.active_updates}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-700 bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-gray-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-300">Dismissals</p>
                    <p className="text-2xl font-bold text-white">{stats.total_dismissals}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-gray-700 bg-gray-800">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calendar className="h-8 w-8 text-gray-400" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-300">Última Atualização</p>
                    <p className="text-sm font-bold text-white">
                      {stats.last_update ? formatDate(stats.last_update) : 'Nenhuma'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor/Formulário */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-white">
                <span>{editingId ? 'Editar Atualização' : 'Nova Atualização'}</span>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white"
                    >
                      {showPreview ? 'Editar' : 'Preview'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={handleCancelEdit} className="border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="text-center py-8 text-gray-400">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Selecione uma atualização para editar ou crie uma nova</p>
                </div>
              ) : showPreview ? (
                /* Preview */
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-[#fec832]/10 to-gray-700 border border-[#fec832]/30 rounded-lg">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="bg-[#fec832]/20 text-[#fec832] border-[#fec832]/30">
                        Preview
                      </Badge>
                      <Badge variant={formData.is_active ? "default" : "secondary"} className={formData.is_active ? "bg-[#fec832] text-black hover:bg-[#e6b52e]" : "bg-gray-600 text-gray-200"}>
                        {formData.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-white mb-2">
                      {formData.title || 'Título da atualização'}
                    </h3>
                    
                    <div className="text-sm text-gray-200 mb-3">
                      {formData.content.split('\n').map((line, index) => (
                        <p key={index} className={index > 0 ? 'mt-2' : ''}>
                          {line || 'Conteúdo da atualização...'}
                        </p>
                      ))}
                    </div>
                    
                    {formData.link_url && (
                      <Button variant="outline" size="sm" className="w-full border-[#fec832] text-[#fec832] hover:bg-[#fec832]/10">
                        {formData.link_text || 'Para mais detalhes'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                /* Formulário */
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="title" className="text-gray-200">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Título da atualização"
                      className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fec832] focus:ring-[#fec832]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content" className="text-gray-200">Conteúdo</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Descreva a atualização..."
                      rows={4}
                      className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fec832] focus:ring-[#fec832]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="link_text" className="text-gray-200">Texto do Link</Label>
                    <Input
                      id="link_text"
                      value={formData.link_text}
                      onChange={(e) => handleInputChange('link_text', e.target.value)}
                      placeholder="Para mais detalhes"
                      className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fec832] focus:ring-[#fec832]"
                    />
                  </div>

                  <div>
                    <Label htmlFor="link_url" className="text-gray-200">URL do Link</Label>
                    <Input
                      id="link_url"
                      value={formData.link_url}
                      onChange={(e) => handleInputChange('link_url', e.target.value)}
                      placeholder="https://onedrip.com.br"
                      className="mt-1 bg-gray-700 border-gray-600 text-white placeholder-gray-400 focus:border-[#fec832] focus:ring-[#fec832]"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                      className="data-[state=checked]:bg-[#fec832]"
                    />
                    <Label htmlFor="is_active" className="text-gray-200">Ativar imediatamente</Label>
                  </div>

                  <Separator className="bg-gray-600" />

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving || !formData.title.trim() || !formData.content.trim()}
                      className="flex-1 bg-[#fec832] hover:bg-[#e6b52e] text-black"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    
                    {editingId && (
                      <Button 
                        onClick={handleSendUpdate} 
                        disabled={isSending || isSaving}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSending ? 'Enviando...' : 'Enviar'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Atualizações */}
          <Card className="border-gray-700 bg-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Atualizações Existentes</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#fec832] mx-auto"></div>
                  <p className="text-gray-400 mt-2">Carregando...</p>
                </div>
              ) : updates.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 text-gray-600" />
                  <p>Nenhuma atualização encontrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className={`p-3 border rounded-lg transition-colors ${
                        editingId === update.id 
                          ? 'border-[#fec832] bg-[#fec832]/10' 
                          : 'border-gray-600 bg-gray-700 hover:border-gray-500 hover:bg-gray-650'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm text-white truncate">
                              {update.title}
                            </h4>
                            <Badge 
                              variant={update.is_active ? "default" : "secondary"}
                              className={update.is_active ? "bg-[#fec832] text-black hover:bg-[#e6b52e]" : "bg-gray-600 text-gray-200"}
                            >
                              {update.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-300 line-clamp-2">
                            {update.content}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {formatDate(update.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleStatus(update.id)}
                            disabled={isSaving}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-[#fec832] hover:bg-[#fec832]/10"
                            title={update.is_active ? 'Desativar' : 'Ativar'}
                          >
                            {update.is_active ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleStartEdit(update)}
                            disabled={isEditing}
                            className="h-8 w-8 p-0 text-gray-400 hover:text-[#fec832] hover:bg-[#fec832]/10"
                            title="Editar"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(update.id, update.title)}
                            disabled={isSaving}
                            className="h-8 w-8 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                            title="Excluir"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Exibir erro global se houver */}
        {error && (
          <Card className="mt-6 border-red-600 bg-red-900/20">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-red-300">{error}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearError}
                  className="text-red-400 hover:text-red-300"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UpdateManagementPage;