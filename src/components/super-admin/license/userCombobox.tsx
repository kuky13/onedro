import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

import type { AdminUserForAssignment } from "./types";

type Props = {
  users: AdminUserForAssignment[] | null;
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (userId: string) => void;
  placeholder?: string;
};

export function UserCombobox({ users, loading, error, value, onChange, placeholder }: Props) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(() => {
    const id = value.trim();
    if (!id || !users) return null;
    return users.find((u) => u.id === id) ?? null;
  }, [users, value]);

  const label = selected ? `${selected.email}${selected.full_name ? ` • ${selected.full_name}` : ""}` : value ? value : "Selecionar";

  return (
    <div className="grid gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
          >
            <span className={cn("truncate", !value && "text-muted-foreground")}>{label}</span>
            <ChevronsUpDown className="h-4 w-4 opacity-60" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder={placeholder ?? "Buscar..."} />
            <CommandList>
              {loading ? (
                <div className="flex items-center justify-center gap-2 p-4 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Carregando...
                </div>
              ) : error ? (
                <div className="p-4 text-sm text-muted-foreground">{error}</div>
              ) : (
                <>
                  <CommandEmpty>Nenhum usuário encontrado.</CommandEmpty>
                  <CommandGroup>
                    {(users ?? []).map((u) => (
                      <CommandItem
                        key={u.id}
                        value={`${u.email} ${u.full_name} ${u.id}`}
                        onSelect={() => {
                          onChange(u.id);
                          setOpen(false);
                        }}
                      >
                        <Check className={cn("mr-2 h-4 w-4", u.id === value ? "opacity-100" : "opacity-0")} />
                        <div className="flex flex-col">
                          <span className="text-sm">{u.email}</span>
                          <span className="text-xs text-muted-foreground truncate">{u.full_name}</span>
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground font-mono">{u.id.slice(0, 8)}…</span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* fallback manual */}
      <input
        className={cn(
          "h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
          "placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Ou cole o UUID manualmente"
      />
    </div>
  );
}
