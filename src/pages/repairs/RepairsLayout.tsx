// @ts-nocheck
import React, { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Menu, Home, Wrench, Users, ArrowLeft, Archive, Plus, Shield } from "lucide-react";

export const RepairsLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: "Dashboard", icon: Home, path: "/reparos" },
    { label: "Criar", icon: Wrench, path: "/reparos/servicos" },
    { label: "Garantias", icon: Shield, path: "/reparos/garantias" },
    { label: "Técnicos", icon: Users, path: "/reparos/tecnicos" },
    { label: "Status", icon: Archive, path: "/reparos/status" },
  ];

  const isActive = (path: string) => {
    if (path === "/reparos" && location.pathname === "/reparos") return true;
    if (path !== "/reparos" && location.pathname.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header - Premium glassmorphism */}
      <header className="sticky top-0 z-30 bg-background/60 backdrop-blur-3xl border-b border-border/20 px-4 py-3 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-2xl h-10 w-10 hover:bg-muted/50"
          onClick={() => {
            if (location.pathname === "/reparos") {
              navigate("/dashboard");
            } else {
              navigate("/reparos");
            }
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center">
            <Wrench className="h-4 w-4 text-primary" />
          </div>
          <h1 className="font-bold text-lg tracking-tight">Reparos</h1>
        </div>

        <div className="hidden md:block ml-auto">
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-2xl h-10 w-10 hover:bg-muted/50">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>Menu de Navegação</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-1.5 mt-8">
                {menuItems.map((item) => (
                  <Button
                    key={item.path}
                    variant={isActive(item.path) ? "default" : "ghost"}
                    className="justify-start gap-2.5 rounded-2xl h-12"
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                  >
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${isActive(item.path) ? 'bg-primary-foreground/20' : 'bg-muted/50'}`}>
                      <item.icon className="h-4 w-4" />
                    </div>
                    {item.label}
                  </Button>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4 max-w-5xl mx-auto pb-28 md:pb-8 pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      {/* Mobile Bottom Navigation - Premium glassmorphism */}
      <div className="md:hidden fixed bottom-4 left-4 right-4 bg-background/60 backdrop-blur-3xl border border-border/20 shadow-2xl shadow-background/50 rounded-3xl p-1.5 z-40 pb-[calc(0.375rem+env(safe-area-inset-bottom))]">
        <nav className="flex items-center justify-around">
          {menuItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                className={`flex flex-col items-center justify-center w-full py-2.5 rounded-2xl transition-all duration-300 relative ${
                  active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                {active && (
                  <div className="absolute inset-0 bg-primary/10 rounded-2xl -z-10" />
                )}
                <Icon
                  className={`h-5 w-5 mb-1 transition-transform duration-300 ${active ? "scale-110" : ""}`}
                />
                <span
                  className={`text-[10px] font-medium ${active ? "font-semibold" : ""}`}
                >
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {location.pathname !== "/reparos/servicos" && (
        <button
          type="button"
          onClick={() => navigate("/reparos/servicos")}
          className="md:hidden fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-6 z-50 h-14 w-14 rounded-2xl bg-primary text-primary-foreground shadow-2xl shadow-primary/30 flex items-center justify-center hover:shadow-primary/40 hover:scale-105 active:scale-95 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label="Novo reparo"
        >
          <Plus className="h-6 w-6" />
        </button>
      )}
    </div>
  );
};