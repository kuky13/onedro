// @ts-nocheck
import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useOsPdfTemplates, useDeleteOsPdfTemplate, useUpdateOsPdfTemplate, OsPdfTemplate, OsTemplateType } from '@/hooks/useOsPdfTemplates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Plus, Star, Edit, Copy, Trash2, ChevronLeft, Printer } from 'lucide-react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { OsPdfTemplateEditor } from '@/components/service-orders/OsPdfTemplateEditor';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useNavigate } from 'react-router-dom';

const TemplateList = ({ type, userId }: { type: OsTemplateType; userId: string }) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Partial<OsPdfTemplate> | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = useOsPdfTemplates(userId, type);
  const deleteTemplate = useDeleteOsPdfTemplate();
  const updateTemplate = useUpdateOsPdfTemplate();

  const handleNew = () => { setEditingTemplate(null); setIsEditorOpen(true); };

  const handleEdit = (t: OsPdfTemplate) => {
    const isGlobal = !t.user_id;
    if (isGlobal) {
      setEditingTemplate({ ...t, id: undefined, template_name: `${t.template_name} (Cópia)`, user_id: userId, is_default: false });
    } else {
      setEditingTemplate(t);
    }
    setIsEditorOpen(true);
  };

  const handleSetDefault = async (id: string) => {
    await updateTemplate.mutateAsync({ id, userId, updates: { is_default: true } });
  };

  const handleDelete = async (id: string) => {
    await deleteTemplate.mutateAsync({ id, userId });
    setDeletingId(null);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-[300px]"><HamsterLoader size="md" /></div>;
  }

  return (
    <>
      <div className="space-y-4">
        <div className="flex justify-end">
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" />Novo Template</Button>
        </div>

        {templates.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                {type === 'thermal_label' ? <Printer className="h-10 w-10 text-muted-foreground" /> : <FileText className="h-10 w-10 text-muted-foreground" />}
              </div>
              <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
              <p className="text-muted-foreground">Crie um novo template para personalizar seus PDFs.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {templates.map(t => {
              const isGlobal = !t.user_id;
              return (
                <Card key={t.id} className="border-border/50">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <CardTitle className="text-lg">{t.template_name}</CardTitle>
                          {t.is_default && <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">Padrão</span>}
                          {isGlobal && <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium border">Sistema</span>}
                        </div>
                        <CardDescription className="mt-1">
                          Criado em {new Date(t.created_at).toLocaleDateString('pt-BR')}
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(t)} title={isGlobal ? 'Copiar e Editar' : 'Editar'}>
                          {isGlobal ? <Copy className="h-4 w-4" /> : <Edit className="h-4 w-4" />}
                        </Button>
                        {!t.is_default && !isGlobal && (
                          <Button variant="ghost" size="sm" onClick={() => setDeletingId(t.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-40 overflow-hidden text-ellipsis">
                      {t.template_content.substring(0, 250)}{t.template_content.length > 250 && '...'}
                    </div>
                    {!t.is_default && !isGlobal && (
                      <div className="mt-4">
                        <Button variant="outline" size="sm" onClick={() => handleSetDefault(t.id)}>
                          <Star className="h-4 w-4 mr-2" />Definir como Padrão
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
          <OsPdfTemplateEditor
            template={editingTemplate}
            templateType={type}
            onSuccess={() => setIsEditorOpen(false)}
            onCancel={() => setIsEditorOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deletingId && handleDelete(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export const ServiceOrderPdfConfigPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/service-orders')}>
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Configuração de Etiqueta Térmica</h1>
          <p className="text-muted-foreground text-sm">Personalize o layout da etiqueta térmica das Ordens de Serviço</p>
        </div>
      </div>

      <TemplateList type="thermal_label" userId={user.id} />
    </div>
  );
};

export default ServiceOrderPdfConfigPage;
