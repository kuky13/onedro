import { LayoutDashboard, ShieldCheck, ShoppingBag, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AdminLicenseManagerEnhanced } from '@/components/admin/AdminLicenseManagerEnhanced';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

export function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="space-y-2">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
          <LayoutDashboard className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-xl lg:text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
        <p className="text-sm lg:text-base text-muted-foreground">Gerenciamento geral do sistema.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {/* Card de Atalho para Abacate Pay */}
        <Card className="rounded-2xl border-border/50 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/10 dark:to-emerald-900/10 border-green-100 dark:border-green-900/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-medium text-green-700 dark:text-green-300">
              <ShoppingBag className="h-5 w-5" />
              Abacate Pay
            </CardTitle>
            <CardDescription className="text-green-600/80 dark:text-green-400/80">
              Relatórios de vendas e auditoria.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-green-600 hover:bg-green-700 text-white border-none shadow-sm" size="sm">
              <Link to="/supadmin/abacate" className="flex items-center justify-between">
                Ver Relatórios
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Gerenciador de Licenças */}
      <Card className="rounded-2xl border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base lg:text-lg">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            Painel de Controle de Licenças
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AdminLicenseManagerEnhanced />
        </CardContent>
      </Card>
    </div>
  );
}
