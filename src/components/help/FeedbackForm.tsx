import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/useToast';
import { 
  Star, 
  Send, 
  MessageSquare, 
  ThumbsUp, 
  Bug,
  Lightbulb,
  Heart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackFormProps {
  onClose: () => void;
  context?: string;
}

type FeedbackType = 'suggestion' | 'bug' | 'compliment' | 'question';
type Rating = 1 | 2 | 3 | 4 | 5;

export const FeedbackForm = ({ onClose, context }: FeedbackFormProps) => {
  const [feedbackType, setFeedbackType] = useState<FeedbackType>('suggestion');
  const [rating, setRating] = useState<Rating | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false); // novo estado
  const { toast } = useToast();

  const feedbackTypes = [
    {
      id: 'suggestion' as FeedbackType,
      label: 'Sugestão',
      icon: Lightbulb,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20'
    },
    {
      id: 'bug' as FeedbackType,
      label: 'Bug/Erro',
      icon: Bug,
      color: 'text-red-600',
      bgColor: 'bg-red-50 dark:bg-red-950/20'
    },
    {
      id: 'compliment' as FeedbackType,
      label: 'Elogio',
      icon: Heart,
      color: 'text-green-600',
      bgColor: 'bg-green-50 dark:bg-green-950/20'
    },
    {
      id: 'question' as FeedbackType,
      label: 'Dúvida',
      icon: MessageSquare,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20'
    }
  ];

  const selectedType = feedbackTypes.find(type => type.id === feedbackType)!;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !description.trim()) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o título e descrição.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Simular envio (integração real seria feita aqui)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Salvar no localStorage para demonstração
      const feedback = {
        id: Date.now().toString(),
        type: feedbackType,
        rating,
        title,
        description,
        email,
        context,
        timestamp: new Date().toISOString()
      };
      
      const existingFeedback = JSON.parse(localStorage.getItem('user-feedback') || '[]');
      existingFeedback.push(feedback);
      localStorage.setItem('user-feedback', JSON.stringify(existingFeedback));
      setSuccess(true); // mostrar confirmação visual

      toast({
        title: "Feedback enviado! 🎉",
        description: "Obrigado pela sua contribuição. Sua opinião é muito importante!",
        duration: 5000
      });

      // onClose(); // Removido para manter o formulário aberto após o envio
    } catch (error) {
      toast({
        title: "Erro ao enviar feedback",
        description: "Tente novamente em alguns instantes.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto animate-fade-in">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <ThumbsUp className="h-6 w-6 text-green-600 animate-bounce" />
            Obrigado pelo feedback!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 text-center">
          <p className="text-lg text-muted-foreground">Sua opinião foi registrada com sucesso.<br/>Ela nos ajuda a melhorar cada vez mais!</p>
          <Button onClick={onClose} className="w-full" autoFocus aria-label="Fechar confirmação de feedback">
            Fechar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" />
          Seu Feedback
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Ajude-nos a melhorar! Sua opinião é fundamental.
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Tipo de Feedback */}
        <div>
          <label className="text-sm font-medium mb-3 block">
            Tipo de feedback
          </label>
          <div className="grid grid-cols-2 gap-2">
            {feedbackTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setFeedbackType(type.id)}
                className={cn(
                  "p-3 rounded-lg border-2 transition-all text-left",
                  feedbackType === type.id 
                    ? `border-primary ${type.bgColor}` 
                    : "border-muted hover:border-primary/50"
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  <type.icon className={cn("h-4 w-4", type.color)} />
                  <span className="text-sm font-medium">{type.label}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Avaliação (apenas para sugestões e elogios) */}
        {(feedbackType === 'suggestion' || feedbackType === 'compliment') && (
          <div>
            <label className="text-sm font-medium mb-3 block">
              Como você avalia nossa plataforma?
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star as Rating)}
                  className="p-1 hover:scale-110 transition-transform"
                >
                  <Star 
                    className={cn(
                      "h-6 w-6 transition-colors",
                      rating && rating >= star 
                        ? "text-yellow-500 fill-yellow-500" 
                        : "text-muted-foreground"
                    )} 
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Título */}
          <div>
            <label htmlFor="title" className="text-sm font-medium mb-2 block">
              Título *
            </label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={`Resumo do seu ${selectedType.label.toLowerCase()}`}
              maxLength={100}
              autoFocus
              aria-label="Título do feedback"
            />
            <div className="text-xs text-muted-foreground mt-1">
              {title.length}/100
            </div>
          </div>

          {/* Descrição */}
          <div>
            <label htmlFor="description" className="text-sm font-medium mb-2 block">
              Descrição *
            </label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva detalhadamente..."
              rows={4}
              maxLength={500}
            />
            <div className="text-xs text-muted-foreground mt-1">
              {description.length}/500
            </div>
          </div>

          {/* Email (opcional) */}
          <div>
            <label htmlFor="email" className="text-sm font-medium mb-2 block">
              Email (opcional)
            </label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Para respondermos você"
            />
            <div className="text-xs text-muted-foreground mt-1">
              Só entraremos em contato se necessário
            </div>
          </div>

          {/* Context info */}
          {context && (
            <div className="p-3 bg-muted/50 rounded-lg">
              <div className="text-xs text-muted-foreground">
                📍 Contexto: <Badge variant="outline" className="text-xs">{context}</Badge>
              </div>
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !description.trim()}
              className="flex-1 gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  Enviar
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
