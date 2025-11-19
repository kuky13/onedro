import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Smartphone, Send } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';

const PeliculasEditPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [model, setModel] = useState('');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      toast.error('Você precisa estar logado');
      return;
    }
    if (!model.trim()) {
      toast.error('Informe o modelo');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('peliculas_suggestions')
        .insert([{ user_id: user.id, model: model.trim(), brand: brand.trim() || null, notes: notes.trim() || null }]);
      if (error) throw error;
      toast.success('Sugestão enviada!');
      setModel('');
      setBrand('');
      setNotes('');
    } catch (e: any) {
      toast.error('Erro ao enviar sugestão');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" onClick={() => navigate('/p')}>
            <Smartphone className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </div>
        <div className="text-center mb-6 flex items-center justify-center gap-2">
          <Smartphone className="h-7 w-7 text-primary" />
          <h1 className="text-2xl font-bold">Sugerir Modelo de Película</h1>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Conte pra gente qual modelo está faltando</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Input placeholder="Modelo (ex: iPhone 13, Galaxy A14)" value={model} onChange={(e) => setModel(e.target.value)} />
            </div>
            <div>
              <Input placeholder="Marca (opcional)" value={brand} onChange={(e) => setBrand(e.target.value)} />
            </div>
            <div>
              <Textarea placeholder="Observações (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
            </div>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
              <Send className="h-4 w-4 mr-2" />
              Enviar Sugestão
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default PeliculasEditPage;