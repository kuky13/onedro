import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building2, Save } from 'lucide-react';
import { useCompanyBranding } from '@/hooks/useCompanyBranding';
import { LogoUploadZone } from '@/components/logo/LogoUploadZone';

interface CompanySettingsLiteProps {
  userId: string;
  profile: any;
}

export const CompanySettingsLite = ({ userId, profile }: CompanySettingsLiteProps) => {
  const { 
    companyInfo, 
    loading, 
    updateCompanyInfo, 
    uploadLogo 
  } = useCompanyBranding();

  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    address: '',
    whatsapp_phone: '',
    email: ''
  });

  const [isSaving, setIsSaving] = useState(false);

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
  }, [companyInfo]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await updateCompanyInfo(formData);
    } catch (error) {
      console.error('Erro ao salvar:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = (file: File) => {
    return uploadLogo(file);
  };

  const formatCNPJ = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 14) {
      return numeric.replace(
        /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
        '$1.$2.$3/$4-$5'
      );
    }
    return numeric.substring(0, 14).replace(
      /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
      '$1.$2.$3/$4-$5'
    );
  };

  const handleCNPJChange = (value: string) => {
    const formatted = formatCNPJ(value);
    setFormData(prev => ({ ...prev, cnpj: formatted }));
  };

  const formatPhone = (value: string) => {
    const numeric = value.replace(/\D/g, '');
    if (numeric.length <= 11) {
      return numeric.replace(
        /^(\d{2})(\d{5})(\d{4})$/,
        '($1) $2-$3'
      );
    }
    return numeric.substring(0, 11).replace(
      /^(\d{2})(\d{5})(\d{4})$/,
      '($1) $2-$3'
    );
  };

  const handlePhoneChange = (value: string) => {
    const formatted = formatPhone(value);
    setFormData(prev => ({ ...prev, whatsapp_phone: formatted }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-lg">
          <Building2 className="h-5 w-5 mr-2 text-primary" />
          Informações da Empresa
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo Section */}
        <div className="space-y-2">
          <Label>Logo da Empresa</Label>
          <LogoUploadZone
            currentLogoUrl={companyInfo?.logo_url}
            onUpload={handleLogoUpload}
            onRemove={() => updateCompanyInfo({ logo_url: '' })}
            isUploading={false}
            isRemoving={false}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="name">Nome da Empresa</Label>
          <Input
            id="name"
            type="text"
            value={formData.name}
            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
            placeholder="Nome da sua empresa"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="cnpj">CNPJ</Label>
          <Input
            id="cnpj"
            type="text"
            value={formData.cnpj}
            onChange={(e) => handleCNPJChange(e.target.value)}
            placeholder="00.000.000/0000-00"
            maxLength={18}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address">Endereço</Label>
          <Textarea
            id="address"
            value={formData.address}
            onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
            placeholder="Endereço completo da empresa"
            rows={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="whatsapp_phone">WhatsApp</Label>
          <Input
            id="whatsapp_phone"
            type="tel"
            value={formData.whatsapp_phone}
            onChange={(e) => handlePhoneChange(e.target.value)}
            placeholder="(11) 99999-9999"
            maxLength={15}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
            placeholder="contato@empresa.com"
          />
        </div>

        <Button 
          onClick={handleSave} 
          disabled={isSaving || loading}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
          size="lg"
        >
          {isSaving ? (
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Salvando...' : 'Salvar Informações'}
        </Button>
      </CardContent>
    </Card>
  );
};