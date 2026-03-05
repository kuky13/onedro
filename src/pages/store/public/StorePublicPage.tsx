import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { Dialog, DialogContent, DialogTitle, DialogClose } from "@/components/ui/dialog";
import {
  CheckCircle,
  AlertCircle,
  Phone,
  MapPin,
  ShoppingBag,
  Search,
  Clock,
  ShieldCheck,
  ChevronRight,
  ChevronDown,
  Smartphone,
  AlertTriangle,
  X,
  ChevronLeft,
  Store,
  Wrench,
  MessageCircle,
  Send,
  Info,
  Tag } from
"lucide-react";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";
import { ProductDetailGallery } from "@/components/store/ProductDetailGallery";

// Glassmorphism style helper - uses store CSS variables
const glass = {
  backgroundColor: "color-mix(in srgb, var(--store-surface) 50%, transparent)",
  borderColor: "color-mix(in srgb, var(--store-border) 15%, transparent)",
} as any;

const glassStrong = {
  backgroundColor: "color-mix(in srgb, var(--store-surface) 70%, transparent)",
  borderColor: "color-mix(in srgb, var(--store-border) 20%, transparent)",
} as any;

interface StoreService {
  id: string;
  name: string;
  description: string | null;
  price: number;
  estimated_time_minutes: number | null;
  warranty_days: number | null;
  category: string;
  device_id?: string | null;
  max_installments?: number | null;
  interest_rate?: number | null;
  installment_price?: number | null;
}
interface StoreBrand {
  id: string;
  name: string;
}
interface StoreDevice {
  id: string;
  name: string;
  brand_id: string | null;
  chronic_issues?: string | null;
  image_url?: string | null;
}
interface ShopCategory {
  id: string;
  name: string;
}
interface ShopProduct {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  additional_images?: string[] | null;
  video_urls?: string[] | null;
  active: boolean | null;
  category_id: string | null;
  installment_price?: number | null;
  max_installments?: number | null;
}
const formatTime = (minutes: number) => {
  if (!minutes) return "-";
  if (minutes >= 1440 && minutes % 1440 === 0) {
    const days = minutes / 1440;
    return `${days} ${days === 1 ? 'dia' : 'dias'}`;
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMin = minutes % 60;
    const hoursLabel = `${hours}h`;
    return remainingMin > 0 ? `${hoursLabel} ${remainingMin}min` : hoursLabel;
  }
  return `${minutes} min`;
};
const formatWarranty = (days: number) => {
  if (!days) return "-";
  if (days >= 30 && days % 30 === 0) return `${days / 30} meses`;
  return `${days} dias`;
};

