import { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

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
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: { name: string; role?: string }) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  updateEmail: (email: string) => Promise<{ error: any }>;
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
  const [profile, setProfile] = useState<UserProfile | null>(null);

  // Buscar perfil do usuário 
  const fetchProfile = async (userId: string) => {
    try {
      console.log('🔍 Buscando perfil para:', userId);
      
      // Use the new RPC function to avoid RLS recursion
      const { data: profile, error } = await supabase
        .rpc('get_current_user_profile');

      if (error) {
        console.error('❌ Erro ao buscar perfil:', error);
        // Create a minimal profile if none exists
        const minimalProfile = {
          id: userId,
          name: 'Usuário',
          role: 'user' as UserRole,
          budget_limit: null,
          budget_warning_enabled: true,
          budget_warning_days: 7,
          advanced_features_enabled: false
        };
        setProfile(minimalProfile);
        return minimalProfile;
      }

      console.log('✅ Perfil encontrado:', profile);
      setProfile(profile);
      return profile;
    } catch (error) {
      console.error('❌ Erro ao buscar perfil:', error);
      // Create a minimal profile as fallback
      const minimalProfile = {
        id: userId,
        name: 'Usuário',
        role: 'user' as UserRole,
        budget_limit: null,
        budget_warning_enabled: true,
        budget_warning_days: 7,
        advanced_features_enabled: false
      };
      setProfile(minimalProfile);
      return minimalProfile;
    }
  };

  // Inicialização com busca de perfil
  useEffect(() => {
    console.log('🔐 Iniciando AuthProvider...');
    
    const initializeAuth = async () => {
      try {
        console.log('🔍 Verificando sessão existente...');
        
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('❌ Erro ao obter sessão:', error);
        } else {
          console.log('📋 Sessão obtida:', !!session);
          setSession(session);
          setUser(session?.user ?? null);
          
          // Fetch profile if user is logged in
          if (session?.user) {
            await fetchProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error('❌ Erro na inicialização:', error);
      } finally {
        setLoading(false);
        setIsInitialized(true);
      }
    };

    initializeAuth();

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 Auth state change:', event, !!session);
        
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          console.log('👋 Usuário logado');
          await fetchProfile(session.user.id);
        } else {
          console.log('👋 Usuário deslogado');
          setProfile(null);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    // Logging in
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string, userData: { name: string; role?: string }) => {
    // Signing up
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signOut = async () => {
    // Logging out
    await supabase.auth.signOut();
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const updateEmail = async (email: string) => {
    const { error } = await supabase.auth.updateUser({ email });
    return { error };
  };

  const hasRole = (role: UserRole) => {
    return profile?.role === role;
  };

  const hasPermission = (permission: string) => {
    return true; // Simplificado
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

  // AuthProvider rendering

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};