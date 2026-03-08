import { Building2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { Button } from '@/components/ui/button';

export interface CompanyData {
  name: string;
  cnpj: string;
  email: string;
  whatsapp_phone: string;
  address: string;
}

interface Props {
  onNext: (data: CompanyData) => void;
  onSkip: () => void;
}

export const OnboardingCompany = ({ onNext, onSkip }: Props) => {
  const [form, setForm] = useState<CompanyData>({
    name: '',
    cnpj: '',
    email: '',
    whatsapp_phone: '',
    address: '',
  });

  const set = (key: keyof CompanyData, value: string) =>
    setForm(prev => ({ ...prev, [key]: value }));

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="space-y-6"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
          <Building2 className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Marca da Empresa</h2>
          <p className="text-sm text-muted-foreground">Configure as informações da sua empresa</p>
        </div>
      </div>

      <div className="bg-muted/20 border border-border/30 rounded-2xl p-5 space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Nome da empresa *</label>
          <Input placeholder="Minha Assistência Técnica" value={form.name} onChange={e => set('name', e.target.value)} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">CNPJ</label>
            <Input placeholder="00.000.000/0000-00" value={form.cnpj} onChange={e => set('cnpj', e.target.value)} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">WhatsApp</label>
            <Input placeholder="(00) 00000-0000" value={form.whatsapp_phone} onChange={e => set('whatsapp_phone', e.target.value)} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">E-mail</label>
          <Input type="email" placeholder="contato@empresa.com" value={form.email} onChange={e => set('email', e.target.value)} />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Endereço</label>
          <Input placeholder="Rua, número, bairro, cidade" value={form.address} onChange={e => set('address', e.target.value)} />
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 rounded-xl" onClick={onSkip}>
          Pular
        </Button>
        <button
          onClick={() => onNext(form)}
          className="btn-premium flex-1 h-11 rounded-xl font-semibold"
          disabled={!form.name.trim()}
        >
          Continuar
        </button>
      </div>
    </motion.div>
  );
};
