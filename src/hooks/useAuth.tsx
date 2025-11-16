import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { useNavigate } from 'react-router-dom';
import { getSecureItem } from '@/utils/secureStorage';
import { cleanupAuthState, forceReload } from '@/utils/authCleanup';
import { useTokenRotation } from '@/hooks/useTokenRotation';

export type UserRole = 'admin' | 'manager' | 'user';

export interface UserProfile {
  id: string;
  name: string;
  role: UserRole;
  budget_limit: number | null;
  budget_warning_enabled: boolean;
  budget_warning_days: number;
  advanced_features_enabled: boolean;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, userData: { name: string; role?: string }) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  updateEmail: (email: string) => Promise<{ error: Error | null }>;
  hasRole: (role: UserRole) => boolean;
  hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const { showSuccess, showError } = useToast();

  // Ativar rotação automática de tokens quando há sessão ativa
  useTokenRotation({
    refreshBeforeExpiry: 5, // Renovar 5 minutos antes de expirar
    checkInterval: 1,       // Verificar a cada minuto
    maxRetries: 3,
    onTokenRefreshed: (newToken: string) => {
      console.log('🔄 Token renovado automaticamente');
    },
    onRefreshFailed: (error: Error) => {
      console.error('❌ Falha na renovação automática do token:', error.message);
      showError({ title: 'Erro de autenticação', description: 'Sessão expirada. Faça login novamente.' });
    }
  });

  // Profile query using React Query
  const { data: profile } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        return null;
      }
      return data as UserProfile;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  // Gerar fingerprint simples para dispositivo
  const generateDeviceFingerprint = () => {
    const data = {
      screen: `${screen.width}x${screen.height}`,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      language: navigator.language,
      platform: navigator.platform
    };
    return btoa(JSON.stringify(data)).slice(0, 32);
  };

  // Integração com sistema de sessão persistente do Supabase
  const manageSessionPersistence = async (session: Session) => {
    try {
      const deviceFingerprint = generateDeviceFingerprint();
      const { data: sessionData, error } = await supabase.rpc('manage_persistent_session', {
        p_device_fingerprint: deviceFingerprint,
        p_device_name: navigator.platform || 'Unknown Device',
        p_device_type: /Mobile|iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
        p_user_agent: navigator.userAgent,
        p_ip_address: null
      });
      
      if (!error && (sessionData as any)?.success) {
        console.log('✅ Sessão persistente configurada');
        
        // Marcar dispositivo como confiável após 3 logins
        const { data: trustData } = await supabase.rpc('trust_device', {
          p_device_fingerprint: deviceFingerprint
        });
        
        if ((trustData as any)?.success) {
          console.log('✅ Dispositivo marcado como confiável');
        }
      }
    } catch (error) {
      console.warn('⚠️ Erro ao configurar persistência:', error);
    }
  };

  // Inicialização simplificada e robusta do auth
  useEffect(() => {
    console.log('🔐 Iniciando AuthProvider...');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Verificando sessão existente...');
        
        // Tentar recuperar a sessão de forma simples
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro ao obter sessão:', error);
          // Em caso de erro, apenas limpar e continuar
          setSession(null);
          setUser(null);
        } else {
          console.log('📋 Sessão obtida:', !!session);
          setSession(session);
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
        // Em caso de erro crítico, apenas definir como não autenticado
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    // Chamar a inicialização imediatamente
    initializeAuth();

    // Listener SYNCHRONOUS para mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🔄 Auth state change:', event, !!session);

        // Atualizar estado SYNCHRONOUSLY - nunca async aqui!
        setSession(session);
        setUser(session?.user ?? null);

        // Processar eventos de forma assíncrona usando setTimeout
        if (event === 'SIGNED_OUT') {
          console.log('👋 Usuário deslogado');
          // Limpar qualquer estado restante
          setTimeout(() => {
            cleanupAuthState();
          }, 0);
        } else if (event === 'SIGNED_IN' && session?.user) {
          console.log('👋 Usuário logado');
          
          // Usar setTimeout para evitar deadlocks
          setTimeout(() => {
            // Verificar se precisa ir para verificação
            if (!session.user.email_confirmed_at) {
              console.log('📧 Email não confirmado, redirecionando para verificação');
              window.location.href = '/verify';
              return;
            }

            // Carregar perfil do usuário de forma simples
            supabase
              .from('user_profiles')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle()
              .then(({ data: existingProfile, error }) => {
                if (error) {
                  console.error('❌ Erro ao buscar perfil:', error);
                  return;
                }
                if (!existingProfile) {
                  console.log('📝 Criando novo perfil...');
                  supabase
                    .from('user_profiles')
                    .insert({
                      id: session.user.id,
                      name: session.user.user_metadata?.name || session.user.email || 'Usuário',
                      role: 'user'
                    })
                    .then(({ error: insertError }) => {
                      if (insertError) {
                        console.error('❌ Erro ao criar perfil:', insertError);
                      }
                    });
                }
              });
          }, 0);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Fazendo login...');
      
      // Limpar estado anterior antes do login
      cleanupAuthState();
      
      // Tentar deslogar globalmente primeiro (previne estados conflitantes)
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignorar erros de signOut
      }
      
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('❌ Erro no login:', signInError);
        const errorMessage = signInError.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos'
          : signInError.message;
        
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          showError({
            title: 'Erro no login',
            description: errorMessage,
          });
        }, 0);
        return { error: signInError };
      }

      if (signInData.user && signInData.session) {
        console.log('✅ Login bem-sucedido');
        
        // Verificar se perfil existe
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', signInData.user.id)
          .maybeSingle();

        if (profileError || !profileData) {
          console.error('❌ Perfil não encontrado');
          await supabase.auth.signOut();
          // Use setTimeout to avoid setState during render
          setTimeout(() => {
            showError({
              title: 'Erro no login',
              description: 'Perfil de usuário não encontrado. Contate o suporte.',
            });
          }, 0);
          return { error: profileError || new Error('Profile not found') };
        }

        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          showSuccess({
            title: 'Login realizado!',
            description: 'Bem-vindo de volta!'
          });
        }, 0);
        
        // Force page reload para garantir estado limpo
        forceReload(1000);
      }
      
      return { error: null };
    } catch (error) {
      console.error('❌ Erro inesperado no login:', error);
      // Use setTimeout to avoid setState during render
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro durante o login. Tente novamente.'
        });
      }, 0);
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: { name: string; role?: string }) => {
    try {
      // Limpar estado anterior
      cleanupAuthState();
      
      // Tentar deslogar globalmente primeiro
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        // Ignorar erros
      }
      
      const redirectUrl = `${window.location.origin}/verify`;
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: userData.name,
            role: userData.role || 'user'
          }
        }
      });
      
      if (error) {
        const errorMessage = error.message === 'User already registered'
          ? 'Usuário já cadastrado'
          : error.message;
          
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showError({
            title: 'Erro no cadastro',
            description: errorMessage,
          });
        }, 0);
      } else {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showSuccess({
            title: 'Cadastro realizado!',
            description: 'Verifique seu email para confirmar a conta.',
            duration: 6000
          });
        }, 0);
      }
      
      return { error };
    } catch (error) {
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro durante o cadastro. Tente novamente.'
        });
      }, 0);
      return { error };
    }
  };

  const requestPasswordReset = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/verify`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showError({
            title: 'Erro ao solicitar',
            description: "Não foi possível enviar o link. Verifique o e-mail e tente novamente.",
          });
        }, 0);
      } else {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showSuccess({
            title: 'Link enviado!',
            description: 'Se o e-mail estiver cadastrado, um link de redefinição foi enviado. Se não encontrar o email na caixa de entrada, verifique também a pasta de spam/lixo eletrônico.',
            duration: 8000,
          });
        }, 0);
      }
      return { error };
    } catch (error) {
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao solicitar a redefinição. Tente novamente.',
        });
      }, 0);
      return { error };
    }
  };

  const updatePassword = async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showError({
            title: 'Erro ao atualizar senha',
            description: error.message,
          });
        }, 0);
      } else {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showSuccess({
            title: 'Senha atualizada!',
            description: 'Sua senha foi alterada com sucesso.',
          });
        }, 0);
      }
      return { error };
    } catch (error) {
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao atualizar sua senha. Tente novamente.',
        });
      }, 0);
      return { error };
    }
  };

  const updateEmail = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/verify`;
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: redirectUrl }
      );

      if (error) {
        const errorMessage = error.message === 'New email address should be different from the current one.'
          ? 'O novo email deve ser diferente do atual.'
          : error.message;
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showError({
            title: 'Erro ao atualizar email',
            description: errorMessage,
          });
        }, 0);
      } else {
        // Use setTimeout to avoid calling toast during render
        setTimeout(() => {
          showSuccess({
            title: 'Confirmação enviada!',
            description: 'Verifique seu novo email para confirmar a alteração. Se não encontrar o email na caixa de entrada, verifique também a pasta de spam/lixo eletrônico.',
            duration: 8000,
          });
        }, 0);
      }
      return { error };
    } catch (error) {
      // Use setTimeout to avoid calling toast during render
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao atualizar seu email. Tente novamente.',
        });
      }, 0);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      console.log('🚪 Fazendo logout...');
      
      // Limpar estado primeiro
      cleanupAuthState();
      
      // Tentar logout global
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch (err) {
        console.warn('⚠️ Erro no logout:', err);
      }
      
      console.log('✅ Logout realizado com sucesso');
      
      // Force page reload para garantir estado limpo
      forceReload(500);
    } catch (error) {
      console.error('❌ Erro no logout:', error);
      // Mesmo com erro, force o reload para limpar estado
      forceReload(500);
    }
  };

  const hasRole = (role: UserRole): boolean => {
    if (!profile) return false;
    
    const roleHierarchy: Record<UserRole, number> = {
      user: 1,
      manager: 2,
      admin: 3,
    };
    
    return roleHierarchy[profile.role] >= roleHierarchy[role];
  };

  const hasPermission = (permission: string): boolean => {
    if (!profile) return false;
    
    const permissions: Record<UserRole, string[]> = {
      user: ['view_own_budgets', 'create_budgets', 'edit_own_budgets'],
      manager: ['view_all_budgets', 'manage_clients', 'view_reports'],
      admin: ['manage_users', 'manage_system', 'view_analytics'],
    };
    
    const userPermissions: string[] = [];
    Object.entries(permissions).forEach(([role, perms]) => {
      if (hasRole(role as UserRole)) {
        userPermissions.push(...perms);
      }
    });
    
    return userPermissions.includes(permission);
  };

  const value = {
    user,
    session,
    profile,
    loading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    requestPasswordReset,
    updatePassword,
    updateEmail,
    hasRole,
    hasPermission,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};