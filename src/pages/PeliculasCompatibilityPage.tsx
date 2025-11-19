import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { UniversalSearchInput } from "@/components/ui/ios-optimized/UniversalSearchInput";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

  const { data: peliculas, isLoading } = useQuery({
    queryKey: ["peliculas-compativeis"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("peliculas_compatíveis")
        .select("*")
        .order("modelo", { ascending: true });

      if (error) {
        toast.error("Erro ao carregar películas compatíveis");
        throw error;
      }

      return data as PeliculaCompativel[];
    },
  });

  // Busca inteligente: busca no modelo principal e nas compatibilidades
  const filteredPeliculas = peliculas?.filter((pelicula) => {
    if (!searchQuery.trim()) return true;

    const query = searchQuery.toLowerCase();
    const modeloMatch = pelicula.modelo.toLowerCase().includes(query);
    const compatibilidadesMatch = pelicula.compatibilidades.some((comp) =>
      comp.toLowerCase().includes(query)
    );

    return modeloMatch || compatibilidadesMatch;
  });

  // Agrupa resultados: se buscar por um modelo compatível, mostra qual película usar
  const getSearchResults = () => {
    if (!searchQuery.trim()) return filteredPeliculas;

    const query = searchQuery.toLowerCase();
    const results: Array<PeliculaCompativel & { matchType: "exact" | "compatible" }> = [];

    filteredPeliculas?.forEach((pelicula) => {
      const modeloMatch = pelicula.modelo.toLowerCase().includes(query);
      
      if (modeloMatch) {
        results.push({ ...pelicula, matchType: "exact" });
      } else {
        const compatMatch = pelicula.compatibilidades.some((comp) =>
          comp.toLowerCase().includes(query)
        );
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
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-4">
          <button
            className="inline-flex items-center px-4 py-2 rounded-md border border-border/50 bg-background hover:bg-accent hover:text-accent-foreground transition"
            onClick={() => navigate('/dashboard')}
          >
            <Smartphone className="h-4 w-4 mr-2" />
            Voltar
          </button>
        </div>
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Smartphone className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Películas Compatíveis</h1>
          </div>
          <p className="text-muted-foreground">
            Busque por modelo e descubra quais películas são compatíveis
          </p>
        </div>

        {/* Barra de Pesquisa */}
        <div className="mb-8">
          <UniversalSearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            onClear={() => setSearchQuery("")}
            placeholder="Digite o modelo do aparelho (ex: A12, iPhone 13, Redmi Note 10)"
            id="pelicula-search"
          />
        </div>

        {/* Resultados */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : searchResults && searchResults.length > 0 ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <SearchIcon className="h-4 w-4" />
              <span>
                {searchResults.length} resultado{searchResults.length !== 1 ? "s" : ""} encontrado
                {searchResults.length !== 1 ? "s" : ""}
              </span>
            </div>

            {searchResults.map((pelicula) => (
              <Card key={pelicula.id} className="overflow-hidden transition-all hover:shadow-md">
                <CardHeader className="bg-muted/30">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Smartphone className="h-5 w-5 text-primary" />
                      {pelicula.modelo}
                    </CardTitle>
                    {"matchType" in pelicula && pelicula.matchType === "compatible" && (
                      <Badge variant="secondary" className="ml-2">
                        Compatível
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-3">
                    <p className="text-sm font-medium text-muted-foreground">
                      Esta película também serve para:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {pelicula.compatibilidades.map((comp, idx) => (
                        <Badge
                          key={idx}
                          variant={
                            searchQuery.trim() &&
                            comp.toLowerCase().includes(searchQuery.toLowerCase())
                              ? "default"
                              : "outline"
                          }
                          className="text-xs"
                        >
                          {comp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchQuery.trim() ? (
          <Card className="text-center py-12">
            <CardContent>
              <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Nenhum resultado encontrado</h3>
              <p className="text-muted-foreground">
                Tente buscar por outro modelo ou verifique a ortografia
              </p>
              <div className="mt-6 space-y-2">
                <p className="text-sm text-muted-foreground">Não encontrou seu modelo? Envie sua sugestão para adicionarmos.</p>
                <Button onClick={() => navigate('/p/edit')} className="inline-flex items-center">
                  Sugerir modelo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="text-center py-12">
            <CardContent>
              <Smartphone className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Digite um modelo para buscar</h3>
              <p className="text-muted-foreground">
                Encontre rapidamente películas compatíveis com seu aparelho
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default PeliculasCompatibilityPage;
