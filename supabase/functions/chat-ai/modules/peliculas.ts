import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getPeliculasForDevice(
  supabase: SupabaseClient,
  deviceModel: string
) {
  const { data: allPeliculas, error } = await supabase
    .from("peliculas_compatíveis")
    .select("*")
    .order("modelo", { ascending: true });

  if (error || !allPeliculas) {
    return [];
  }

  const cleanQuery = deviceModel
    .toLowerCase()
    .replace(/\b(samsung|galaxy|motorola|moto|xiaomi|redmi|poco|lg|iphone|apple)\b/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const results = allPeliculas.filter(pelicula => {
    const modeloLower = pelicula.modelo.toLowerCase();
    const deviceModelLower = deviceModel.toLowerCase();
    const queryLower = cleanQuery.toLowerCase();
    
    const modeloMatch = modeloLower.includes(queryLower) || 
                        modeloLower.includes(deviceModelLower);
    
    const compatibilidadesMatch = pelicula.compatibilidades?.some((comp: string) => {
      const compLower = comp.toLowerCase();
      return compLower.includes(queryLower) || 
             compLower.includes(deviceModelLower) ||
             queryLower.includes(compLower);
    });
    
    return modeloMatch || compatibilidadesMatch;
  });

  // Agrupa por tipo de match (exato no modelo ou nas compatibilidades)
  const grouped = results.map(pelicula => {
    const modeloMatch = pelicula.modelo.toLowerCase().includes(cleanQuery.toLowerCase());
    return {
      ...pelicula,
      matchType: modeloMatch ? 'exact' : 'compatible'
    };
  });

  return grouped.slice(0, 10);
}

export async function getAllPeliculasModels(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("peliculas_compatíveis")
    .select("modelo")
    .order("modelo", { ascending: true });

  if (error) return [];
  return data?.map((p) => p.modelo) || [];
}

export function suggestSimilarModels(
  deviceModel: string,
  availableModels: string[]
): string[] {
  const normalized = deviceModel.toLowerCase().replace(/\s+/g, "");
  
  return availableModels
    .filter((model) => {
      const normalizedModel = model.toLowerCase().replace(/\s+/g, "");
      // Verifica se há palavras em comum
      const words = normalized.split(/\d+/);
      return words.some(
        (word) => word.length > 2 && normalizedModel.includes(word)
      );
    })
    .slice(0, 5);
}

export function formatPeliculasForAI(
  peliculas: any[],
  deviceModel: string
): string {
  if (!peliculas || peliculas.length === 0) {
    return `NO_DATA_FOUND: Não encontrei películas compatíveis com "${deviceModel}".`;
  }

  let formatted = `📱 **PELÍCULAS COMPATÍVEIS COM ${deviceModel.toUpperCase()}**\n\n`;
  formatted += `✅ Encontrei ${peliculas.length} resultado(s):\n\n`;

  peliculas.forEach((pel, idx) => {
    formatted += `${idx + 1}️⃣ **Película: ${pel.modelo}**\n`;
    
    // Indica se é match exato ou compatível
    if (pel.matchType === 'compatible') {
      formatted += `   ℹ️ *Esta película é compatível com o modelo buscado*\n`;
    }
    
    if (pel.compatibilidades && pel.compatibilidades.length > 0) {
      formatted += `   🔄 **Também serve para:**\n`;
      pel.compatibilidades.slice(0, 5).forEach((comp: string) => {
        formatted += `      • ${comp}\n`;
      });
      if (pel.compatibilidades.length > 5) {
        formatted += `      • ... e mais ${pel.compatibilidades.length - 5} modelos\n`;
      }
    }
    formatted += `\n`;
  });

  formatted += `\n💡 **Dica:** Todas as películas listadas são compatíveis com o modelo pesquisado.`;

  return formatted;
}
