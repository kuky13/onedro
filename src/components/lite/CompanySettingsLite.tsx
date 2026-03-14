import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Check, Save } from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { LogoUploadZone } from '@/components/logo/LogoUploadZone';
import { SettingsGlassCard } from '@/components/lite/settings/SettingsLitePrimitives';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

interface CompanySettingsLiteProps {
  userId: string;
  profile: any;
}

export const CompanySettingsLite = ({ userId, profile }: CompanySettingsLiteProps) => {
  const { companyInfo, loading, updateCompanyInfo, uploadLogo } = useCompanyBranding();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    whatsapp_phone: '',
    email: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (companyInfo) {
      setFormData({
        name: companyInfo.name || '',
        cnpj: companyInfo.cnpj || '',
        address: companyInfo.address || '',
        whatsapp_phone: companyInfo.whatsapp_phone || '',
        email: companyInfo.email || ''
      });
    }
    void userId;
    void profile;
  }, [companyInfo, userId, profile]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCompanyInfo(formData);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (file: File) => uploadLogo(file);

  const formatCNPJ = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 14) {
      return numeric.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
    }
    return numeric.substring(0, 14).replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  };

  const formatPhone = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 11) {
      return numeric.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    }
    return numeric.substring(0, 11).replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  };

  return (
    <SettingsGlassCard>
      <div className="p-5">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Building2 className="h-[18px] w-[18px] text-primary" />
          </div>
          <div>
            <div className="text-base font-semibold text-foreground">Empresa</div>
            <div className="text-xs text-muted-foreground">Logo, contato e informações</div>
          </div>
        </div>

        <div className="mt-5 flex flex-col items-center">
          <LogoUploadZone
            currentLogoUrl={companyInfo?.logo_url || ''}
            onUpload={handleLogoUpload}
            onRemove={() => updateCompanyInfo({ logo_url: '' })}
            isUploading={false}
            isRemoving={false}
            cardClassName="rounded-full aspect-square w-28 max-w-none"
          />
          <div className="mt-2 text-xs text-muted-foreground">Toque para enviar um logo</div>
        </div>
      </div>

      <Separator className="bg-border/30" />

      <div className="p-5 space-y-4">
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="company-name" className="text-xs text-muted-foreground uppercase tracking-wide">Nome</Label>
            <Input
              id="company-name"
              value={formData.name}
              onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
              placeholder="Nome da sua empresa"
              className="h-11 rounded-xl bg-background/50 border-border/30"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="company-cnpj" className="text-xs text-muted-foreground uppercase tracking-wide">CNPJ</Label>
              <Input
                id="company-cnpj"
                value={formData.cnpj}
                onChange={(e) => setFormData((p) => ({ ...p, cnpj: formatCNPJ(e.target.value) }))}
                placeholder="00.000.000/0000-00"
                maxLength={18}
                className="h-11 rounded-xl bg-background/50 border-border/30"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="company-phone" className="text-xs text-muted-foreground uppercase tracking-wide">Telefone</Label>
              <Input
                id="company-phone"
                value={formData.whatsapp_phone}
                onChange={(e) => setFormData((p) => ({ ...p, whatsapp_phone: formatPhone(e.target.value) }))}
                placeholder="(11) 99999-9999"
                maxLength={15}
                className="h-11 rounded-xl bg-background/50 border-border/30"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-email" className="text-xs text-muted-foreground uppercase tracking-wide">Email</Label>
            <Input
              id="company-email"
              value={formData.email}
              onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
              placeholder="contato@empresa.com"
              className="h-11 rounded-xl bg-background/50 border-border/30"
              type="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="company-address" className="text-xs text-muted-foreground uppercase tracking-wide">Endereço</Label>
            <Textarea
              id="company-address"
              value={formData.address}
              onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
              placeholder="Endereço completo da empresa"
              rows={3}
              className="rounded-xl bg-background/50 border-border/30"
            />
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || loading}
          className={cn(
            'w-full rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:to-primary/70',
            success && 'from-emerald-500 to-emerald-500/80'
          )}
          size="lg"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Salvando...' : success ? 'Salvo' : 'Salvar'}
        </Button>
      </div>
    </SettingsGlassCard>
  );
};
