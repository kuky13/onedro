import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminLicense, LicenseStatusFilter } from "@/components/super-admin/license/types";

export function useAdminLicenseList() {
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LicenseStatusFilter>("");

  const filteredLicenses = useMemo(
    () => licenses.filter((l) => !(l.notes ?? "").startsWith("[DELETADA]")),
    [licenses]
  );

  const load = useCallback(
    async (opts?: { search?: string; status?: LicenseStatusFilter }) => {
      setLoading(true);
      setError(null);

      const pSearch = (opts?.search ?? search).trim();
      const pStatus = (opts?.status ?? statusFilter).trim() as LicenseStatusFilter;

      try {
        const params: { p_page: number; p_page_size: number; p_search?: string; p_status?: string } = {
          p_page: 1,
          p_page_size: 100,
        };

        if (pSearch) params.p_search = pSearch;
        if (pStatus) params.p_status = pStatus;

        const { data, error } = await (supabase as any).rpc("admin_list_licenses", params);
        if (error) throw error;
        setLicenses((data ?? []) as unknown as AdminLicense[]);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao carregar licenças";
        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  // Debounce de busca/filtro
  useEffect(() => {
    const t = window.setTimeout(() => {
      void load();
    }, 400);

    return () => window.clearTimeout(t);
  }, [search, statusFilter, load]);

  return {
    licenses: filteredLicenses,
    rawLicenses: licenses,
    loading,
    error,
    search,
    setSearch,
    statusFilter,
    setStatusFilter,
    reload: load,
  };
}
