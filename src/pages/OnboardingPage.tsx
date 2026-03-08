import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { OnboardingWelcome } from '@/components/onboarding/OnboardingWelcome';
import { OnboardingDrippy } from '@/components/onboarding/OnboardingDrippy';
import { OnboardingSupport } from '@/components/onboarding/OnboardingSupport';
import { OnboardingProfile } from '@/components/onboarding/OnboardingProfile';
import { OnboardingCompany, type CompanyData } from '@/components/onboarding/OnboardingCompany';
import { OnboardingTechnician, type TechnicianData } from '@/components/onboarding/OnboardingTechnician';
import { OnboardingStore, type StoreData } from '@/components/onboarding/OnboardingStore';
import { OnboardingComplete } from '@/components/onboarding/OnboardingComplete';

const TOTAL_STEPS = 8;

export const OnboardingPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const markComplete = useCallback(async () => {
    if (!user) return;
    await supabase
      .from('user_profiles')
      .update({ onboarding_completed: true } as any)
      .eq('id', user.id);
  }, [user]);

  const finish = useCallback(async () => {
    await markComplete();
    navigate('/dashboard', { replace: true });
  }, [markComplete, navigate]);

  const skipAll = useCallback(async () => {
    await markComplete();
    navigate('/dashboard', { replace: true });
  }, [markComplete, navigate]);

  const next = () => setStep(s => Math.min(s + 1, TOTAL_STEPS));

  // Step handlers
  const handleProfile = async (data: { name: string; username: string }) => {
    if (!user) return;
    try {
      await supabase
        .from('user_profiles')
        .update({ name: data.name, username: data.username })
        .eq('id', user.id);
      setCompletedSteps(p => [...p, 'Perfil pessoal']);
    } catch { /* silent */ }
    next();
  };

  const handleCompany = async (data: CompanyData) => {
    if (!user) return;
    try {
      const { data: existing } = await supabase
        .from('company_info')
        .select('id')
        .eq('owner_id', user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from('company_info').update({
          name: data.name,
          cnpj: data.cnpj || null,
          email: data.email || null,
          whatsapp_phone: data.whatsapp_phone || null,
          address: data.address || null,
        }).eq('id', existing.id);
      } else {
        await supabase.from('company_info').insert({
          owner_id: user.id,
          name: data.name,
          cnpj: data.cnpj || null,
          email: data.email || null,
          whatsapp_phone: data.whatsapp_phone || null,
          address: data.address || null,
        });
      }
      setCompletedSteps(p => [...p, 'Empresa configurada']);
    } catch { /* silent */ }
    next();
  };

  const handleTechnician = async (data: TechnicianData) => {
    if (!user) return;
    try {
      await (supabase.from('repair_technicians') as any).insert({
        user_id: user.id,
        name: data.name,
        commission_percentage: data.commission_percentage ? Number(data.commission_percentage) : 0,
      });
      setCompletedSteps(p => [...p, `Técnico: ${data.name}`]);
    } catch { /* silent */ }
    next();
  };

  const handleStore = async (data: StoreData | null) => {
    if (!data) {
      next();
      return;
    }
    if (!user) return;
    try {
      await supabase.from('stores').insert({
        owner_id: user.id,
        name: data.name,
        slug: data.slug,
        description: data.description || null,
      });
      setCompletedSteps(p => [...p, `Loja: ${data.name}`]);
    } catch (e: any) {
      if (e?.message?.includes('duplicate')) {
        toast.error('Esse slug de loja já existe. Escolha outro.');
        return;
      }
    }
    next();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg space-y-8">
        {step > 1 && step < TOTAL_STEPS && (
          <OnboardingProgress currentStep={step} totalSteps={TOTAL_STEPS} />
        )}

        <AnimatePresence mode="wait">
          {step === 1 && <OnboardingWelcome key="welcome" onNext={next} onSkipAll={skipAll} />}
          {step === 2 && <OnboardingProfile key="profile" onNext={handleProfile} onSkip={next} />}
          {step === 3 && <OnboardingCompany key="company" onNext={handleCompany} onSkip={next} />}
          {step === 4 && <OnboardingTechnician key="tech" onNext={handleTechnician} onSkip={next} />}
          {step === 5 && <OnboardingStore key="store" onNext={handleStore} onSkip={next} />}
          {step === 6 && <OnboardingComplete key="done" onFinish={finish} completedSteps={completedSteps} />}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default OnboardingPage;
