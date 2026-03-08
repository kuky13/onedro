// @ts-nocheck
/**
 * Página de Gerenciamento de Atualizações
 * OneDrip - Interface administrativa para gerenciar atualizações do sistema
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Calendar,
  ArrowLeft,
  Megaphone,
  Bell,
  TrendingUp
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
  const navigate = useNavigate();
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

  useEffect(() => {
    if (error) {
      clearError();
    }
  }, []);

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
        const updateData: UpdateUpdateRequest = {
          id: editingId,
          ...formData
        };
        await updateUpdate(updateData);
      } else {
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
      const { error: updateError } = await supabase
        .from('updates')
        .update({ is_active: true })
        .eq('id', editingId);

      if (updateError) {
        throw new Error(updateError.message);
      }

      const { error: deleteError } = await supabase
        .from('user_update_preferences')
        .delete()
        .eq('update_id', editingId);

      if (deleteError) {
        throw new Error(deleteError.message);
      }

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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="relative z-10 bg-background border-b border-border">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate('/dashboard')}
              className="rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Megaphone className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground">Atualizações</h1>
                <p className="text-xs text-muted-foreground">Gerenciamento</p>
              </div>
            </div>
          </div>
          
          <Button 
            onClick={handleStartCreate} 
            disabled={isEditing}
            className="rounded-full gap-2"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Nova</span>
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{updates.length}</p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                    <Bell className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.active_updates}</p>
                    <p className="text-xs text-muted-foreground">Ativas</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-orange-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{stats.total_dismissals}</p>
                    <p className="text-xs text-muted-foreground">Dismissals</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground truncate">
                      {stats.last_update ? formatDate(stats.last_update).split(' ')[0] : '-'}
                    </p>
                    <p className="text-xs text-muted-foreground">Última</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Editor/Formulário */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center justify-between text-lg">
                <span className="flex items-center gap-2">
                  <Edit className="h-4 w-4 text-primary" />
                  {editingId ? 'Editar' : 'Nova Atualização'}
                </span>
                {isEditing && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreview(!showPreview)}
                      className="rounded-full text-xs"
                    >
                      {showPreview ? 'Editar' : 'Preview'}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={handleCancelEdit}
                      className="rounded-full h-8 w-8"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!isEditing ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Selecione uma atualização para editar ou crie uma nova
                  </p>
                </div>
              ) : showPreview ? (
                <div className="space-y-4">
                  <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border border-primary/20 rounded-xl">
                    <div className="flex items-center justify-between mb-3">
                      <Badge variant="secondary" className="text-xs">
                        Preview
                      </Badge>
                      <Badge variant={formData.is_active ? "default" : "secondary"}>
                        {formData.is_active ? 'Ativa' : 'Inativa'}
                      </Badge>
                    </div>
                    
                    <h3 className="font-semibold text-foreground mb-2">
                      {formData.title || 'Título da atualização'}
                    </h3>
                    
                    <div className="text-sm text-muted-foreground mb-3">
                      {formData.content.split('\n').map((line, index) => (
                        <p key={index} className={index > 0 ? 'mt-2' : ''}>
                          {line || 'Conteúdo da atualização...'}
                        </p>
                      ))}
                    </div>
                    
                    {formData.link_url && (
                      <Button variant="outline" size="sm" className="w-full rounded-full">
                        {formData.link_text || 'Para mais detalhes'}
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-sm font-medium">Título</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder="Título da atualização"
                      className="rounded-xl"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content" className="text-sm font-medium">Conteúdo</Label>
                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) => handleInputChange('content', e.target.value)}
                      placeholder="Descreva a atualização..."
                      rows={4}
                      className="rounded-xl resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="link_text" className="text-sm font-medium">Texto do Link</Label>
                      <Input
                        id="link_text"
                        value={formData.link_text}
                        onChange={(e) => handleInputChange('link_text', e.target.value)}
                        placeholder="Para mais detalhes"
                        className="rounded-xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="link_url" className="text-sm font-medium">URL</Label>
                      <Input
                        id="link_url"
                        value={formData.link_url}
                        onChange={(e) => handleInputChange('link_url', e.target.value)}
                        placeholder="https://..."
                        className="rounded-xl"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
                    <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                      Ativar imediatamente
                    </Label>
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => handleInputChange('is_active', checked)}
                    />
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button 
                      onClick={handleSave} 
                      disabled={isSaving || !formData.title.trim() || !formData.content.trim()}
                      className="flex-1 rounded-full gap-2"
                    >
                      <Save className="h-4 w-4" />
                      {isSaving ? 'Salvando...' : 'Salvar'}
                    </Button>
                    
                    {editingId && (
                      <Button 
                        onClick={handleSendUpdate} 
                        disabled={isSending || isSaving}
                        variant="secondary"
                        className="flex-1 rounded-full gap-2"
                      >
                        <Send className="h-4 w-4" />
                        {isSending ? 'Enviando...' : 'Enviar'}
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Lista de Atualizações */}
          <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingUp className="h-4 w-4 text-primary" />
                Atualizações
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground text-sm">Carregando...</p>
                </div>
              ) : updates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-8 w-8 text-muted-foreground/50" />
                  </div>
                  <p className="text-muted-foreground text-sm">Nenhuma atualização encontrada</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2">
                  {updates.map((update) => (
                    <div
                      key={update.id}
                      className={`p-4 border rounded-xl transition-all cursor-pointer hover:shadow-md ${
                        editingId === update.id 
                          ? 'border-primary bg-primary/5 shadow-md' 
                          : 'border-border/50 bg-card/30 hover:border-border'
                      }`}
                      onClick={() => handleStartEdit(update)}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-foreground truncate">
                              {update.title}
                            </h4>
                            <Badge 
                              variant={update.is_active ? "default" : "secondary"}
                              className="text-xs shrink-0"
                            >
                              {update.is_active ? 'Ativa' : 'Inativa'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {update.content}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-2">
                            {formatDate(update.created_at)}
                          </p>
                        </div>
                        
                        <div className="flex gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleStatus(update.id);
                            }}
                            className="h-8 w-8 rounded-full"
                          >
                            {update.is_active ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(update.id, update.title);
                            }}
                            className="h-8 w-8 rounded-full text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
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
      </main>
    </div>
  );
};

export default UpdateManagementPage;
