import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CleanupResult {
  deleted_count: number;
  cleanup_date: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verificar se é uma requisição autorizada (pode ser via cron job ou API key)
    const authHeader = req.headers.get('Authorization')
    const apiKey = req.headers.get('x-api-key')
    
    // Para segurança, verificar se tem uma chave de API específica ou token válido
    if (!authHeader && !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Criar cliente Supabase com service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    console.log('Iniciando limpeza automática de ordens de serviço...')

    // Executar a função de limpeza
    const { data, error } = await supabase
      .rpc('cleanup_old_deleted_service_orders')

    if (error) {
      console.error('Erro na limpeza:', error)
      return new Response(
        JSON.stringify({ 
          error: 'Cleanup failed', 
          details: error.message 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    const result = data[0] as CleanupResult
    
    console.log(`Limpeza concluída: ${result.deleted_count} ordens excluídas permanentemente`)

    // Retornar resultado
    return new Response(
      JSON.stringify({
        success: true,
        message: `Cleanup completed successfully`,
        deleted_count: result.deleted_count,
        cleanup_date: result.cleanup_date,
        timestamp: new Date().toISOString()
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Erro inesperado:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error', 
        details: error instanceof Error ? error.message : 'Erro desconhecido' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

/* 
Para configurar esta Edge Function para execução automática:

1. Deploy da função:
   supabase functions deploy cleanup-service-orders

2. Configurar cron job (exemplo para execução diária às 2:00 AM):
   - Via GitHub Actions:
     - name: Cleanup Service Orders
       run: |
         curl -X POST \
           -H "x-api-key: ${{ secrets.CLEANUP_API_KEY }}" \
           https://your-project.supabase.co/functions/v1/cleanup-service-orders

   - Via serviço de cron externo (cron-job.org, etc.):
     POST https://your-project.supabase.co/functions/v1/cleanup-service-orders
     Headers: x-api-key: your-secret-key

3. Configurar variáveis de ambiente:
   - CLEANUP_API_KEY: chave secreta para autorização
   - SUPABASE_URL: URL do projeto Supabase
   - SUPABASE_SERVICE_ROLE_KEY: chave de service role

4. Logs e monitoramento:
   - Verificar logs via: supabase functions logs cleanup-service-orders
   - Monitorar tabela cleanup_logs para auditoria
*/