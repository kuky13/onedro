import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { toast } from "sonner";
import { Key, Loader2, MoreHorizontal, Plus, RefreshCw, Search } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";

import { useAdminLicenseList } from "@/hooks/useAdminLicenseList";
import type { AdminLicense, AdminUserForAssignment, LicenseStatusFilter } from "./types";
import { UserCombobox } from "./userCombobox";



function formatDateTimePtBR(iso: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("pt-BR");
  } catch {
    return "—";
  }
}

function statusBadge(status: AdminLicense["derived_status"]) {
  const s = String(status ?? "").toLowerCase();
  const variant = s === "expired" ? "destructive" : s === "inactive" ? "secondary" : "default";
  return (
    <Badge variant={variant as any} className="capitalize">
      {s || "—"}
    </Badge>
  );
}

export function EnhancedLicenseManagement() {
  const {

    licenses,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    reload,
  } = useAdminLicenseList();

  // Create form
  const [creating, setCreating] = useState(false);
  const [createUserId, setCreateUserId] = useState("");
  const [createDays, setCreateDays] = useState("");
  const [createType, setCreateType] = useState("standard");
  const [createNotes, setCreateNotes] = useState("");
  const [createActive, setCreateActive] = useState(true);
  const [createCode, setCreateCode] = useState("");
  const [createName, setCreateName] = useState("");

  // Assignment users
  const [assignmentUsers, setAssignmentUsers] = useState<AdminUserForAssignment[] | null>(null);
  const [assignmentUsersError, setAssignmentUsersError] = useState<string | null>(null);
  const [assignmentUsersLoading, setAssignmentUsersLoading] = useState(false);

  const loadAssignmentUsers = async () => {
    if (assignmentUsers || assignmentUsersLoading) return;
    setAssignmentUsersLoading(true);
    setAssignmentUsersError(null);

    try {
      const { data, error } = await supabase.rpc("admin_get_all_users_for_assignment");
      if (error) throw error;
      setAssignmentUsers((data ?? []) as unknown as AdminUserForAssignment[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao carregar usuários";
      setAssignmentUsersError(message);
    } finally {
      setAssignmentUsersLoading(false);
    }
  };

  useEffect(() => {
    void loadAssignmentUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getUserById = (userId: string | null) => {
    if (!userId || !assignmentUsers) return null;
    return assignmentUsers.find((u) => u.id === userId) ?? null;
  };

  // Edit sheet
  const [selected, setSelected] = useState<AdminLicense | null>(null);
  const [updating, setUpdating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [editUserId, setEditUserId] = useState("");
  const [editExpiresAt, setEditExpiresAt] = useState("");
  const [editType, setEditType] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editActive, setEditActive] = useState(true);
  const [editName, setEditName] = useState("");

  const openEdit = (license: AdminLicense) => {
    setSelected(license);
    setEditUserId(license.user_id || "");
    setEditActive(license.is_active);
    setEditType(license.license_type || "");
    setEditNotes(license.notes || "");
    setEditExpiresAt(license.expires_at ? license.expires_at.slice(0, 16) : "");
    setEditName(license.license_name || "");
  };

  const stats = useMemo(() => {
    const total = licenses.length;
    let active = 0;
    let expired = 0;
    let inactive = 0;

    for (const l of licenses) {
      const s = String(l.derived_status ?? "").toLowerCase();
      if (s === "active") active++;
      else if (s === "expired") expired++;
      else if (s === "inactive") inactive++;
    }

    return { total, active, expired, inactive };
  }, [licenses]);

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} copiado(a) para a área de transferência`);
    } catch {
      toast.error("Não foi possível copiar");
    }
  };

  const handleGenerateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    const length = 13;
    let result = "";
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCreateCode(result);
  };

  const handleCreate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!createDays) {
      toast.error("Informe a quantidade de dias");
      return;
    }

    const days = Number(createDays);
    if (!Number.isFinite(days) || days <= 0) {
      toast.error("Dias inválidos");
      return;
    }

    setCreating(true);
    try {
      const params: {
        p_days: number;
        p_is_active: boolean;
        p_license_type: string;
        p_user_id?: string;
        p_notes?: string;
        p_code?: string;
        p_license_name?: string;
      } = {
        p_days: days,
        p_is_active: createActive,
        p_license_type: createType || "standard",
      };

      if (createUserId.trim()) params.p_user_id = createUserId.trim();
      if (createNotes.trim()) params.p_notes = createNotes.trim();
      if (createCode.trim()) params.p_code = createCode.trim();
      if (createName.trim()) params.p_license_name = createName.trim();

      // NOTE: Tipos gerados do Supabase podem marcar p_user_id como obrigatório mesmo sendo opcional no RPC.
      // Mantemos a chamada segura em runtime evitando enviar string vazia.
      const { error } = await (supabase as any).rpc("admin_create_custom_license", params);

      if (error) throw error;
      toast.success("Acesso ao suporte criado com sucesso");
      setCreateUserId("");
      setCreateDays("");
      setCreateNotes("");
      setCreateType("standard");
      setCreateActive(true);
      setCreateCode("");
      setCreateName("");
      await reload({ search: search, status: statusFilter as any });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao criar acesso ao suporte";
      toast.error(message);
    } finally {
      setCreating(false);
    }
  };

  const handleUpdate = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selected) return;

    setUpdating(true);
    try {
      const params: {
        p_license_id: string;
        p_is_active: boolean;
        p_user_id?: string;
        p_expires_at?: string;
        p_license_type?: string;
        p_notes?: string;
        p_license_name?: string;
      } = {
        p_license_id: selected.id,
        p_is_active: editActive,
      };

      if (editUserId.trim()) params.p_user_id = editUserId.trim();
      if (editExpiresAt) params.p_expires_at = new Date(editExpiresAt).toISOString();
      if (editType.trim()) params.p_license_type = editType.trim();
      if (editNotes.trim()) params.p_notes = editNotes.trim();
      if (editName.trim()) params.p_license_name = editName.trim();
      const { error } = await (supabase as any).rpc("admin_update_license_full", params);
      if (error) throw error;
      toast.success("Acesso ao suporte atualizado com sucesso");
      setSelected(null);
      await reload({ search, status: statusFilter as any });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao atualizar acesso ao suporte";
      toast.error(message);
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (license: AdminLicense) => {
    const reason = window.prompt("Motivo para apagar este acesso ao suporte? (opcional)") ?? "";
    setDeletingId(license.id);
    try {
      const params: { p_license_id: string; p_reason?: string } = { p_license_id: license.id };
      if (reason.trim()) params.p_reason = reason.trim();

      const { data, error } = await (supabase as any).rpc("admin_delete_license", params);

      if (error) throw error;
      if (!data) {
        toast.error("Não foi possível apagar o acesso ao suporte");
      } else {
        toast.success("Acesso ao suporte apagado com sucesso");
        await reload({ search, status: statusFilter as any });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao apagar acesso ao suporte";
      toast.error(message);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Premium Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
            <Key className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-xl lg:text-3xl font-bold tracking-tight">Acessos ao Suporte</h1>
          <p className="text-sm lg:text-base text-muted-foreground">
            Crie, edite e acompanhe acessos ao suporte de forma centralizada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => void reload()} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Atualizar
          </Button>
          <Button
            type="button"
            onClick={() => {
              const el = document.getElementById("create-license");
              el?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
          >
            <Plus className="h-4 w-4" />
            Criar
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-card/60 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Total</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Ativas</CardDescription>
            <CardTitle className="text-2xl">{stats.active}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Expiradas</CardDescription>
            <CardTitle className="text-2xl">{stats.expired}</CardTitle>
          </CardHeader>
        </Card>
        <Card className="bg-card/60 backdrop-blur-sm border-border/60">
          <CardHeader className="pb-2">
            <CardDescription>Inativas</CardDescription>
            <CardTitle className="text-2xl">{stats.inactive}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* List */}
      <Card className="bg-card/60 backdrop-blur-sm border-border/60">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Acessos ao suporte existentes</CardTitle>
            <CardDescription>Busque e gerencie os acessos ao suporte cadastrados.</CardDescription>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9 w-full sm:w-72"
                placeholder="Buscar por chave, nome ou notas"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as LicenseStatusFilter)}
            >
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativa</SelectItem>
                <SelectItem value="expired">Expirada</SelectItem>
                <SelectItem value="inactive">Inativa</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="rounded-lg border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}

          {loading ? (
            <div className="flex items-center justify-center py-10 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Carregando acessos ao suporte...
            </div>
          ) : licenses.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Nenhum acesso ao suporte encontrado com os filtros atuais.
            </div>
          ) : (
            <>
              {/* Mobile: cards */}
              <div className="space-y-3 sm:hidden">
                {licenses.map((license) => {
                  const owner = getUserById(license.user_id);
                  const ownerLabel = owner?.email || license.user_email || "—";

                  return (
                    <Card key={license.id} className="border-border/60 bg-background/40">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="font-medium truncate">
                              {license.license_name || "(sem nome)"}
                            </div>
                            <div className="mt-1 flex flex-wrap items-center gap-2">
                              {license.license_type ? (
                                <Badge variant="outline" className="text-[10px] uppercase">
                                  {license.license_type}
                                </Badge>
                              ) : null}
                              {statusBadge(license.derived_status)}
                            </div>
                          </div>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="icon" aria-label="Ações">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => void copyToClipboard(license.code, "Código")}
                              >
                                Copiar chave
                              </DropdownMenuItem>
                              {owner?.email ? (
                                <DropdownMenuItem onSelect={() => void copyToClipboard(owner.email, "E-mail")}
                                >
                                  Copiar e-mail
                                </DropdownMenuItem>
                              ) : null}
                              {license.user_id ? (
                                <DropdownMenuItem onSelect={() => void copyToClipboard(license.user_id!, "UUID")}
                                >
                                  Copiar UUID
                                </DropdownMenuItem>
                              ) : null}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onSelect={() => openEdit(license)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem
                                onSelect={() => void handleDelete(license)}
                                className="text-destructive"
                                disabled={deletingId === license.id}
                              >
                                {deletingId === license.id ? "Apagando..." : "Apagar"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        <div className="mt-3 grid gap-2 text-xs">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Código</span>
                            <div className="flex items-center gap-2">
                              <span className="font-mono">{license.code}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void copyToClipboard(license.code, "Código")}
                              >
                                Copiar
                              </Button>
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Dono</span>
                            <div className="text-right min-w-0">
                              <div className="truncate">{ownerLabel}</div>
                              {license.user_id ? (
                                <div className="text-[11px] text-muted-foreground font-mono truncate">
                                  {license.user_id}
                                </div>
                              ) : null}
                            </div>
                          </div>

                          <div className="flex items-start justify-between gap-3">
                            <span className="text-muted-foreground">Expiração</span>
                            <div className="text-right">
                              <div>{formatDateTimePtBR(license.expires_at)}</div>
                              <div className="text-[11px] text-muted-foreground">
                                Criada em {formatDateTimePtBR(license.created_at)}
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Desktop/tablet: table */}
              <div className="hidden sm:block max-h-[560px] overflow-auto rounded-lg">
                <Table>
                  <TableHeader className="sticky top-0 bg-background/80 backdrop-blur-sm">
                    <TableRow>
                      <TableHead>Acesso ao Suporte</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Dono</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Expiração</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {licenses.map((license) => {
                      const owner = getUserById(license.user_id);
                      return (
                        <TableRow key={license.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{license.license_name || "(sem nome)"}</div>
                              <div className="text-xs text-muted-foreground">
                                {license.license_type ? (
                                  <Badge variant="outline" className="text-[10px] uppercase">
                                    {license.license_type}
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-xs">{license.code}</span>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void copyToClipboard(license.code, "Código")}
                              >
                                Copiar
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="text-sm">{owner?.email || license.user_email || "—"}</div>
                              {license.user_id ? (
                                <div className="text-xs text-muted-foreground font-mono">{license.user_id}</div>
                              ) : null}
                            </div>
                          </TableCell>
                          <TableCell>{statusBadge(license.derived_status)}</TableCell>
                          <TableCell>
                            <div className="text-sm">{formatDateTimePtBR(license.expires_at)}</div>
                            <div className="text-xs text-muted-foreground">Criada em {formatDateTimePtBR(license.created_at)}</div>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="icon" aria-label="Ações">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => void copyToClipboard(license.code, "Código")}>
                                  Copiar chave
                                </DropdownMenuItem>
                                {owner?.email ? (
                                  <DropdownMenuItem onSelect={() => void copyToClipboard(owner.email, "E-mail")}>
                                    Copiar e-mail
                                  </DropdownMenuItem>
                                ) : null}
                                {license.user_id ? (
                                  <DropdownMenuItem onSelect={() => void copyToClipboard(license.user_id!, "UUID")}>
                                    Copiar UUID
                                  </DropdownMenuItem>
                                ) : null}
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onSelect={() => openEdit(license)}>Editar</DropdownMenuItem>
                                <DropdownMenuItem
                                  onSelect={() => void handleDelete(license)}
                                  className="text-destructive"
                                  disabled={deletingId === license.id}
                                >
                                  {deletingId === license.id ? "Apagando..." : "Apagar"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Create */}
      <Card id="create-license" className="bg-card/60 backdrop-blur-sm border-border/60">
        <CardHeader>
          <CardTitle>Criar acesso ao suporte personalizado</CardTitle>
          <CardDescription>Gere um novo acesso ao suporte com dias, tipo e usuário opcionais.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-4 items-start" onSubmit={handleCreate}>
            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Chave de acesso ao suporte</label>
              <div className="flex gap-2">
                <Input
                  className="flex-1"
                  value={createCode}
                  onChange={(e) => setCreateCode(e.target.value.toUpperCase())}
                  placeholder="Deixe em branco para gerar automaticamente"
                />
                <Button type="button" variant="outline" size="sm" onClick={handleGenerateCode}>
                  Gerar
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                O código precisa ser único. Se já existir um igual, a criação será bloqueada.
              </p>
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Nome do acesso ao suporte</label>
              <Input
                value={createName}
                onChange={(e) => setCreateName(e.target.value)}
                placeholder="Ex: Plano de Suporte Anual Premium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Dias</label>
              <Input
                type="number"
                min={1}
                value={createDays}
                onChange={(e) => setCreateDays(e.target.value)}
                placeholder="Ex: 30, 365"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Tipo</label>
              <Input
                value={createType}
                onChange={(e) => setCreateType(e.target.value)}
                placeholder="standard, trial, etc."
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Vincular a usuário (opcional)</label>
              <UserCombobox
                users={assignmentUsers}
                loading={assignmentUsersLoading}
                error={assignmentUsersError}
                value={createUserId}
                onChange={setCreateUserId}
                placeholder="Buscar por e-mail, nome ou UUID"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="text-xs font-medium text-muted-foreground">Notas (opcional)</label>
              <Textarea
                value={createNotes}
                onChange={(e) => setCreateNotes(e.target.value)}
                placeholder="Observações internas sobre este acesso ao suporte"
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-3 md:col-span-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={createActive} onCheckedChange={setCreateActive} />
                <span className="text-xs text-muted-foreground">Ativar acesso ao suporte imediatamente</span>
              </div>
              <Button type="submit" disabled={creating}>
                {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Criar acesso ao suporte
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Edit Sheet */}
      <Sheet open={!!selected} onOpenChange={(open: boolean) => !open && setSelected(null)}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Editar acesso ao suporte</SheetTitle>
            <SheetDescription>
              Atualize status, expiração, tipo, notas e usuário vinculado.
            </SheetDescription>
          </SheetHeader>

          {selected ? (
            <form className="mt-6 grid gap-4" onSubmit={handleUpdate}>
              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <Input value={editName} onChange={(e) => setEditName(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">Usuário (opcional)</label>
                <UserCombobox
                  users={assignmentUsers}
                  loading={assignmentUsersLoading}
                  error={assignmentUsersError}
                  value={editUserId}
                  onChange={setEditUserId}
                  placeholder="Buscar por e-mail, nome ou UUID"
                />
                <p className="text-[11px] text-muted-foreground">
                  Deixe vazio para remover o vínculo.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Expira em</label>
                  <Input
                    type="datetime-local"
                    value={editExpiresAt}
                    onChange={(e) => setEditExpiresAt(e.target.value)}
                  />
                </div>
                <div className="grid gap-2">
                  <label className="text-xs font-medium text-muted-foreground">Tipo</label>
                  <Input value={editType} onChange={(e) => setEditType(e.target.value)} />
                </div>
              </div>

              <div className="grid gap-2">
                <label className="text-xs font-medium text-muted-foreground">Notas</label>
                <Textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} rows={3} />
              </div>

              <div className="flex items-center justify-between rounded-lg border border-border/60 bg-background/40 p-3">
                <div className="space-y-0.5">
                  <div className="text-sm font-medium">Acesso ao suporte ativo</div>
                  <div className="text-xs text-muted-foreground">Controla se o acesso ao suporte está habilitado.</div>
                </div>
                <Switch checked={editActive} onCheckedChange={setEditActive} />
              </div>

              <SheetFooter className="mt-2">
                <Button type="button" variant="outline" onClick={() => setSelected(null)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={updating}>
                  {updating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Salvar
                </Button>
              </SheetFooter>
            </form>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
