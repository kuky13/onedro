import { openWhatsApp } from '@/utils/whatsappUtils';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Shield, MessageCircle, Lock, Mail, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export const SecuritySettingsLite = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const items = [
    {
      icon: Mail,
      color: 'text-blue-400',
      bg: 'bg-blue-500/10',
      label: 'Alterar E-mail',
      desc: 'Altere o endereço do email',
      action: () => navigate('/reset-email'),
      btnLabel: 'Alterar',
    },
    {
      icon: Lock,
      color: 'text-primary',
      bg: 'bg-primary/10',
      label: 'Alterar Senha',
      desc: 'Redefinir senha da conta',
      action: () => navigate('/reset-password'),
      btnLabel: 'Alterar',
    },
    {
      icon: MessageCircle,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10',
      label: 'Suporte WhatsApp',
      desc: 'Entre em contato pelo WhatsApp',
      action: () => openWhatsApp('https://wa.me/556496028022'),
      btnLabel: 'Abrir',
    },
  ];

  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          Segurança
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.map((item) => (
          <button
            key={item.label}
            onClick={item.action}
            className="w-full flex items-center gap-3 p-3 rounded-xl bg-secondary/30 hover:bg-secondary/60 transition-colors text-left"
          >
            <div className={`h-9 w-9 rounded-lg ${item.bg} flex items-center justify-center shrink-0`}>
              <item.icon className={`h-4 w-4 ${item.color}`} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}

        {/* Logout */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="w-full flex items-center gap-3 p-3 rounded-xl bg-destructive/5 hover:bg-destructive/10 transition-colors text-left mt-2">
              <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
                <LogOut className="h-4 w-4 text-destructive" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-destructive">Sair da Conta</p>
                <p className="text-xs text-destructive/60">Fazer logout da aplicação</p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/40 shrink-0" />
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Saída</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza de que deseja sair da sua conta? Você precisará fazer login novamente.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={signOut} className="bg-destructive hover:bg-destructive/90 rounded-xl">
                Sair
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
