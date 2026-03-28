import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { Plus, HelpCircle, Home, MessageCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AppSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppSidebar = ({
  activeTab,
  onTabChange
}: AppSidebarProps) => {
  const { user, profile } = useAuth();
  const { state } = useSidebar();
  const { isDesktop } = useResponsive();
  const [handoffCount, setHandoffCount] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    const fetch = async () => {
      const { count } = await supabase
        .from('whatsapp_conversations')
        .select('*', { count: 'exact', head: true })
        .eq('owner_id', user.id)
        .eq('ai_paused', true)
        .eq('status', 'open');
      setHandoffCount(count || 0);
    };
    fetch();
    const channel = supabase
      .channel('sidebar-handoff')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whatsapp_conversations', filter: `owner_id=eq.${user.id}` }, fetch)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  if (!user) return null;

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: Home,
      description: 'Visão geral do sistema'
    },
    {
      id: 'worm',
      label: 'Worm System',
      icon: Plus,
      description: 'Sistema exclusivo de orçamentos',
      action: () => window.location.href = '/worm'
    },
    {
      id: 'whatsapp-crm',
      label: 'WhatsApp CRM',
      icon: MessageCircle,
      description: 'Atendimento e IA no WhatsApp',
      action: () => window.location.href = '/whatsapp-crm'
    },
    {
      id: 'help',
      label: 'Central de Ajuda',
      icon: HelpCircle,
      description: 'Suporte e documentação'
    }
  ];

  return (
    <Sidebar
      variant="sidebar"
      className={cn(
        "border-r border-border/40",
        state === 'collapsed' && isDesktop && "w-16"
      )}
    >
      <SidebarHeader className="border-b border-border/40 p-4">
        <div className="flex items-center gap-2">
          <img src="/lovable-uploads/logoo.png" alt="OneDrip" className="w-8 h-8 rounded-lg" />
          {state !== 'collapsed' && (
            <div>
              <h2 className="font-semibold text-sm">OneDrip</h2>
              <p className="text-xs text-muted-foreground truncate max-w-[120px]">
                {profile?.name || user.email}
              </p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.id}>
              <SidebarMenuButton
                onClick={item.action || (() => onTabChange(item.id))}
                isActive={activeTab === item.id}
                className={cn(
                  "w-full justify-start gap-3 p-3 rounded-lg transition-all",
                  "hover:bg-accent hover:text-accent-foreground",
                  activeTab === item.id && "bg-primary text-primary-foreground"
                )}
                tooltip={state === 'collapsed' ? item.label : ''}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {state !== 'collapsed' && (
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {item.description}
                    </div>
                  </div>
                )}
                {item.id === 'whatsapp-crm' && handoffCount > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground shrink-0">
                    {handoffCount > 99 ? '99+' : handoffCount}
                  </span>
                )}
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator className="my-4" />

        <div className="mt-auto p-4">
          {state !== 'collapsed' && (
            <div className="text-xs text-muted-foreground text-center">
              OneDrip System v2.0
            </div>
          )}
        </div>
      </SidebarContent>
    </Sidebar>
  );
};