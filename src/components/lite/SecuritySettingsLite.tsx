import { openWhatsApp } from '@/utils/whatsappUtils';
import { useNavigate } from 'react-router-dom';

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { MessageCircle, Lock, Mail, LogOut, KeyRound } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Separator } from '@/components/ui/separator';
import { SettingsGlassCard, SettingsRow } from '@/components/lite/settings/SettingsLitePrimitives';

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
    <SettingsGlassCard>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
            <KeyRound className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">Segurança</div>
            <div className="text-xs text-muted-foreground">Senha, e-mail e sessão</div>
          </div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      <div className="divide-y divide-border/30">
        {items.map((item) => (
          <SettingsRow
            key={item.label}
            icon={item.icon}
            title={item.label}
            description={item.desc}
            iconBgClassName={item.bg}
            iconClassName={item.color}
            onClick={item.action}
          />
        ))}
      </div>

      <div className="p-5">
        <div className="text-xs text-muted-foreground uppercase tracking-wide">Sessão</div>
        <div className="mt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button
                type="button"
                className="w-full rounded-2xl border border-destructive/25 bg-destructive/5 px-4 py-3 hover:bg-destructive/10 transition-colors text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-destructive/15 flex items-center justify-center shrink-0">
                    <LogOut className="h-[18px] w-[18px] text-destructive" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-destructive">Sair da conta</div>
                    <div className="text-xs text-destructive/70">Encerra sua sessão neste dispositivo</div>
                  </div>
                </div>
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmar saída</AlertDialogTitle>
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
        </div>
      </div>
    </SettingsGlassCard>
  );
};
