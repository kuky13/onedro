import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface MenuItem {
  id: string;
  label: string;
  icon: string;
  permission?: string;
  action?: () => void;
  href?: string;
  description?: string;
}

interface MenuData {
  items: MenuItem[];
  userInfo: {
    name: string;
    email: string;
    role: string;
  } | null;
}

export const useMobileMenu = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [menuData, setMenuData] = useState<MenuData>({
    items: [],
    userInfo: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const { profile, user, hasPermission, signOut } = useAuth();

  // Fetch menu data using native fetch()
  useEffect(() => {
    const fetchMenuData = async () => {
      setIsLoading(true);
      try {
        // Simulate API call - replace with real endpoint if needed
        await new Promise(resolve => setTimeout(resolve, 100));
        
        const menuItems: MenuItem[] = [
          {
            id: 'worm',
            label: 'Orçamentos',
            icon: 'Calculator',
            href: '/worm',
            description: 'Gerenciar orçamentos'
          },
          {
            id: 'service-orders',
            label: 'Ordens de Serviço',
            icon: 'FileText',
            href: '/service-orders',
            description: 'Gerenciar ordens de serviço'
          },
          {
            id: 'chat',
            label: 'Drippy IA',
            icon: 'Bot',
            href: '/chat',
            description: 'Conversar com a assistente IA'
          },
          {
            id: 'peliculas',
            label: 'Películas',
            icon: 'Smartphone',
            href: '/p',
            description: 'Consultar películas compatíveis'
          },
          {
            id: 'mensagens',
            label: 'Mensagens',
            icon: 'MessageSquare',
            href: '/msg',
            description: 'Central de mensagens'
          },
          {
            id: 'usuarios',
            label: 'Usuários',
            icon: 'Users',
            href: '/dashboard',
            description: 'Gerenciar usuários'
          },
          {
            id: 'configuracoes',
            label: 'Configurações',
            icon: 'Settings',
            href: '/settings',
            description: 'Configurações do sistema'
          },
          {
            id: 'worm-trash',
            label: 'Lixeira Orçamentos',
            icon: 'Trash2',
            href: '/worm/trash',
            description: 'Orçamentos excluídos'
          },
          {
            id: 'ordens-trash',
            label: 'Lixeira Ordens',
            icon: 'Trash2',
            href: '/service-orders/trash',
            description: 'Ordens de serviço excluídas'
          },
          {
            id: 'supadmin',
            label: 'Super Admin',
            icon: 'Shield',
            href: '/supadmin',
            description: 'Painel de administração',
            permission: 'admin'
          },
          {
            id: 'support',
            label: 'Suporte',
            icon: 'CircleHelp',
            href: '/suporte',
            description: 'Obter ajuda e suporte'
          }
        ];

        // Filter items based on permissions
        const filteredItems = menuItems.filter(item => 
          !item.permission || hasPermission(item.permission)
        );

        setMenuData({
          items: filteredItems,
          userInfo: {
            name: profile?.name || 'Usuário',
            email: user?.email || '',
            role: profile?.role || 'user'
          }
        });
      } catch (error) {
        console.error('Error fetching menu data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    // Only fetch if we have user data
    if (user) {
      fetchMenuData();
    }
  }, [profile?.name, profile?.role, user?.email, user?.id]); // Only depend on specific values that actually change

  const openMenu = () => setIsOpen(true);
  const closeMenu = () => setIsOpen(false);
  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLogout = async () => {
    closeMenu();
    await signOut();
  };

  return {
    isOpen,
    menuData,
    isLoading,
    openMenu,
    closeMenu,
    toggleMenu,
    handleLogout
  };
};