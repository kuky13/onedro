import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UniversalSearchInput } from "@/components/ui/ios-optimized/UniversalSearchInput";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Search as SearchIcon } from "lucide-react";
import { toast } from "sonner";

interface PeliculaCompativel {
  id: string;
  modelo: string;
  compatibilidades: string[];
  created_at: string;
  updated_at: string;
}

const PeliculasCompatibilityPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const {
    data: peliculas,
    isLoading
  } = useQuery({
    queryKey: ["peliculas-compativeis"],
    queryFn: async () => {
      const { data, error } = await supabase.from("peliculas_compatíveis").select("*").order("modelo", { ascending: true });
      if (error) {
        toast.error("Erro ao carregar películas compatíveis");
        throw error;
      }
      return data as PeliculaCompativel[];
    }
  });

  const filteredPeliculas = peliculas?.filter(pelicula => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    const modeloMatch = pelicula.modelo.toLowerCase().includes(query);
    const compatibilidadesMatch = pelicula.compatibilidades.some(comp => comp.toLowerCase().includes(query));
    return modeloMatch || compatibilidadesMatch;
  });

  const getSearchResults = () => {
    if (!searchQuery.trim()) return filteredPeliculas;
    const query = searchQuery.toLowerCase();
    const results: Array<PeliculaCompativel & { matchType: "exact" | "compatible" }> = [];
    filteredPeliculas?.forEach(pelicula => {
      const modeloMatch = pelicula.modelo.toLowerCase().includes(query);
      if (modeloMatch) {
        results.push({ ...pelicula, matchType: "exact" });
      } else {
        const compatMatch = pelicula.compatibilidades.some(comp => comp.toLowerCase().includes(query));
        if (compatMatch) {
          results.push({ ...pelicula, matchType: "compatible" });
        }
      }
    });
    return results;
  };

  const searchResults = getSearchResults();

  return (
    <div className="min-h-screen bg-background">
      {/* Header - iOS premium */}
      <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-2xl border-b border-border/30">
        <div className="flex items-center gap-3 px-4 py-3 max-w-4xl mx-auto">
          <button
            className="rounded-xl h-10 w-10 flex items-center justify-center border border-border/50 bg-background hover:bg-muted/40 transition-all active:scale-95"
            onClick={() => navigate('/dashboard')}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-primary/10 rounded-xl">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight">Películas Compatíveis</h1>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6 pb-[env(safe-area-inset-bottom)]">
        <p className="text-sm text-muted-foreground text-center">
          Busque pelo modelo e descubra quais películas são compatíveis
        </p>

        {/* Search */}
        <UniversalSearchInput
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery("")}
          placeholder="Digite o modelo (ex: A12, iPhone 13, Redmi Note 10)"
          id="pelicula-search"
        />

        {/* Results */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground px-1">
              <SearchIcon className="h-4 w-4" />
              <span>{searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""}</span>
            </div>

            {searchResults.map(pelicula => (
              <div key={pelicula.id} className="rounded-xl border border-border/30 bg-muted/5 overflow-hidden transition-all duration-300 hover:bg-muted/15">
                <div className="px-4 py-3 bg-muted/20 border-b border-border/20">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Smartphone className="h-4 w-4 text-primary" />
                      {pelicula.modelo}
                    </div>
                    {"matchType" in pelicula && pelicula.matchType === "compatible" && (
                      <Badge variant="secondary" className="text-[10px] rounded-lg bg-primary/10 text-primary border border-primary/20">
                        Compatível
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="p-4 space-y-2.5">
                  <p className="text-xs font-medium text-muted-foreground">
                    Esta película também serve para:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {pelicula.compatibilidades.map((comp, idx) => (
                      <Badge
                        key={idx}
                        variant={searchQuery.trim() && comp.toLowerCase().includes(searchQuery.toLowerCase()) ? "default" : "outline"}
                        className="text-[10px] rounded-lg"
                      >
                        {comp}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <div className="text-center py-12 rounded-2xl border border-border/30 bg-muted/5">
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-semibold mb-1.5">Nenhum resultado</h3>
            <p className="text-sm text-muted-foreground mb-4">Tente buscar por outro modelo</p>
            <Button onClick={() => navigate('/p/edit')} className="rounded-xl">Sugerir modelo</Button>
          </div>
        ) : (
          <div className="text-center py-12 rounded-2xl border border-border/30 bg-muted/5">
            <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
            <h3 className="text-base font-semibold mb-1.5">Digite um modelo</h3>
            <p className="text-sm text-muted-foreground">Encontre películas compatíveis com seu aparelho</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PeliculasCompatibilityPage;
