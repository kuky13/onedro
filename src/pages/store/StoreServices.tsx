import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStoreStore } from './useStoreStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Layers, Smartphone, Sparkles, Wrench } from 'lucide-react';
import { BrandsTab } from '@/components/store/BrandsTab';
import { ModelsTab } from '@/components/store/ModelsTab';
import { ServicesTab } from '@/components/store/ServicesTab';
import { AIAnalysisTab } from '@/components/store/AIAnalysisTab';

export default function StoreServices() {
  const { currentStore } = useStoreStore();
  const [activeTab, setActiveTab] = useState('ai');

  // State for data
  const [brands, setBrands] = useState<any[]>([]);
  const [devices, setDevices] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  // Selection state
  const [selectedBrand, setSelectedBrand] = useState<any>(null);
  const [selectedDevice, setSelectedDevice] = useState<any>(null);

  useEffect(() => {
    if (currentStore) {
      fetchBrands();
    }
  }, [currentStore]);

  useEffect(() => {
    if (selectedBrand) {
      fetchDevices(selectedBrand.id);
    } else {
      setDevices([]);
      setSelectedDevice(null);
    }
  }, [selectedBrand]);

  useEffect(() => {
    if (selectedDevice) {
      fetchServices(selectedDevice.id);
    } else {
      setServices([]);
    }
  }, [selectedDevice]);

  const fetchBrands = async () => {
    if (!currentStore) return;

    const { data } = await supabase.
    from('store_brands').
    select('*').
    eq('store_id', currentStore.id).
    order('name');
    setBrands(data || []);
  };

  const fetchDevices = async (brandId: string) => {
    const { data } = await supabase.
    from('store_devices').
    select('*').
    eq('brand_id', brandId).
    order('name');
    setDevices(data || []);
  };

  const fetchServices = async (deviceId: string) => {
    const { data } = await supabase.
    from('store_services').
    select('*').
    eq('device_id', deviceId).
    order('name');
    setServices(data || []);
  };

  const handleSelectBrandFromBrandsTab = (brand: any) => {
    setSelectedBrand(brand);
    setActiveTab('models');
  };

  const handleSelectDeviceFromModelsTab = (device: any) => {
    setSelectedDevice(device);
    setActiveTab('services');
  };

  if (!currentStore) {
    return (
      <div className="flex items-center justify-center h-[50vh] text-muted-foreground">
        <p>Carregando loja...</p>
      </div>);

  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Catálogo de Reparos</h2>
        <p className="text-muted-foreground">Gerencie marcas, modelos e serviços oferecidos</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:w-[500px]">
          <TabsTrigger value="ai" className="gap-2">
            <Sparkles className="h-4 w-4" />
            <span className="hidden sm:inline">IA</span>
          </TabsTrigger>
          <TabsTrigger value="brands" className="gap-2">
            <Layers className="h-4 w-4" />
            <span className="hidden sm:inline">Marcas</span>
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Modelos</span>
          </TabsTrigger>
          <TabsTrigger value="services" className="gap-2">
            <Wrench className="h-4 w-4" />
            <span className="hidden sm:inline">Serviços</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="mt-6">
          <AIAnalysisTab
            storeId={currentStore.id}
            onApplied={() => {
              fetchBrands();
            }} />

        </TabsContent>

        <TabsContent value="brands" className="mt-6">
          <BrandsTab
            storeId={currentStore.id}
            brands={brands}
            onRefresh={fetchBrands}
            onSelectBrand={handleSelectBrandFromBrandsTab} />

        </TabsContent>

        <TabsContent value="models" className="mt-6">
          <ModelsTab
            storeId={currentStore.id}
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            devices={devices}
            onRefresh={() => selectedBrand && fetchDevices(selectedBrand.id)}
            onSelectDevice={handleSelectDeviceFromModelsTab} />

        </TabsContent>

        <TabsContent value="services" className="mt-6">
          <ServicesTab
            storeId={currentStore.id}
            brands={brands}
            selectedBrand={selectedBrand}
            onSelectBrand={setSelectedBrand}
            devices={devices}
            selectedDevice={selectedDevice}
            onSelectDevice={setSelectedDevice}
            services={services}
            onRefresh={() => selectedDevice && fetchServices(selectedDevice.id)} />

        </TabsContent>
      </Tabs>
    </div>);

}
