import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, Plus, Edit, Trash2, Search } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

interface Pelicula {
  id: string;
  modelo: string;
  compatibilidades: string[];
  created_at: string;
  updated_at: string;
}

export function PeliculasManagement() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedPelicula, setSelectedPelicula] = useState<Pelicula | null>(null);
  
  const [formData, setFormData] = useState({
    modelo: '',
    compatibilidades: ''
  });

  // Fetch películas
  const { data: peliculas, isLoading } = useQuery({
    queryKey: ['peliculas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('peliculas_compatíveis')
        .select('*')
        .order('modelo', { ascending: true });
      
      if (error) throw error;
      return data as Pelicula[];
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (newPelicula: { modelo: string; compatibilidades: string[] }) => {
      const { data, error } = await supabase
        .from('peliculas_compatíveis')
        .insert([newPelicula])
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peliculas'] });
      toast.success('Película adicionada com sucesso!');
      setIsAddDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Erro ao adicionar película: ' + error.message);
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: { modelo: string; compatibilidades: string[] } }) => {
      const { error } = await supabase
        .from('peliculas_compatíveis')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peliculas'] });
      toast.success('Película atualizada com sucesso!');
      setIsEditDialogOpen(false);
      resetForm();
    },
    onError: (error: Error) => {
      toast.error('Erro ao atualizar película: ' + error.message);
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('peliculas_compatíveis')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peliculas'] });
      toast.success('Película removida com sucesso!');
      setDeleteDialogOpen(false);
      setSelectedPelicula(null);
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover película: ' + error.message);
    }
  });

  const resetForm = () => {
    setFormData({ modelo: '', compatibilidades: '' });
    setSelectedPelicula(null);
  };

  const handleAdd = () => {
    const compatibilidadesArray = formData.compatibilidades
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (!formData.modelo || compatibilidadesArray.length === 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    createMutation.mutate({
      modelo: formData.modelo,
      compatibilidades: compatibilidadesArray
    });
  };

  const handleEdit = () => {
    if (!selectedPelicula) return;

    const compatibilidadesArray = formData.compatibilidades
      .split(',')
      .map(c => c.trim())
      .filter(c => c.length > 0);

    if (!formData.modelo || compatibilidadesArray.length === 0) {
      toast.error('Preencha todos os campos');
      return;
    }

    updateMutation.mutate({
      id: selectedPelicula.id,
      data: {
        modelo: formData.modelo,
        compatibilidades: compatibilidadesArray
      }
    });
  };

  const handleDelete = () => {
    if (!selectedPelicula) return;
    deleteMutation.mutate(selectedPelicula.id);
  };

  const openEditDialog = (pelicula: Pelicula) => {
    setSelectedPelicula(pelicula);
    setFormData({
      modelo: pelicula.modelo,
      compatibilidades: pelicula.compatibilidades.join(', ')
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (pelicula: Pelicula) => {
    setSelectedPelicula(pelicula);
    setDeleteDialogOpen(true);
  };

  const filteredPeliculas = peliculas?.filter(p => 
    p.modelo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.compatibilidades.some(c => c.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const { data: suggestions, isLoading: loadingSuggestions } = useQuery({
    queryKey: ['peliculas_suggestions'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('peliculas_suggestions')
        .select('id, user_id, model, brand, notes, created_at')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Array<{ id: string; user_id: string; model: string; brand: string | null; notes: string | null; created_at: string }>;
    }
  });

  const deleteSuggestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('peliculas_suggestions')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['peliculas_suggestions'] });
      toast.success('Sugestão removida');
    },
    onError: (error: Error) => {
      toast.error('Erro ao remover sugestão: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Gerenciar Películas Compatíveis</h1>
        <p className="text-muted-foreground">Adicione, edite ou remova películas e suas compatibilidades</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex flex-col md:flex-row items-stretch md:items-center md:justify-between gap-4">
            <span>Películas Cadastradas</span>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="relative flex-grow">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Buscar películas..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={resetForm}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Película
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar Nova Película</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="modelo">Modelo do Dispositivo</Label>
                      <Input
                        id="modelo"
                        value={formData.modelo}
                        onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                        placeholder="Ex: iPhone 13"
                      />
                    </div>
                    <div>
                      <Label htmlFor="compatibilidades">Películas Compatíveis (separadas por vírgula)</Label>
                      <Textarea
                        id="compatibilidades"
                        value={formData.compatibilidades}
                        onChange={(e) => setFormData({ ...formData, compatibilidades: e.target.value })}
                        placeholder="Ex: iPhone 13, iPhone 13 Pro"
                        rows={4}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAdd} disabled={createMutation.isPending}>
                      {createMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      Adicionar
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredPeliculas && filteredPeliculas.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Compatibilidades</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPeliculas.map((pelicula) => (
                    <TableRow key={pelicula.id}>
                      <TableCell className="font-medium">{pelicula.modelo}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {pelicula.compatibilidades.map((comp, idx) => (
                            <span key={idx} className="inline-flex items-center px-2 py-1 rounded-md bg-primary/10 text-primary text-xs">
                              {comp}
                            </span>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(pelicula)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(pelicula)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              {searchTerm ? (
                <p>Nenhuma película encontrada para "{searchTerm}"</p>
              ) : (
                <p>Nenhuma película cadastrada no sistema</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Sugestões de Modelos dos Usuários</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingSuggestions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : suggestions && suggestions.length > 0 ? (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Modelo</TableHead>
                    <TableHead>Marca</TableHead>
                    <TableHead>Notas</TableHead>
                    <TableHead>Usuário</TableHead>
                    <TableHead>Enviado em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {suggestions.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.model}</TableCell>
                      <TableCell>{s.brand || '-'}</TableCell>
                      <TableCell className="max-w-md truncate">{s.notes || '-'}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{s.user_id}</TableCell>
                      <TableCell>{new Date(s.created_at).toLocaleString()}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteSuggestionMutation.mutate(s.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">Nenhuma sugestão enviada</div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Película</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-modelo">Modelo do Dispositivo</Label>
              <Input
                id="edit-modelo"
                value={formData.modelo}
                onChange={(e) => setFormData({ ...formData, modelo: e.target.value })}
                placeholder="Ex: iPhone 13"
              />
            </div>
            <div>
              <Label htmlFor="edit-compatibilidades">Películas Compatíveis (separadas por vírgula)</Label>
              <Textarea
                id="edit-compatibilidades"
                value={formData.compatibilidades}
                onChange={(e) => setFormData({ ...formData, compatibilidades: e.target.value })}
                placeholder="Ex: iPhone 13, iPhone 13 Pro"
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEdit} disabled={updateMutation.isPending}>
              {updateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar a película <strong>{selectedPelicula?.modelo}</strong>? 
              Esta ação é irreversível.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Deletando...
                </>
              ) : (
                'Deletar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