// Store public page component
export default function StorePublicPage() {
  const { slug } = useParams<{
    slug: string;
  }>();
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("home");
  const [searchTerm, setSearchTerm] = useState("");

  // Catalog State
  const [brands, setBrands] = useState<StoreBrand[]>([]);
  const [devices, setDevices] = useState<StoreDevice[]>([]);
  const [services, setServices] = useState<StoreService[]>([]);
  const [serviceDetailOpen, setServiceDetailOpen] = useState(false);
  const [serviceDetailData, setServiceDetailData] = useState<{
    service: StoreService;
    deviceName?: string;
  } | null>(null);

  // Shop State
  const [shopCategories, setShopCategories] = useState<ShopCategory[]>([]);
  const [shopProducts, setShopProducts] = useState<ShopProduct[]>([]);
  const [selectedShopCategory, setSelectedShopCategory] = useState<string | null>(null);
  const [selectedProductDetail, setSelectedProductDetail] = useState<ShopProduct | null>(null);

  // Selection State
  const [selectedBrand, setSelectedBrand] = useState<string | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<StoreDevice | null>(null);

  // Quote Form State
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    device: "",
    problem: ""
  });

  useEffect(() => {
    const fetchStore = async () => {
      if (!slug) return;
      try {
        const { data: storeData, error: storeError } = await supabase.
        from("stores").
        select("*").
        eq("slug", slug).
        maybeSingle();
        if (storeError) throw storeError;
        if (!storeData) {
          setError("Loja não encontrada");
          setLoading(false);
          return;
        }
        setStore(storeData);
        const { data: brandsData } = await supabase.
        from("store_brands").
        select("*").
        eq("store_id", storeData.id).
        order("name");
        setBrands(brandsData || []);
        const { data: devicesData } = await supabase.
        from("store_devices").
        select("*").
        eq("store_id", storeData.id).
        order("name");
        setDevices(devicesData || []);
        const { data: servicesData } = await supabase.
        from("store_services").
        select("*").
        eq("store_id", storeData.id).
        order("price");
        setServices(
          (servicesData || []).map((s: any) => ({
            ...s,
            price: s.price ?? 0
          }))
        );
        const { data: catData } = await supabase.
        from("shop_categories").
        select("*").
        eq("store_id", storeData.id).
        order("name");
        setShopCategories(catData || []);
        const { data: prodData } = await supabase.
        from("shop_products").
        select("*").
        eq("store_id", storeData.id).
        eq("active", true).
        order("name");
        setShopProducts(
          (prodData || []).map((p: any) => ({
            ...p,
            price: p.price ?? 0,
            active: p.active ?? true
          }))
        );
      } catch (err) {
        console.error(err);
        setError("Erro ao carregar loja");
      } finally {
        setLoading(false);
      }
    };
    fetchStore();
  }, [slug]);
  const selectProduct = (product: ShopProduct) => {
    setFormData((prev) => ({
      ...prev,
      device: "Compra de Produto",
      problem: `Interesse no produto: ${product.name}.\nPreço: R$ ${product.price}.\nDescrição: ${product.description || "-"}`
    }));
    setActiveTab("quote");
    setTimeout(() => {
      document.getElementById("quote-form")?.scrollIntoView({
        behavior: "smooth"
      });
    }, 100);
  };
  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.phone || !formData.device || !formData.problem) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("store_budgets").insert({
        store_id: store.id,
        customer_name: formData.name,
        customer_phone: formData.phone,
        device_model: formData.device,
        problem_description: formData.problem,
        status: "pending"
      });
      if (error) throw error;
      setSubmitted(true);
      toast.success("Solicitação enviada com sucesso!");
    } catch (err: any) {
      console.error(err);
      toast.error("Erro ao enviar solicitação. Tente novamente.");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleWhatsAppRedirect = (e: React.MouseEvent, product: ShopProduct) => {
    e.stopPropagation();
    const phone = store.contact_info?.whatsapp || store.contact_info?.phone;
    if (!phone) {
      selectProduct(product);
      return;
    }
    const cleanPhone = phone.replace(/\D/g, "");
    const template =
    store.theme_config?.whatsappMessageTemplate || "Olá, tenho interesse no produto {NOME}. Preço: {PRECO}";
    const formattedPrice = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL"
    }).format(product.price);
    let installmentsInfo = "";
    if ((product.max_installments || 1) > 1) {
      const installmentValue = (product.installment_price || product.price) / (product.max_installments || 1);
      const formattedInstallment = new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
      }).format(installmentValue);
      installmentsInfo = ` ou ${product.max_installments}x de ${formattedInstallment}`;
    }
    let message = template.
    replace(/{NOME}/g, product.name).
    replace(/{PRECO}/g, formattedPrice + installmentsInfo).
    replace(/{DESCRICAO}/g, product.description || "");
    if (!message.trim()) {
      message = `Tenho interesse nesse produto: ${product.name}`;
    }
    window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`, "_blank");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground text-sm">Carregando...</p>
        </div>
      </div>);
  }
  if (error || !store) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h1 className="text-xl font-bold text-foreground">{error || "Loja não encontrada"}</h1>
      </div>);
  }

  const filteredDevices = selectedBrand ?
  devices.filter((d) => d.brand_id === selectedBrand && d.name.toLowerCase().includes(searchTerm.toLowerCase())) :
  searchTerm ?
  devices.filter((d) => d.name.toLowerCase().includes(searchTerm.toLowerCase())) :
  [];
  const filteredBrands = searchTerm ?
  brands.filter((b) =>
  devices.some((d) => d.brand_id === b.id && d.name.toLowerCase().includes(searchTerm.toLowerCase()))
  ) :
  brands;
  const deviceServices = selectedDevice ? services.filter((s) => s.device_id === selectedDevice.id) : [];
  const filteredShopProducts = shopProducts.filter((p) => {
    const matchesCategory = selectedShopCategory ? p.category_id === selectedShopCategory : true;
    const matchesSearch = searchTerm ? p.name.toLowerCase().includes(searchTerm.toLowerCase()) : true;
    return matchesCategory && matchesSearch;
  });

  // Theme colors from store config
  const themeVars = {
    "--store-primary": store.theme_config?.primaryColor || "#fec832",
    "--store-secondary": store.theme_config?.secondaryColor || "#ffffff",
    "--store-background": store.theme_config?.backgroundColor || "#131313",
    "--store-surface": store.theme_config?.surfaceColor || "#242424",
    "--store-text": store.theme_config?.textColor || "#ffffff",
    "--store-icon": store.theme_config?.iconColor || store.theme_config?.primaryColor || "#fec832",
    "--store-border": store.theme_config?.borderColor || "#ffffff",
    "--store-muted": store.theme_config?.mutedColor || "#ffffff",
    "--store-danger": store.theme_config?.dangerColor || "#ef4444",
    "--store-warning": store.theme_config?.warningColor || "#ff0000",
    "--store-success": store.theme_config?.successColor || "#10b981",
    "--store-price": store.theme_config?.priceColor || "#ffffff"
  } as React.CSSProperties;

  return (
    <div
      className="min-h-screen font-sans selection:bg-primary/20"
      style={{
        ...themeVars,
        backgroundColor: "var(--store-background)",
        color: "var(--store-text)"
      }}>

      {/* Decorative Background Elements */}
      <div
        className="fixed inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 0%, var(--store-primary) 0%, transparent 40%)`
        }} />

      {/* Header — Glassmorphism */}
      <header
        className="sticky top-0 z-50 backdrop-blur-2xl border-b transition-all duration-300"
        style={{
          backgroundColor: "color-mix(in srgb, var(--store-background) 40%, transparent)",
          borderColor: "color-mix(in srgb, var(--store-border) 12%, transparent)"
        }}>

        <div className="max-w-3xl mx-auto px-4 h-16 sm:h-20 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {store.logo_url ?
            <img
              src={store.logo_url}
              alt={store.name}
              className="h-10 w-10 sm:h-12 sm:w-12 object-cover rounded-xl" /> :
            <div
              className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: "var(--store-primary)" }}>
                <Store className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: "var(--store-background)" }} />
              </div>
            }
            <span className="font-bold text-lg sm:text-xl truncate" style={{ color: "var(--store-text)" }}>
              {store.name}
            </span>
          </div>

          {/* Nav tabs — Glassmorphism pill */}
          <nav
            className="flex items-center gap-0.5 p-1 rounded-2xl overflow-hidden backdrop-blur-xl border"
            style={{
              backgroundColor: "color-mix(in srgb, var(--store-surface) 40%, transparent)",
              borderColor: "color-mix(in srgb, var(--store-border) 12%, transparent)"
            }}>

            {[
            { id: "home", label: "Início" },
            { id: "services", label: "Reparos" },
            ...(shopProducts.length > 0 ? [{ id: "shop", label: "Loja" }] : [])].
            map((tab) =>
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative inline-flex items-center justify-center h-8 px-4 text-xs font-semibold whitespace-nowrap rounded-xl transition-all duration-300 z-10 leading-none tracking-wide uppercase"
              style={{
                color: activeTab === tab.id ? "var(--store-background)" : "color-mix(in srgb, var(--store-text) 50%, transparent)"
              }}>

                {activeTab === tab.id &&
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 rounded-xl"
                style={{
                  backgroundColor: "var(--store-primary)",
                  boxShadow: "0 2px 12px color-mix(in srgb, var(--store-primary) 35%, transparent)"
                }}
                transition={{ type: "spring", bounce: 0.15, duration: 0.5 }} />
              }
                <span className="relative z-10 leading-none">{tab.label}</span>
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto pb-20 relative z-0">
        <AnimatePresence mode="wait">
          {/* Home Tab */}
          {activeTab === "home" &&
          <motion.div
            key="home"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="px-4 py-8 sm:py-12 space-y-10">

              {/* Hero removed */}
              <div className="text-center space-y-6">
                {shopProducts.length > 0 &&
              <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                  variant="outline"
                  onClick={() => setActiveTab("shop")}
                  className="rounded-full h-12 px-8 gap-2.5 border-2 hover:bg-transparent shadow-lg shadow-[var(--store-primary)]/10"
                  style={{
                    borderColor: "var(--store-primary)",
                    color: "var(--store-primary)",
                    backgroundColor: "transparent"
                  }}>
                      <ShoppingBag className="h-5 w-5" />
                      <span className="font-semibold">Ver Catálogo</span>
                    </Button>
                  </motion.div>
              }
              </div>

              {/* Services Section */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div
                    className="p-2 rounded-lg"
                    style={{ backgroundColor: "color-mix(in srgb, var(--store-primary) 15%, transparent)" }}>
                      <Wrench className="h-5 w-5" style={{ color: "var(--store-primary)" }} />
                    </div>
                    <h2 className="font-bold text-xl" style={{ color: "var(--store-text)" }}>
                      Assistência Técnica
                    </h2>
                  </div>
                </div>

                {/* Search — Glassmorphism */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-[var(--store-primary)]/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative">
                    <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors"
                    style={{ color: "var(--store-muted)" }} />
                    <Input
                    placeholder="Qual é o seu dispositivo?"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-14 rounded-2xl border backdrop-blur-xl transition-all duration-300 focus:ring-0"
                    style={{
                      ...glass,
                      color: "var(--store-text)"
                    }} />
                  </div>
                </div>

                {/* Breadcrumb */}
                <AnimatePresence>
                  {(selectedBrand || selectedDevice) &&
                <motion.div
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  className="flex flex-wrap items-center gap-2 text-sm px-1">
                      <button
                    onClick={() => {
                      setSelectedBrand(null);
                      setSelectedDevice(null);
                    }}
                    className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                    style={{ color: "var(--store-muted)" }}>
                        <Store className="h-3.5 w-3.5" />
                        Marcas
                      </button>
                      {selectedBrand &&
                  <>
                          <ChevronRight className="h-3 w-3 opacity-40" style={{ color: "var(--store-text)" }} />
                          <button
                      onClick={() => setSelectedDevice(null)}
                      className="font-medium hover:underline decoration-[var(--store-primary)] decoration-2 underline-offset-4"
                      style={{ color: selectedDevice ? "var(--store-muted)" : "var(--store-primary)" }}>
                            {brands.find((b) => b.id === selectedBrand)?.name}
                          </button>
                        </>
                  }
                      {selectedDevice &&
                  <>
                          <ChevronRight className="h-3 w-3 opacity-40" style={{ color: "var(--store-text)" }} />
                          <span
                      className="font-bold px-2 py-0.5 rounded-md"
                      style={{
                        color: "var(--store-primary)",
                        backgroundColor: "color-mix(in srgb, var(--store-primary) 10%, transparent)"
                      }}>
                            {selectedDevice.name}
                          </span>
                        </>
                  }
                    </motion.div>
                }
                </AnimatePresence>

                {/* Brands Grid — Glassmorphism cards */}
                {!selectedBrand && !selectedDevice &&
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                    {filteredBrands.map((brand) =>
                <motion.button
                  key={brand.id}
                  layout
                  onClick={() => setSelectedBrand(brand.id)}
                  whileHover={{ y: -4, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative p-4 rounded-2xl border backdrop-blur-xl flex flex-col items-center justify-center gap-3 overflow-hidden"
                  style={glass}>
                        <div className="absolute inset-0 bg-[var(--store-primary)]/0 group-hover:bg-[var(--store-primary)]/5 transition-colors duration-300" />
                        <div
                          className="p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all backdrop-blur-md"
                          style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 60%, transparent)" }}>
                          <Smartphone className="h-6 w-6" style={{ color: "var(--store-primary)" }} />
                        </div>
                        <span className="font-semibold text-sm tracking-wide" style={{ color: "var(--store-text)" }}>
                          {brand.name}
                        </span>
                      </motion.button>
                )}
                  </div>
              }

                {/* Devices Grid — Glassmorphism */}
                {selectedBrand && !selectedDevice &&
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {filteredDevices.map((device) =>
                <motion.button
                  key={device.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ x: 4 }}
                  onClick={() => setSelectedDevice(device)}
                  className="group p-4 rounded-2xl border backdrop-blur-xl text-left flex items-center justify-between transition-all"
                  style={glass}>
                        <div>
                          <span className="font-semibold text-base block mb-1" style={{ color: "var(--store-text)" }}>
                            {device.name}
                          </span>
                          <span
                      className="text-xs font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-text) 5%, transparent)",
                        color: "var(--store-muted)"
                      }}>
                            {services.filter((s) => s.device_id === device.id).length} serviços
                          </span>
                        </div>
                        <div
                    className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                    style={{ backgroundColor: "var(--store-primary)" }}>
                          <ChevronRight className="h-4 w-4" style={{ color: "var(--store-background)" }} />
                        </div>
                      </motion.button>
                )}
                    {filteredDevices.length === 0 &&
                <div className="col-span-full py-12 text-center opacity-60">
                        <Smartphone className="h-12 w-12 mx-auto mb-3" />
                        <p>Nenhum dispositivo encontrado</p>
                      </div>
                }
                  </div>
              }

                {/* Device Services — Glassmorphism */}
                {selectedDevice &&
              <div className="space-y-4">
                    {selectedDevice.chronic_issues &&
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-2xl border backdrop-blur-xl"
                  style={{
                    backgroundColor: "color-mix(in srgb, var(--store-warning) 8%, transparent)",
                    borderColor: "color-mix(in srgb, var(--store-warning) 20%, transparent)"
                  }}>
                        <div className="flex items-start gap-3">
                          <AlertTriangle
                      className="h-5 w-5 shrink-0 mt-0.5"
                      style={{ color: "var(--store-warning)" }} />
                          <div>
                            <p className="font-bold text-sm mb-1" style={{ color: "var(--store-warning)" }}>
                              Atenção
                            </p>
                            <p className="text-sm opacity-90" style={{ color: "var(--store-warning)" }}>
                              {selectedDevice.chronic_issues}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                }

                    {deviceServices.length > 0 ?
                <div className="grid gap-3">
                        {deviceServices.map((svc, idx) => {
                    const formattedPrice = new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL"
                    }).format(svc.price);
                    return (
                      <motion.div
                        key={svc.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}>
                              <button
                          onClick={() => {
                            setServiceDetailData({ service: svc, deviceName: selectedDevice.name });
                            setServiceDetailOpen(true);
                          }}
                          className="w-full p-4 sm:p-5 rounded-2xl border backdrop-blur-xl text-left transition-all hover:scale-[1.01] hover:shadow-lg group"
                          style={glass}>
                                <div className="flex justify-between items-start gap-4">
                                  <div className="space-y-1.5 flex-1">
                                    <h3
                                className="font-bold text-base sm:text-lg leading-tight"
                                style={{ color: "var(--store-text)" }}>
                                      {svc.name}
                                    </h3>
                                    {svc.description &&
                              <p
                                className="text-sm line-clamp-2 leading-relaxed opacity-80"
                                style={{ color: "var(--store-muted)" }}>
                                        {svc.description}
                                      </p>
                              }
                                    <div className="flex flex-wrap gap-2 mt-2 pt-1">
                                      {svc.warranty_days &&
                                <div
                                  className="flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md"
                                  style={{
                                    backgroundColor: "color-mix(in srgb, var(--store-text) 5%, transparent)",
                                    color: "var(--store-muted)"
                                  }}>
                                          <ShieldCheck className="h-3 w-3" /> {formatWarranty(svc.warranty_days)}
                                        </div>
                                }
                                      {svc.estimated_time_minutes &&
                                <div
                                  className="flex items-center gap-1 text-[10px] sm:text-xs font-medium px-2 py-1 rounded-md"
                                  style={{
                                    backgroundColor: "color-mix(in srgb, var(--store-text) 5%, transparent)",
                                    color: "var(--store-muted)"
                                  }}>
                                          <Clock className="h-3 w-3" /> {formatTime(svc.estimated_time_minutes)}
                                        </div>
                                }
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-2">
                                    <span
                                className="text-lg sm:text-xl font-bold tracking-tight"
                                style={{ color: "var(--store-price)" }}>
                                      {formattedPrice}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <div
                                  className="p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-2 group-hover:translate-x-0"
                                  style={{ backgroundColor: "var(--store-primary)" }}>
                                        <ChevronRight
                                    className="h-4 w-4"
                                    style={{ color: "var(--store-background)" }} />
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </motion.div>);
                  })}
                      </div> :
                <div
                  className="text-center py-12 rounded-2xl border border-dashed backdrop-blur-xl"
                  style={{ borderColor: "var(--store-border)" }}>
                        <Wrench className="h-10 w-10 mx-auto mb-3 opacity-30" />
                        <p style={{ color: "var(--store-muted)" }}>Nenhum serviço disponível para este modelo</p>
                      </div>
                }
                  </div>
              }
              </div>

              {/* Quote Form Section — Glassmorphism */}
              <div
              className="pt-8 border-t"
              style={{ borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}>
                <div className="max-w-xl mx-auto">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold mb-2" style={{ color: "var(--store-text)" }}>
                      Não encontrou o que precisa?
                    </h2>
                    <p style={{ color: "var(--store-muted)" }}>Solicite um orçamento personalizado</p>
                  </div>

                  <div
                  className="rounded-3xl border backdrop-blur-2xl overflow-hidden shadow-2xl"
                  id="quote-form"
                  style={glassStrong}>
                    <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[var(--store-primary)] to-transparent opacity-50" />
                    <div className="p-6 sm:p-8">
                      {submitted ?
                    <motion.div
                      initial={{ scale: 0.9, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="text-center py-8">
                          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 bg-gradient-to-br from-[var(--store-success)]/20 to-[var(--store-success)]/5">
                            <CheckCircle className="h-10 w-10" style={{ color: "var(--store-success)" }} />
                          </div>
                          <h3 className="font-bold text-2xl mb-3" style={{ color: "var(--store-text)" }}>
                            Recebemos seu pedido!
                          </h3>
                          <p className="text-sm mb-8 max-w-xs mx-auto" style={{ color: "var(--store-muted)" }}>
                            Nossa equipe analisará sua solicitação e entrará em contato o mais breve possível.
                          </p>
                          <Button
                        variant="outline"
                        onClick={() => {
                          setSubmitted(false);
                          setFormData({ name: "", phone: "", device: "", problem: "" });
                        }}
                        className="rounded-full px-8 border-2 hover:bg-transparent"
                        style={{ borderColor: "var(--store-border)", color: "var(--store-text)" }}>
                            Nova Solicitação
                          </Button>
                        </motion.div> :
                    <form onSubmit={handleQuoteSubmit} className="space-y-5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                            <div className="space-y-2">
                              <Label
                            htmlFor="name"
                            className="text-xs font-bold uppercase tracking-wider opacity-70"
                            style={{ color: "var(--store-text)" }}>
                                Nome
                              </Label>
                              <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="rounded-xl h-11 border backdrop-blur-md focus:border-[var(--store-primary)] transition-colors"
                            style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                            placeholder="Como podemos te chamar?"
                            required />
                            </div>
                            <div className="space-y-2">
                              <Label
                            htmlFor="phone"
                            className="text-xs font-bold uppercase tracking-wider opacity-70"
                            style={{ color: "var(--store-text)" }}>
                                WhatsApp
                              </Label>
                              <Input
                            id="phone"
                            value={formData.phone}
                            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                            className="rounded-xl h-11 border backdrop-blur-md focus:border-[var(--store-primary)] transition-colors"
                            style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                            placeholder="(00) 00000-0000"
                            required />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label
                          htmlFor="device"
                          className="text-xs font-bold uppercase tracking-wider opacity-70"
                          style={{ color: "var(--store-text)" }}>
                              Aparelho
                            </Label>
                            <Input
                          id="device"
                          value={formData.device}
                          onChange={(e) => setFormData((prev) => ({ ...prev, device: e.target.value }))}
                          className="rounded-xl h-11 border backdrop-blur-md focus:border-[var(--store-primary)] transition-colors"
                          style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                          placeholder="Qual o modelo do seu aparelho?"
                          required />
                          </div>
                          <div className="space-y-2">
                            <Label
                          htmlFor="problem"
                          className="text-xs font-bold uppercase tracking-wider opacity-70"
                          style={{ color: "var(--store-text)" }}>
                              O que está acontecendo?
                            </Label>
                            <Textarea
                          id="problem"
                          value={formData.problem}
                          onChange={(e) => setFormData((prev) => ({ ...prev, problem: e.target.value }))}
                          rows={4}
                          className="rounded-xl resize-none border backdrop-blur-md focus:border-[var(--store-primary)] transition-colors"
                          style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                          placeholder="Descreva o problema ou o serviço que você precisa..."
                          required />
                          </div>
                          <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 rounded-xl text-base font-bold shadow-lg hover:shadow-xl transition-all hover:scale-[1.02] active:scale-[0.98]"
                        style={{ backgroundColor: "var(--store-primary)", color: "var(--store-background)" }}>
                            {isSubmitting ?
                        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                        <div className="flex items-center gap-2">
                                <Send className="h-5 w-5" />
                                <span>Enviar Solicitação</span>
                              </div>
                        }
                          </Button>
                        </form>
                    }
                    </div>
                  </div>
                </div>
              </div>

              {/* Contact Info — Glassmorphism */}
              {store.contact_info &&
            <div className="grid sm:grid-cols-2 gap-4 pt-4">
                  {store.contact_info.phone &&
              <a
                href={`tel:${store.contact_info.phone}`}
                className="flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl transition-colors"
                style={glass}>
                      <div
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--store-icon) 10%, transparent)" }}>
                        <Phone className="h-6 w-6" style={{ color: "var(--store-icon)" }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase opacity-60" style={{ color: "var(--store-text)" }}>
                          Contato
                        </p>
                        <p className="font-semibold text-lg" style={{ color: "var(--store-text)" }}>
                          {store.contact_info.phone}
                        </p>
                      </div>
                    </a>
              }
                  {store.contact_info.address &&
              <div
                className="flex items-center gap-4 p-4 rounded-2xl border backdrop-blur-xl"
                style={glass}>
                      <div
                  className="h-12 w-12 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: "color-mix(in srgb, var(--store-icon) 10%, transparent)" }}>
                        <MapPin className="h-6 w-6" style={{ color: "var(--store-icon)" }} />
                      </div>
                      <div>
                        <p className="text-xs font-bold uppercase opacity-60" style={{ color: "var(--store-text)" }}>
                          Endereço
                        </p>
                        <p className="font-semibold text-sm leading-tight" style={{ color: "var(--store-text)" }}>
                          {store.contact_info.address}
                        </p>
                      </div>
                    </div>
              }
                </div>
            }
            </motion.div>
          }

          {/* Services Tab */}
          {activeTab === "services" &&
          <motion.div
            key="services"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-8 space-y-8">

              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold" style={{ color: "var(--store-text)" }}>
                  Encontre seu Reparo
                </h2>
                <p className="text-sm" style={{ color: "var(--store-muted)" }}>
                  Selecione a marca e o modelo para ver os preços
                </p>
              </div>

              {/* Search — Glassmorphism */}
              <div className="relative">
                <Search
                className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
                style={{ color: "var(--store-muted)" }} />
                <Input
                placeholder="Buscar modelo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-12 h-14 rounded-2xl border backdrop-blur-xl"
                style={{
                  ...glass,
                  color: "var(--store-text)"
                }} />
              </div>

              {/* Breadcrumb */}
              <AnimatePresence>
                {(selectedBrand || selectedDevice) &&
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="flex flex-wrap items-center gap-2 text-sm px-1">
                    <button
                  onClick={() => {
                    setSelectedBrand(null);
                    setSelectedDevice(null);
                  }}
                  className="flex items-center gap-1 hover:opacity-80 transition-opacity"
                  style={{ color: "var(--store-muted)" }}>
                      <Store className="h-3.5 w-3.5" />
                      Marcas
                    </button>
                    {selectedBrand &&
                <>
                        <ChevronRight className="h-3 w-3 opacity-40" style={{ color: "var(--store-text)" }} />
                        <button
                    onClick={() => setSelectedDevice(null)}
                    className="font-medium hover:underline decoration-[var(--store-primary)] decoration-2 underline-offset-4"
                    style={{ color: selectedDevice ? "var(--store-muted)" : "var(--store-primary)" }}>
                          {brands.find((b) => b.id === selectedBrand)?.name}
                        </button>
                      </>
                }
                    {selectedDevice &&
                <>
                        <ChevronRight className="h-3 w-3 opacity-40" style={{ color: "var(--store-text)" }} />
                        <span
                    className="font-bold px-2 py-0.5 rounded-md"
                    style={{
                      color: "var(--store-primary)",
                      backgroundColor: "color-mix(in srgb, var(--store-primary) 10%, transparent)"
                    }}>
                          {selectedDevice.name}
                        </span>
                      </>
                }
                  </motion.div>
              }
              </AnimatePresence>

              {/* Brands Grid — Glass */}
              {!selectedBrand && !selectedDevice &&
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                  {filteredBrands.map((brand) =>
              <motion.button
                key={brand.id}
                layout
                onClick={() => setSelectedBrand(brand.id)}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group relative p-4 rounded-2xl border backdrop-blur-xl flex flex-col items-center justify-center gap-3 overflow-hidden"
                style={glass}>
                      <div className="absolute inset-0 bg-[var(--store-primary)]/0 group-hover:bg-[var(--store-primary)]/5 transition-colors duration-300" />
                      <div
                        className="p-3 rounded-xl shadow-sm group-hover:shadow-md transition-all backdrop-blur-md"
                        style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 60%, transparent)" }}>
                        <Smartphone className="h-6 w-6" style={{ color: "var(--store-primary)" }} />
                      </div>
                      <span className="font-semibold text-sm tracking-wide" style={{ color: "var(--store-text)" }}>
                        {brand.name}
                      </span>
                    </motion.button>
              )}
                </div>
            }

              {/* Devices Grid — Glass */}
              {selectedBrand && !selectedDevice &&
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredDevices.map((device) =>
              <motion.button
                key={device.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ x: 4 }}
                onClick={() => setSelectedDevice(device)}
                className="group p-4 rounded-2xl border backdrop-blur-xl text-left flex items-center justify-between transition-all"
                style={glass}>
                      <div>
                        <span className="font-semibold text-base block mb-1" style={{ color: "var(--store-text)" }}>
                          {device.name}
                        </span>
                        <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--store-text) 5%, transparent)",
                      color: "var(--store-muted)"
                    }}>
                          {services.filter((s) => s.device_id === device.id).length} serviços
                        </span>
                      </div>
                      <div
                  className="h-8 w-8 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  style={{ backgroundColor: "var(--store-primary)" }}>
                        <ChevronRight className="h-4 w-4" style={{ color: "var(--store-background)" }} />
                      </div>
                    </motion.button>
              )}
                </div>
            }

              {/* Device Services — Glass */}
              {selectedDevice &&
            <div className="space-y-4">
                  {selectedDevice.chronic_issues &&
              <div
                className="p-4 rounded-2xl border backdrop-blur-xl"
                style={{
                  backgroundColor: "color-mix(in srgb, var(--store-warning) 8%, transparent)",
                  borderColor: "color-mix(in srgb, var(--store-warning) 20%, transparent)"
                }}>
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "var(--store-warning)" }} />
                        <div>
                          <p className="font-bold text-sm mb-1" style={{ color: "var(--store-warning)" }}>
                            Atenção
                          </p>
                          <p className="text-sm opacity-90" style={{ color: "var(--store-warning)" }}>
                            {selectedDevice.chronic_issues}
                          </p>
                        </div>
                      </div>
                    </div>
              }

                  <div className="grid gap-3">
                    {deviceServices.map((svc) => {
                  const formattedPrice = new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL"
                  }).format(svc.price);
                  return (
                    <button
                      key={svc.id}
                      onClick={() => {
                        setServiceDetailData({ service: svc, deviceName: selectedDevice.name });
                        setServiceDetailOpen(true);
                      }}
                      className="w-full p-4 sm:p-5 rounded-2xl border backdrop-blur-xl text-left transition-all hover:scale-[1.01] hover:shadow-lg group"
                      style={glass}>
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1.5 flex-1">
                              <h3 className="font-bold text-base sm:text-lg" style={{ color: "var(--store-text)" }}>
                                {svc.name}
                              </h3>
                              {svc.description &&
                          <p className="text-sm line-clamp-2 opacity-80" style={{ color: "var(--store-muted)" }}>
                                  {svc.description}
                                </p>
                          }
                            </div>
                            <span
                          className="text-lg sm:text-xl font-bold tracking-tight"
                          style={{ color: "var(--store-price)" }}>
                              {formattedPrice}
                            </span>
                          </div>
                        </button>);
                })}
                  </div>
                </div>
            }
            </motion.div>
          }

          {/* Shop Tab */}
          {activeTab === "shop" &&
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-8 space-y-8">

              <div className="flex items-center gap-3 mb-6">
                <div
                className="p-3 rounded-2xl"
                style={{ backgroundColor: "color-mix(in srgb, var(--store-primary) 10%, transparent)" }}>
                  <ShoppingBag className="h-6 w-6" style={{ color: "var(--store-primary)" }} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold" style={{ color: "var(--store-text)" }}>
                    Loja Virtual
                  </h2>
                  <p className="text-sm" style={{ color: "var(--store-muted)" }}>
                    Produtos selecionados para você
                  </p>
                </div>
              </div>

              {/* Search & Filter — Glass */}
              <div className="sticky top-20 z-30 pt-2 pb-4 -mx-4 px-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5"
                    style={{ color: "var(--store-muted)" }} />
                    <Input
                    placeholder="Buscar produto..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-12 h-12 rounded-xl border shadow-sm backdrop-blur-xl"
                    style={{
                      ...glass,
                      color: "var(--store-text)"
                    }} />
                  </div>

                  {shopCategories.length > 0 &&
                <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                      <button
                    onClick={() => setSelectedShopCategory(null)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border backdrop-blur-xl ${
                    selectedShopCategory === null ? "shadow-md scale-105" : ""}`
                    }
                    style={{
                      backgroundColor: selectedShopCategory === null ? "var(--store-primary)" : "color-mix(in srgb, var(--store-surface) 40%, transparent)",
                      color: selectedShopCategory === null ? "var(--store-background)" : "var(--store-text)",
                      borderColor:
                      selectedShopCategory === null ?
                      "transparent" :
                      "color-mix(in srgb, var(--store-border) 15%, transparent)"
                    }}>
                        Todos
                      </button>
                      {shopCategories.map((cat) =>
                  <button
                    key={cat.id}
                    onClick={() => setSelectedShopCategory(cat.id)}
                    className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all border backdrop-blur-xl ${
                    selectedShopCategory === cat.id ? "shadow-md scale-105" : ""}`
                    }
                    style={{
                      backgroundColor: selectedShopCategory === cat.id ? "var(--store-primary)" : "color-mix(in srgb, var(--store-surface) 40%, transparent)",
                      color: selectedShopCategory === cat.id ? "var(--store-background)" : "var(--store-text)",
                      borderColor:
                      selectedShopCategory === cat.id ?
                      "transparent" :
                      "color-mix(in srgb, var(--store-border) 15%, transparent)"
                    }}>
                          {cat.name}
                        </button>
                  )}
                    </div>
                }
                </div>
              </div>

              {/* Products Grid — Glass */}
              {filteredShopProducts.length === 0 ?
            <div className="text-center py-20 opacity-50">
                  <ShoppingBag className="h-16 w-16 mx-auto mb-4" />
                  <p>Nenhum produto encontrado</p>
                </div> :
            <div className="grid grid-cols-2 gap-4">
                  {filteredShopProducts.map((product) =>
              <motion.div
                key={product.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                whileHover={{ y: -5 }}
                onClick={() => setSelectedProductDetail(product)}
                className="group cursor-pointer rounded-2xl overflow-hidden border backdrop-blur-xl shadow-sm hover:shadow-xl transition-all duration-300"
                style={glass}>
                      <div className="aspect-square relative overflow-hidden" style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 60%, transparent)" }}>
                        {product.image_url ?
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" /> :
                  <div className="w-full h-full flex items-center justify-center opacity-10">
                            <ShoppingBag className="h-12 w-12" style={{ color: "var(--store-text)" }} />
                          </div>
                  }
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                      </div>

                      <div className="p-4 space-y-2">
                        {product.category_id &&
                  <div className="flex items-center gap-2">
                            <span
                      className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        color: "var(--store-primary)",
                        backgroundColor: "color-mix(in srgb, var(--store-primary) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--store-primary) 20%, transparent)"
                      }}>
                              {shopCategories.find((c) => c.id === product.category_id)?.name || "Categoria"}
                            </span>
                          </div>
                  }
                        <h4
                    className="font-medium text-sm sm:text-base line-clamp-2 min-h-[2.5em]"
                    style={{ color: "var(--store-text)" }}>
                          {product.name}
                        </h4>
                        {product.description &&
                  <p
                    className="text-[11px] sm:text-xs leading-snug line-clamp-2 opacity-80"
                    style={{ color: "var(--store-muted)" }}>
                            {product.description}
                          </p>
                  }
                        <div>
                          <div className="flex items-baseline justify-between gap-2">
                            <span
                        className="text-[10px] font-bold uppercase tracking-widest opacity-70"
                        style={{ color: "var(--store-muted)" }}>
                              À vista
                            </span>
                            <span
                        className="text-base sm:text-lg font-black"
                        style={{ color: "var(--store-price)" }}>
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(product.price)}
                            </span>
                          </div>
                          {(product.max_installments || 1) > 1 &&
                    <p className="text-[10px] sm:text-xs opacity-80" style={{ color: "var(--store-muted)" }}>
                              Parcelado:{" "}
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        product.installment_price || product.price
                      )}{" "}
                              em {product.max_installments}x de{" "}
                              {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                        (product.installment_price || product.price) / (product.max_installments || 1)
                      )}
                            </p>
                    }
                        </div>
                      </div>
                    </motion.div>
              )}
                </div>
            }
            </motion.div>
          }

          {/* Quote Tab — Glass */}
          {activeTab === "quote" &&
          <motion.div
            key="quote"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="px-4 py-6">

              <Button
              variant="ghost"
              onClick={() => setActiveTab("home")}
              className="mb-4 rounded-full gap-2"
              style={{ color: "var(--store-text)" }}>
                <ChevronLeft className="h-4 w-4" />
                Voltar
              </Button>

              <div
              className="rounded-3xl border backdrop-blur-2xl overflow-hidden shadow-2xl"
              id="quote-form"
              style={glassStrong}>
                <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-[var(--store-primary)] to-transparent opacity-50" />
                <div className="px-6 pt-5 pb-4">
                  <h3 className="flex items-center gap-2 text-lg font-semibold" style={{ color: "var(--store-text)" }}>
                    <MessageCircle className="h-5 w-5" style={{ color: "var(--store-primary)" }} />
                    Solicitar Orçamento
                  </h3>
                </div>
                <div className="px-6 pb-6">
                  {submitted ?
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-8">
                      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gradient-to-br from-[var(--store-success)]/20 to-[var(--store-success)]/5">
                        <CheckCircle className="h-8 w-8" style={{ color: "var(--store-success)" }} />
                      </div>
                      <h3 className="font-bold text-lg mb-2" style={{ color: "var(--store-text)" }}>
                        Solicitação Enviada!
                      </h3>
                      <p className="text-sm mb-4" style={{ color: "var(--store-muted)" }}>
                        Entraremos em contato em breve.
                      </p>
                      <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitted(false);
                      setFormData({ name: "", phone: "", device: "", problem: "" });
                    }}
                    className="rounded-full px-6 border-2 hover:bg-transparent"
                    style={{ borderColor: "var(--store-border)", color: "var(--store-text)" }}>
                        Nova Solicitação
                      </Button>
                    </motion.div> :
                <form onSubmit={handleQuoteSubmit} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label
                        htmlFor="name2"
                        className="text-xs font-bold uppercase tracking-wider opacity-70"
                        style={{ color: "var(--store-text)" }}>
                            Nome
                          </Label>
                          <Input
                        id="name2"
                        value={formData.name}
                        onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                        className="rounded-xl border backdrop-blur-md focus:border-[var(--store-primary)]"
                        style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                        placeholder="Seu nome"
                        required />
                        </div>
                        <div className="space-y-2">
                          <Label
                        htmlFor="phone2"
                        className="text-xs font-bold uppercase tracking-wider opacity-70"
                        style={{ color: "var(--store-text)" }}>
                            Telefone
                          </Label>
                          <Input
                        id="phone2"
                        value={formData.phone}
                        onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                        className="rounded-xl border backdrop-blur-md focus:border-[var(--store-primary)]"
                        style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                        placeholder="(00) 00000-0000"
                        required />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label
                      htmlFor="device2"
                      className="text-xs font-bold uppercase tracking-wider opacity-70"
                      style={{ color: "var(--store-text)" }}>
                          Dispositivo
                        </Label>
                        <Input
                      id="device2"
                      value={formData.device}
                      onChange={(e) => setFormData((prev) => ({ ...prev, device: e.target.value }))}
                      className="rounded-xl border backdrop-blur-md focus:border-[var(--store-primary)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                      placeholder="Ex: iPhone 13..."
                      required />
                      </div>
                      <div className="space-y-2">
                        <Label
                      htmlFor="problem2"
                      className="text-xs font-bold uppercase tracking-wider opacity-70"
                      style={{ color: "var(--store-text)" }}>
                          Problema
                        </Label>
                        <Textarea
                      id="problem2"
                      value={formData.problem}
                      onChange={(e) => setFormData((prev) => ({ ...prev, problem: e.target.value }))}
                      rows={4}
                      className="rounded-xl resize-none border backdrop-blur-md focus:border-[var(--store-primary)]"
                      style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 50%, transparent)", color: "var(--store-text)", borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}
                      placeholder="Descreva o problema..."
                      required />
                      </div>
                      <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-11 rounded-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all"
                    style={{ backgroundColor: "var(--store-primary)", color: "var(--store-background)" }}>
                        {isSubmitting ?
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" /> :
                    <div className="flex items-center gap-2">
                            <Send className="h-4 w-4" />
                            <span>Enviar Solicitação</span>
                          </div>
                    }
                      </Button>
                    </form>
                }
                </div>
              </div>
            </motion.div>
          }
        </AnimatePresence>
      </main>

      {/* Product Detail Dialog — Glass */}
      <Dialog open={!!selectedProductDetail} onOpenChange={() => setSelectedProductDetail(null)}>
        <DialogContent
          className="max-w-lg p-0 gap-0 border backdrop-blur-2xl overflow-hidden"
          style={glassStrong}>

          {selectedProductDetail &&
          (() => {
            const allMedia: {url: string;type: "image" | "video";}[] = [];
            if (selectedProductDetail.image_url)
            allMedia.push({ url: selectedProductDetail.image_url, type: "image" });
            (selectedProductDetail.additional_images || []).forEach((img) => {
              if (img) allMedia.push({ url: img, type: "image" });
            });
            (selectedProductDetail.video_urls || []).forEach((vid) => {
              if (vid) allMedia.push({ url: vid, type: "video" });
            });

            return (
              <>
                  <DialogTitle className="sr-only">{selectedProductDetail.name}</DialogTitle>
                  {allMedia.length > 0 &&
                <ProductDetailGallery
                  media={allMedia}
                  name={selectedProductDetail.name}
                  onClose={() => setSelectedProductDetail(null)} />
                }
                  {allMedia.length === 0 &&
                <div className="aspect-square relative flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--store-background) 60%, transparent)" }}>
                      <ShoppingBag className="h-16 w-16 opacity-10" style={{ color: "var(--store-text)" }} />
                      <DialogClose className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-md flex items-center justify-center transition-colors">
                        <X className="h-5 w-5 text-white" />
                      </DialogClose>
                    </div>
                }
                  <div className="p-6 space-y-6">
                    <div>
                      <h2 className="text-2xl font-bold leading-tight" style={{ color: "var(--store-text)" }}>
                        {selectedProductDetail.name}
                      </h2>
                      {selectedProductDetail.category_id &&
                    <div className="mt-2">
                          <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider"
                        style={{
                          color: "var(--store-primary)",
                          backgroundColor: "color-mix(in srgb, var(--store-primary) 12%, transparent)",
                          border: "1px solid color-mix(in srgb, var(--store-primary) 25%, transparent)"
                        }}>
                            {shopCategories.find((c) => c.id === selectedProductDetail.category_id)?.name || "Categoria"}
                          </span>
                        </div>
                    }
                      {selectedProductDetail.description &&
                    <p
                      className="mt-2 leading-relaxed"
                      style={{ color: "color-mix(in srgb, var(--store-text) 85%, var(--store-muted) 15%)" }}>
                          {selectedProductDetail.description}
                        </p>
                    }
                    </div>

                    <div
                    className="space-y-3 p-4 rounded-xl backdrop-blur-md border"
                    style={{
                      backgroundColor: "color-mix(in srgb, var(--store-background) 40%, transparent)",
                      borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)"
                    }}>
                      <div className="flex items-baseline justify-between gap-3">
                        <span
                        className="text-[10px] font-bold uppercase tracking-widest opacity-70"
                        style={{ color: "var(--store-muted)" }}>
                          À vista
                        </span>
                        <span className="text-3xl font-black" style={{ color: "var(--store-price)" }}>
                          {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                          selectedProductDetail.price
                        )}
                        </span>
                      </div>

                      <div className="pt-1 grid grid-cols-1 gap-2">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70" style={{ color: "var(--store-muted)" }}>
                            Preço Parcelado Total
                          </p>
                          <p className="text-base font-black leading-tight" style={{ color: "var(--store-text)" }}>
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                              selectedProductDetail.installment_price || selectedProductDetail.price
                            )}
                          </p>
                        </div>
                        <p className="text-xs font-medium opacity-80" style={{ color: "var(--store-muted)" }}>
                          Parcelas: {selectedProductDetail.max_installments || 1}x de {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                            (selectedProductDetail.installment_price || selectedProductDetail.price) / (selectedProductDetail.max_installments || 1)
                          )}
                        </p>
                      </div>
                    </div>

                    <Button
                    onClick={(e) => handleWhatsAppRedirect(e, selectedProductDetail)}
                    className="w-full h-12 rounded-xl font-bold text-base gap-2 shadow-lg hover:scale-[1.02] transition-transform"
                    style={{ backgroundColor: "#25D366", color: "#fff" }}>
                      <Phone className="h-5 w-5" />
                      WhatsApp
                    </Button>
                  </div>
                </>);
          })()}
        </DialogContent>
      </Dialog>

      {/* Service Detail Modal — Glass */}
      <Dialog open={serviceDetailOpen} onOpenChange={setServiceDetailOpen}>
        <DialogContent
          className="max-w-[360px] mx-auto p-0 overflow-hidden rounded-3xl border backdrop-blur-2xl"
          style={{
            ...glassStrong,
            color: "var(--store-text, #ffffff)",
            boxShadow: "0 25px 60px -15px rgba(0, 0, 0, 0.6)"
          }}>

          {serviceDetailData &&
          (() => {
            const svc = serviceDetailData.service;
            const theme = store?.theme_config || {};
            const formattedCash = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              svc.price
            );
            const hasInstallment = (svc.max_installments || 1) > 1;
            const installmentTotal = svc.installment_price || svc.price;
            const formattedInstallmentTotal = new Intl.NumberFormat("pt-BR", {
              style: "currency",
              currency: "BRL"
            }).format(installmentTotal);
            const perInstallment = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
              installmentTotal / (svc.max_installments || 1)
            );

            return (
              <div className="flex flex-col">
                  {/* Header */}
                  <div className="relative px-6 pt-6 pb-5">
                    <DialogClose className="absolute right-4 top-4 h-8 w-8 rounded-full transition-colors flex items-center justify-center" style={{ backgroundColor: "color-mix(in srgb, var(--store-text) 10%, transparent)" }}>
                      <X className="h-4 w-4" style={{ color: "var(--store-text)" }} />
                    </DialogClose>

                    <DialogTitle className="text-xl font-bold pr-10 leading-tight" style={{ color: "var(--store-text)" }}>{svc.name}</DialogTitle>

                    {serviceDetailData.deviceName &&
                  <div className="flex items-center gap-1.5 mt-2">
                        <Smartphone className="h-3.5 w-3.5" style={{ color: "var(--store-muted)" }} />
                        <span className="text-sm font-medium" style={{ color: "var(--store-muted)" }}>{serviceDetailData.deviceName}</span>
                      </div>
                  }

                    {/* Info pills */}
                    <div className="flex flex-wrap gap-2 mt-4">
                      {(svc.warranty_days ?? 0) > 0 &&
                    <div
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 backdrop-blur-md"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-primary) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--store-primary) 20%, transparent)"
                      }}>
                          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                          <span className="text-xs font-semibold" style={{ color: "var(--store-primary)" }}>
                            {formatWarranty(svc.warranty_days ?? 0)}
                          </span>
                        </div>
                    }
                      {(svc.estimated_time_minutes ?? 0) > 0 &&
                    <div
                      className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 backdrop-blur-md"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-primary) 12%, transparent)",
                        border: "1px solid color-mix(in srgb, var(--store-primary) 20%, transparent)"
                      }}>
                          <Clock className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                          <span className="text-xs font-semibold" style={{ color: "var(--store-primary)" }}>
                            {formatTime(svc.estimated_time_minutes ?? 0)}
                          </span>
                        </div>
                    }
                    </div>
                  </div>

                  {/* Separator */}
                  <div className="mx-6" style={{ borderBottom: "1px solid color-mix(in srgb, var(--store-border) 15%, transparent)" }} />

                  {/* Body */}
                  <div className="px-6 pt-5 pb-3 space-y-4">
                    {/* Expandable Details Section */}
                    {(svc.description || svc.category || (svc.warranty_days ?? 0) > 0 || (svc.estimated_time_minutes ?? 0) > 0) &&
                  <details className="group">
                        <summary
                      className="flex items-center justify-between cursor-pointer rounded-xl px-4 py-3 transition-colors list-none backdrop-blur-md border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-text) 5%, transparent)",
                        borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)"
                      }}>
                          <div className="flex items-center gap-2">
                            <Info className="h-4 w-4" style={{ color: "var(--store-primary)" }} />
                            <span className="text-sm font-semibold" style={{ color: "var(--store-text)" }}>Ver detalhes</span>
                          </div>
                          <ChevronDown
                        className="h-4 w-4 transition-transform duration-300 group-open:rotate-180"
                        style={{ color: "var(--store-muted)" }} />
                        </summary>

                        <div className="mt-3 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                          {svc.description &&
                      <p className="text-sm leading-relaxed px-1" style={{ color: "var(--store-muted)" }}>
                              {svc.description}
                            </p>
                      }

                          <div
                        className="rounded-xl overflow-hidden divide-y backdrop-blur-md"
                        style={{
                          backgroundColor: "color-mix(in srgb, var(--store-text) 3%, transparent)",
                          borderColor: "color-mix(in srgb, var(--store-border) 8%, transparent)"
                        }}>
                            {svc.category &&
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--store-border) 8%, transparent)" }}>
                                <div className="flex items-center gap-2">
                                  <Tag className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--store-muted)" }}>Categoria</span>
                                </div>
                                <span className="text-xs font-semibold" style={{ color: "var(--store-text)" }}>{svc.category}</span>
                              </div>
                        }
                            {(svc.warranty_days ?? 0) > 0 &&
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--store-border) 8%, transparent)" }}>
                                <div className="flex items-center gap-2">
                                  <ShieldCheck className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--store-muted)" }}>Garantia</span>
                                </div>
                                <span className="text-xs font-semibold" style={{ color: "var(--store-text)" }}>{formatWarranty(svc.warranty_days ?? 0)}</span>
                              </div>
                        }
                            {(svc.estimated_time_minutes ?? 0) > 0 &&
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--store-border) 8%, transparent)" }}>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--store-muted)" }}>Tempo estimado</span>
                                </div>
                                <span className="text-xs font-semibold" style={{ color: "var(--store-text)" }}>{formatTime(svc.estimated_time_minutes ?? 0)}</span>
                              </div>
                        }
                            {hasInstallment &&
                        <div className="flex items-center justify-between px-4 py-2.5" style={{ borderColor: "color-mix(in srgb, var(--store-border) 8%, transparent)" }}>
                                <div className="flex items-center gap-2">
                                  <CheckCircle className="h-3.5 w-3.5" style={{ color: "var(--store-primary)" }} />
                                  <span className="text-xs font-medium" style={{ color: "var(--store-muted)" }}>Parcelamento</span>
                                </div>
                                <span className="text-xs font-semibold" style={{ color: "var(--store-text)" }}>Até {svc.max_installments}x</span>
                              </div>
                        }
                          </div>
                        </div>
                      </details>
                  }

                    {/* Price Section — Glass */}
                    <div className="space-y-3">
                      {/* Cash price */}
                      <div
                      className="rounded-2xl p-5 text-center relative overflow-hidden backdrop-blur-xl border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-primary) 6%, transparent)",
                        borderColor: "color-mix(in srgb, var(--store-primary) 15%, transparent)"
                      }}>
                        <span
                        className="text-[10px] font-bold uppercase tracking-[0.15em] block mb-1.5"
                        style={{ color: "var(--store-muted)" }}>
                          À Vista
                        </span>
                        <p
                        className="text-3xl font-black leading-none tracking-tight"
                        style={{ color: "var(--store-price, var(--store-primary))" }}>
                          {formattedCash}
                        </p>
                      </div>

                      {/* Installment price */}
                      {hasInstallment &&
                    <div
                      className="rounded-2xl px-5 py-4 text-center backdrop-blur-xl border"
                      style={{
                        backgroundColor: "color-mix(in srgb, var(--store-text) 4%, transparent)",
                        borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)"
                      }}>
                          <span
                        className="text-[10px] font-bold uppercase tracking-[0.15em] block mb-1"
                        style={{ color: "var(--store-muted)" }}>
                            Parcelado
                          </span>
                          <p className="text-lg font-black leading-tight" style={{ color: "var(--store-text)" }}>
                            {formattedInstallmentTotal}
                          </p>
                          <p className="text-xs font-medium mt-0.5" style={{ color: "var(--store-muted)" }}>
                            em {svc.max_installments}x de {perInstallment}
                          </p>
                        </div>
                    }
                    </div>
                  </div>

                  {/* Action */}
                  <div className="px-6 pb-6 pt-2">
                    {store.contact_info?.whatsapp &&
                  <Button
                    className="w-full h-13 rounded-2xl font-bold gap-2.5 text-base shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
                    style={{ backgroundColor: "#25D366", color: "#fff", boxShadow: "0 4px 20px rgba(37, 211, 102, 0.3)" }}
                    onClick={() => {
                      const phone = (store.contact_info?.whatsapp || "").replace(/\D/g, "");
                      const brandName = selectedBrand ? brands.find((b) => b.id === selectedBrand)?.name : "";
                      const deviceName = serviceDetailData.deviceName || "";

                      const serviceTemplate = theme.whatsappServiceMessageTemplate;
                      let msg: string;
                      const installments = svc.max_installments || 1;
                      const installTotal = svc.installment_price || svc.price;
                      const perInst = installTotal / installments;
                      const formattedPerInst = new Intl.NumberFormat("pt-BR", {
                        style: "currency",
                        currency: "BRL"
                      }).format(perInst);
                      const parceladoText =
                      installments > 1 ? `${installments}x de ${formattedPerInst}` : formattedCash;

                      if (serviceTemplate) {
                        msg = serviceTemplate.
                        replace("{SERVICO}", svc.name).
                        replace("{APARELHO}", `${brandName} ${deviceName}`.trim()).
                        replace("{PRECOAVISTA}", formattedCash).
                        replace("{PRECOPARCELADO}", parceladoText).
                        replace("{PRECO}", formattedCash).
                        replace("{GARANTIA}", formatWarranty(svc.warranty_days ?? 0));
                      } else {
                        msg = `Olá! Tenho interesse no serviço: ${svc.name}\nAparelho: ${brandName} ${deviceName}\nÀ vista: ${formattedCash}\nNo cartão: ${parceladoText}`;
                      }
                      window.open(`https://wa.me/${phone}?text=${encodeURIComponent(msg)}`, "_blank");
                    }}>
                        <MessageCircle className="h-5 w-5" />
                        WhatsApp
                      </Button>
                  }
                  </div>
                </div>);
          })()}
        </DialogContent>
      </Dialog>

      {/* Footer — Glass */}
      <footer
        className="py-8 text-center border-t mt-8"
        style={{ borderColor: "color-mix(in srgb, var(--store-border) 10%, transparent)" }}>
        <p className="text-xs opacity-50" style={{ color: "var(--store-muted)" }}>
          Criado por{" "}
          <span className="font-semibold" style={{ color: "var(--store-primary)" }}>
            OneDrip
          </span>
        </p>
      </footer>
    </div>);
}
