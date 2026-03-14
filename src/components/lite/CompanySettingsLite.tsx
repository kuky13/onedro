import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save, Check } from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { LogoUploadZone } from '@/components/logo/LogoUploadZone';

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
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Logo da Empresa</Label>
          <LogoUploadZone
            currentLogoUrl={companyInfo?.logo_url || ''}
            onUpload={handleLogoUpload}
            onRemove={() => updateCompanyInfo({ logo_url: '' })}
            isUploading={false}
            isRemoving={false}
          />
        </div>

        {[
          { id: 'name', label: 'Nome da Empresa', type: 'text', placeholder: 'Nome da sua empresa', value: formData.name, onChange: (v: string) => setFormData(p => ({ ...p, name: v })) },
          { id: 'cnpj', label: 'CNPJ', type: 'text', placeholder: '00.000.000/0000-00', value: formData.cnpj, onChange: (v: string) => setFormData(p => ({ ...p, cnpj: formatCNPJ(v) })), maxLength: 18 },
          { id: 'whatsapp_phone', label: 'WhatsApp', type: 'tel', placeholder: '(11) 99999-9999', value: formData.whatsapp_phone, onChange: (v: string) => setFormData(p => ({ ...p, whatsapp_phone: formatPhone(v) })), maxLength: 15 },
          { id: 'email', label: 'Email', type: 'email', placeholder: 'contato@empresa.com', value: formData.email, onChange: (v: string) => setFormData(p => ({ ...p, email: v })) },
        ].map((field) => (
          <div key={field.id} className="space-y-1.5">
            <Label htmlFor={field.id} className="text-xs text-muted-foreground">{field.label}</Label>
            <Input
              id={field.id}
              type={field.type}
              value={field.value}
              onChange={(e) => field.onChange(e.target.value)}
              placeholder={field.placeholder}
              maxLength={field.maxLength}
              className="rounded-xl"
            />
          </div>
        ))}

        <div className="space-y-1.5">
          <Label htmlFor="address" className="text-xs text-muted-foreground">Endereço</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(p => ({ ...p, address: e.target.value }))}
            placeholder="Endereço completo da empresa"
            rows={3}
            className="rounded-xl"
          />
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || loading}
          className="w-full rounded-xl"
          size="lg"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : success ? (
            <Check className="h-4 w-4 mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Salvando...' : success ? 'Salvo com sucesso!' : 'Salvar Informações'}
        </Button>
      </CardContent>
    </Card>
  );
};
