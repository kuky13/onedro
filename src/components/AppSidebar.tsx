import { useAuth } from '@/hooks/useAuth';
import { useResponsive } from '@/hooks/useResponsive';
import { cn } from '@/lib/utils';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from '@/components/ui/sidebar';
import { Plus, HelpCircle, Home } from 'lucide-react';

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