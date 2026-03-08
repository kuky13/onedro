import React, { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { usePdfTemplates, useDeletePdfTemplate, useUpdatePdfTemplate, useEnsureDefaultPdfTemplate } from '@/hooks/worm/usePdfTemplates';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Star, Edit, Trash2 } from 'lucide-react';
import { HamsterLoader } from '@/components/ui/hamster-loader';
import { PdfTemplateEditor } from './PdfTemplateEditor';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

export const WormPdfConfig = () => {
  const { user } = useAuth();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: templates = [], isLoading } = usePdfTemplates(user?.id);
  const deleteTemplate = useDeletePdfTemplate();
  const updateTemplate = useUpdatePdfTemplate();
  const ensureDefault = useEnsureDefaultPdfTemplate(user?.id);

  // Criar template padrão ao montar se não existir
  React.useEffect(() => {
    if (user?.id && templates.length === 0 && !isLoading) {
      ensureDefault.mutate();
    }
  }, [user?.id, templates.length, isLoading]);


  const handleEditTemplate = (template: any) => {
    const isGlobal = !template.user_id;
    if (isGlobal) {
      // For global templates, open editor in "create copy" mode
      setEditingTemplate({
        ...template,
        id: undefined, // Remove id so editor treats it as new
        user_id: user?.id,
        template_name: template.template_name + ' (Meu)',
        is_default: true,
      });
    } else {
      setEditingTemplate(template);
    }
    setIsEditorOpen(true);
  };

  const handleSetDefault = async (templateId: string) => {
    if (!user?.id) return;
    await updateTemplate.mutateAsync({
      id: templateId,
      userId: user.id,
      updates: {
        is_default: true
      }
    });
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!user?.id) return;
    await deleteTemplate.mutateAsync({
      id: templateId,
      userId: user.id
    });
    setDeletingId(null);
  };

  if (isLoading || ensureDefault.isPending) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
                <HamsterLoader size="md" className="mx-auto" />
            </div>);

  }

  return (
    <>
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-2xl font-bold text-foreground">Configurações do PDF</h2>
                        <p className="text-muted-foreground text-sm mt-1">
                            Personalize a seção de serviço do PDF
                        </p>
                    </div>
                    <div className="flex gap-2">
                        


            
                    </div>
                </div>

                {templates.length === 0 ?
        <Card>
                        <CardContent className="py-12 text-center">
                            <div className="h-20 w-20 mx-auto mb-4 rounded-full bg-muted flex items-center justify-center">
                                <FileText className="h-10 w-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-2">Nenhum template encontrado</h3>
                            <p className="text-muted-foreground mb-4">
                                O sistema criará um template padrão automaticamente.
                            </p>
                        </CardContent>
                    </Card> :

        <div className="grid gap-4">
                        {templates.map((template) => {
            const isGlobal = !template.user_id;
            return (
              <Card key={template.id} className="border-border/50">
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-lg">
                                                        {template.template_name}
                                                    </CardTitle>
                                                    {template.is_default &&
                        <span className="bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full font-medium">Padrão</span>
                        }
                                                    {isGlobal &&
                        <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full font-medium border">Sistema</span>
                        }
                                                </div>
                                                <CardDescription className="mt-1">
                                                    Criado em {new Date(template.created_at).toLocaleDateString('pt-BR')}
                                                </CardDescription>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                



















                      

                                                {!isGlobal &&
                                                    <Button variant="ghost" size="sm" onClick={() => setDeletingId(template.id)}>
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                }
                                            </div>
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        <div
                                            className="bg-muted/50 rounded-lg p-4 font-mono text-sm whitespace-pre-wrap max-h-40 overflow-hidden text-ellipsis cursor-pointer hover:bg-muted/80 transition-colors group relative"
                                            onClick={() => handleEditTemplate(template)}
                                            title={isGlobal ? 'Clique para personalizar este template' : 'Clique para editar'}
                                        >
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <span className="bg-primary text-primary-foreground text-xs px-2 py-1 rounded-md flex items-center gap-1">
                                                    <Edit className="h-3 w-3" />
                                                    {isGlobal ? 'Personalizar' : 'Editar'}
                                                </span>
                                            </div>
                                            {template.service_section_template.substring(0, 200)}
                                            {template.service_section_template.length > 200 && '...'}
                                        </div>
                                        <div className="mt-4 flex flex-wrap gap-2">
                                            <Button variant="outline" size="sm" onClick={() => handleEditTemplate(template)}>
                                                <Edit className="h-4 w-4 mr-2" />
                                                {isGlobal ? 'Personalizar Template' : 'Editar Template'}
                                            </Button>
                                            {!template.is_default && !isGlobal && (
                                                <Button variant="outline" size="sm" onClick={() => handleSetDefault(template.id)}>
                                                    <Star className="h-4 w-4 mr-2" />
                                                    Definir como Padrão
                                                </Button>
                                            )}
                                            {!isGlobal && (
                                                <Button variant="outline" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20" onClick={() => setDeletingId(template.id)}>
                                                    <Trash2 className="h-4 w-4 mr-2" />
                                                    Excluir
                                                </Button>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>);

          })}
                    </div>
        }
            </div>

            <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
                <SheetContent side="right" className="w-full sm:max-w-3xl overflow-y-auto">
                    <PdfTemplateEditor
            template={editingTemplate}
            onSuccess={() => setIsEditorOpen(false)}
            onCancel={() => setIsEditorOpen(false)} />
          
                </SheetContent>
            </Sheet>

            <AlertDialog open={!!deletingId} onOpenChange={() => setDeletingId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                        <AlertDialogDescription>
                            {templates.find(t => t.id === deletingId)?.is_default 
                                ? "Tem certeza que deseja excluir este template PADRÃO? O sistema passará a usar o modelo global do sistema."
                                : "Tem certeza que deseja excluir este template? Esta ação não pode ser desfeita."
                            }
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deletingId && handleDeleteTemplate(deletingId)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>);

};