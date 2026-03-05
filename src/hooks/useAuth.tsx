import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/useToast';
import { cleanupAuthState, forceReload } from '@/utils/authCleanup';
import { useTokenRotation } from '@/hooks/useTokenRotation';

const devLog = (...args: any[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

const devWarn = (...args: any[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};

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
    onTokenRefreshed: () => {
      devLog('🔄 Token renovado automaticamente');
    },
    onRefreshFailed: (error: Error) => {
      console.error('❌ Falha na renovação automática do token:', error.message);
      showError({ title: 'Erro de autenticação', description: 'Sessão expirada. Faça login novamente.' });
    }
  });

  // Profile query using React Query
  const { data: profileData } = useQuery({
    queryKey: ['user-profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (error) {
          if (error.message && !error.message.includes('aborted')) {
            console.warn('⚠️ Erro ao buscar perfil (possível falha de rede ou tabela ausente):', error.message);
          }
          return null;
        }
        return data as UserProfile;
      } catch (err: any) {
        if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
          console.warn('⚠️ Erro silencioso no fetch de perfil:', err);
        }
        return null;
      }
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
    retry: 1, // Reduzir retries para evitar spam de erros 404/net::ERR_ABORTED
  });

  const profile: UserProfile | null = profileData ?? null;

  // ... keep existing code (device fingerprint / persistent session helpers removed - unused)


  // Inicialização simplificada e robusta do auth
  useEffect(() => {
    // Flag para evitar múltiplas execuções se o componente desmontar
    let mounted = true;

    devLog('🔐 Iniciando AuthProvider...');
    
    const initializeAuth = async () => {
      try {
        devLog('🔍 Verificando sessão existente...');
        
        // Tentar recuperar a sessão de forma simples
        const { data, error } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (error) {
          // Em caso de erro de rede ou auth abortado, apenas tratar silenciosamente
          // Isso evita o erro "net::ERR_ABORTED" visível se a requisição for cancelada
          if (error.message && !error.message.includes('aborted')) {
             devWarn('⚠️ Sessão não recuperada (provavelmente não logado ou rede):', error.message);
          }
          setSession(null);
          setUser(null);
        } else {
          devLog('📋 Sessão obtida:', !!data.session);
          setSession(data.session);
          setUser(data.session?.user ?? null);
        }
      } catch (error: any) {
        // Captura genérica de erros para não quebrar a aplicação
        if (mounted) {
          devWarn('⚠️ Erro não crítico na inicialização do auth:', error?.message || error);
          setSession(null);
          setUser(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
          setIsInitialized(true);
        }
      }
    };

    // Chamar a inicialização imediatamente
    initializeAuth();

    // Listener SYNCHRONOUS para mudanças de estado de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!mounted) return;
        
        devLog('🔄 Auth state change:', event, !!session);

        // Atualizar estado SYNCHRONOUSLY - nunca async aqui!
        setSession(session);
        setUser(session?.user ?? null);

        // Processar eventos de forma assíncrona usando setTimeout
        if (event === 'SIGNED_OUT') {
          devLog('👋 Usuário deslogado');
          // Limpar qualquer estado restante
          setTimeout(() => {
            cleanupAuthState();
          }, 0);
        } else if (event === 'SIGNED_IN' && session?.user) {
          devLog('👋 Usuário logado');
          
          // Usar setTimeout para evitar deadlocks
          setTimeout(() => {
            // Verificar se precisa ir para verificação
            if (!session.user.email_confirmed_at) {
              devLog('📧 Email não confirmado, redirecionando para verificação');
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
                  devLog('📝 Criando novo perfil...');
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

    return () => {
      subscription.unsubscribe();
      mounted = false;
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<{ error: Error | null }> => {
    try {
      devLog('🔑 Fazendo login...');

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
        devLog('✅ Login bem-sucedido');

        // Verificar se perfil existe
        const { data: profileData, error: profileError } = await supabase
          .from('user_profiles')
          .select('id')
          .eq('id', signInData.user.id)
          .maybeSingle();

        if (profileError || !profileData) {
          // Se for um erro de aborto, não deslogar nem tratar como erro de perfil ausente
          if (profileError?.name === 'AbortError' || profileError?.message?.includes('aborted')) {
            devLog('⏳ Busca de perfil abortada (provavelmente por reload), aguardando...');
            return { error: null };
          }

          if (profileError) {
            console.error('❌ Erro na busca de perfil:', profileError.message);
          } else if (!profileData) {
            console.error('❌ Perfil não encontrado para o usuário:', signInData.user.id);
            
            // Tentar criar o perfil automaticamente se estiver faltando
            devLog('📝 Criando perfil ausente durante o login...');
            const { error: insertError } = await supabase
              .from('user_profiles')
              .insert({
                id: signInData.user.id,
                name: signInData.user.user_metadata?.name || signInData.user.email || 'Usuário',
                role: 'user'
              });
            
            if (insertError) {
              console.error('❌ Falha ao auto-criar perfil:', insertError.message);
              await supabase.auth.signOut();
              setTimeout(() => {
                showError({
                  title: 'Erro no login',
                  description: 'Não foi possível criar seu perfil. Contate o suporte.',
                });
              }, 0);
              return { error: insertError };
            }
            
            devLog('✅ Perfil criado com sucesso durante o login');
          }
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
    } catch (err: any) {
      if (err?.name !== 'AbortError' && !err?.message?.includes('aborted')) {
        console.error('❌ Erro inesperado no login:', err);
        // Use setTimeout to avoid setState during render
        setTimeout(() => {
          showError({
            title: 'Erro inesperado',
            description: 'Ocorreu um erro durante o login. Tente novamente.'
          });
        }, 0);
      }

      const error = err instanceof Error ? err : new Error('Erro desconhecido');
      return { error };
    }
  };

  const signUp = async (
    email: string,
    password: string,
    userData: { name: string; role?: string }
  ): Promise<{ error: Error | null }> => {
    try {
      // Limpar estado anterior
      cleanupAuthState();

      // Tentar deslogar globalmente primeiro
      try {
        await supabase.auth.signOut({ scope: 'global' });
      } catch {
        // Ignorar erros
      }

      const redirectUrl = `${window.location.origin}/verify`;

      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            name: userData.name,
            role: userData.role || 'user',
          },
        },
      });

      if (signUpError) {
        const errorMessage =
          signUpError.message === 'User already registered'
            ? 'Usuário já cadastrado'
            : signUpError.message;

        setTimeout(() => {
          showError({
            title: 'Erro no cadastro',
            description: errorMessage,
          });
        }, 0);

        return { error: signUpError };
      }

      setTimeout(() => {
        showSuccess({
          title: 'Cadastro realizado!',
          description: 'Verifique seu email para confirmar a conta.',
          duration: 6000,
        });
      }, 0);

      return { error: null };
    } catch (err) {
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro durante o cadastro. Tente novamente.',
        });
      }, 0);

      const normalizedError = err instanceof Error ? err : new Error('Erro desconhecido');
      return { error: normalizedError };
    }
  };

  const requestPasswordReset = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/verify`;
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (resetError) {
        setTimeout(() => {
          showError({
            title: 'Erro ao solicitar',
            description: "Não foi possível enviar o link. Verifique o e-mail e tente novamente.",
          });
        }, 0);
        return { error: resetError };
      }

      setTimeout(() => {
        showSuccess({
          title: 'Link enviado!',
          description:
            'Se o e-mail estiver cadastrado, um link de redefinição foi enviado. Se não encontrar o email na caixa de entrada, verifique também a pasta de spam/lixo eletrônico.',
          duration: 8000,
        });
      }, 0);

      return { error: null };
    } catch (err) {
      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao solicitar a redefinição. Tente novamente.',
        });
      }, 0);

      const normalizedError = err instanceof Error ? err : new Error('Erro desconhecido');
      return { error: normalizedError };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setTimeout(() => {
          showError({
            title: 'Erro ao atualizar senha',
            description: error.message,
          });
        }, 0);
        return { error };
      }

      setTimeout(() => {
        showSuccess({
          title: 'Senha atualizada!',
          description: 'Sua senha foi alterada com sucesso.',
        });
      }, 0);

      return { error: null };
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));

      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao atualizar sua senha. Tente novamente.',
        });
      }, 0);

      return { error: normalizedError };
    }
  };

  const updateEmail = async (email: string): Promise<{ error: Error | null }> => {
    try {
      const redirectUrl = `${window.location.origin}/verify`;
      const { error } = await supabase.auth.updateUser(
        { email },
        { emailRedirectTo: redirectUrl }
      );

      if (error) {
        const errorMessage =
          error.message === 'New email address should be different from the current one.'
            ? 'O novo email deve ser diferente do atual.'
            : error.message;

        setTimeout(() => {
          showError({
            title: 'Erro ao atualizar email',
            description: errorMessage,
          });
        }, 0);

        return { error };
      }

      setTimeout(() => {
        showSuccess({
          title: 'Confirmação enviada!',
          description:
            'Enviamos links de confirmação. Por segurança, você pode precisar confirmar a alteração tanto no seu email atual quanto no novo. Verifique ambas as caixas de entrada (e pastas de spam).',
          duration: 10000,
        });
      }, 0);

      return { error: null };
    } catch (err) {
      const normalizedError = err instanceof Error ? err : new Error(String(err));

      setTimeout(() => {
        showError({
          title: 'Erro inesperado',
          description: 'Ocorreu um erro ao atualizar seu email. Tente novamente.',
        });
      }, 0);

      return { error: normalizedError };
    }
  };

  const signOut = async () => {
    try {
      devLog('🚪 Fazendo logout...');
      
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