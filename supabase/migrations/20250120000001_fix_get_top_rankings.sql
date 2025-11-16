-- Corrigir função get_top_rankings removendo referência à coluna is_active inexistente
-- Primeiro, dropar a função existente
DROP FUNCTION IF EXISTS public.get_top_rankings();

-- Recriar a função com a estrutura correta
CREATE FUNCTION public.get_top_rankings()
RETURNS TABLE(
  id uuid,
  user_name text,
  score integer,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  WITH ranked_scores AS (
    SELECT 
      ri.id,
      up.name as user_name,
      ri.score,
      ri.created_at,
      ROW_NUMBER() OVER (PARTITION BY ri.user_id ORDER BY ri.score DESC, ri.created_at ASC) as rn
    FROM public.ranking_invaders ri
    INNER JOIN public.user_profiles up ON ri.user_id = up.id
  )
  SELECT 
    ranked_scores.id,
    ranked_scores.user_name,
    ranked_scores.score,
    ranked_scores.created_at
  FROM ranked_scores
  WHERE rn = 1
  ORDER BY score DESC, created_at ASC
  LIMIT 10;
$$;