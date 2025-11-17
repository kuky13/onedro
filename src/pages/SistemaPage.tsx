import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { CommandPalette } from "@/components/dashboard/CommandPalette";
import { GlobalSearch } from "@/components/navigation/mobile/GlobalSearch";
import { OptimizedNotificationPanel } from "@/components/notifications/OptimizedNotificationPanel";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Bell, Search, Plus, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import "@/styles/desktop-grid.css";
import WormPage from "@/pages/WormPage";
import ServiceOrdersPageSimple from "@/pages/ServiceOrdersPageSimple";
import { ServiceOrdersSettingsHub } from "@/components/ServiceOrdersSettingsHub";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Taskbar } from "@/components/sistema/Taskbar";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const SistemaPage = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isWormOpen, setIsWormOpen] = useState(false);
  const [isServiceOrdersOpen, setIsServiceOrdersOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { profile } = useAuth();
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000 * 30);
    return () => clearInterval(id);
  }, []);

  return (
    <SidebarProvider>
      <div className="desktop-horizontal-layout desktop-main-container">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        <div className="desktop-content-area">
          <div className="desktop-header border-b">
            <div className="h-full px-4 sm:px-6 flex items-center justify-between">
              <div className="flex items-center gap-2 sm:gap-3">
                <LayoutGrid className="h-5 w-5" />
                <span className="text-sm sm:text-base font-semibold">Sistema</span>
              </div>
              <div className="flex items-center gap-2">
                <CommandPalette onNavigate={setActiveTab} />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setIsSearchOpen(true)}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Busca Global</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="sm" onClick={() => setIsWormOpen(true)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Novo Orçamento</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="sm" onClick={() => (setIsServiceOrdersOpen(true))}> 
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Mensagens</TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>

          <div className="desktop-main-content pb-16">
            <div className="desktop-content-wrapper">
              <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={55}>
                  <div className="desktop-page-content">
                    <div className="desktop-grid-2">
                      <Card className="desktop-card">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-4 w-4" />
                            Agenda
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <Calendar mode="single" />
                        </CardContent>
                      </Card>

                      <Card className="desktop-card">
                        <CardHeader>
                          <CardTitle>Atalhos</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                            <Button variant="secondary" onClick={() => (window.location.href = "/dashboard")}>Dashboard</Button>
                            <Button variant="secondary" onClick={() => setIsWormOpen(true)}>Worm</Button>
                            <Button variant="secondary" onClick={() => setIsServiceOrdersOpen(true)}>OS</Button>
                            <Button variant="secondary" onClick={() => setIsSettingsOpen(true)}>Configurações</Button>
                            <Button variant="secondary" onClick={() => (window.location.href = "/central-de-ajuda")}>Ajuda</Button>
                            <Button variant="secondary" onClick={() => (window.location.href = "/msg")}>Mensagens</Button>
                          </div>
                        </CardContent>
                      </Card>

                      <Card className="desktop-card">
                        <CardHeader>
                          <CardTitle>Pesquisar</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2">
                            <Input placeholder="Busque orçamentos, clientes, páginas" onFocus={() => setIsSearchOpen(true)} />
                            <Button variant="outline" onClick={() => setIsSearchOpen(true)}>
                              <Search className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle />

                <ResizablePanel defaultSize={45}>
                  <div className="desktop-page-content">
                    <Card className="desktop-card">
                      <CardHeader>
                        <CardTitle>Central de Mensagens</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <OptimizedNotificationPanel />
                      </CardContent>
                    </Card>
                  </div>
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>
          </div>
        </div>
      </div>

      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      <Dialog open={isWormOpen} onOpenChange={setIsWormOpen}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[85vh] p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Worm System</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(85vh-64px)] overflow-hidden">
            <WormPage />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isServiceOrdersOpen} onOpenChange={setIsServiceOrdersOpen}>
        <DialogContent className="sm:max-w-[95vw] w-[95vw] h-[85vh] p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Ordens de Serviço</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(85vh-64px)] overflow-hidden">
            <ServiceOrdersPageSimple />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="sm:max-w-[90vw] w-[95vw] sm:w-[90vw] h-[80vh] sm:h-[80vh] p-0">
          <DialogHeader className="px-6 py-4">
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <div className="h-[calc(80vh-64px)] overflow-hidden">
            <ServiceOrdersSettingsHub />
          </div>
        </DialogContent>
      </Dialog>

      <div className="fixed bottom-0 inset-x-0 z-50">
        <Taskbar onStartClick={() => setIsSearchOpen(true)} time={now} profile={profile} />
      </div>
    </SidebarProvider>
  );
};

export default SistemaPage;
