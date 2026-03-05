# Script de Deploy das Edge Functions do Mercado Pago (PowerShell)

$ErrorActionPreference = "Continue"

Write-Host "Iniciando deploy das Edge Functions do Mercado Pago..." -ForegroundColor Cyan
Write-Host ""

# Verificar se NPM/NPX esta instalado
try {
    $null = Get-Command npx -ErrorAction Stop
    Write-Host "NPM/NPX encontrado" -ForegroundColor Green
} catch {
    Write-Host "NPM nao encontrado! Instale Node.js." -ForegroundColor Red
    exit 1
}

# Verificar se esta logado
Write-Host "Verificando login no Supabase..." -ForegroundColor Yellow
# Redireciona stdout e stderr para null para nao sujar a tela se falhar, verificamos exitcode
cmd /c "npx -y supabase projects list > NUL 2>&1"
if ($LASTEXITCODE -eq 0) {
    Write-Host "Autenticado no Supabase" -ForegroundColor Green
} else {
    Write-Host "Nao esta logado no Supabase" -ForegroundColor Yellow
    Write-Host "Tentando fazer login... (Siga as instrucoes no navegador se abrir)" -ForegroundColor Yellow
    npx -y supabase login
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Falha no login!" -ForegroundColor Red
        exit 1
    }
}

Write-Host ""

# Lista de funcoes para deploy
$functions = @(
    "create-mercadopago-checkout",
    "mercadopago-webhook",
    "check-mercadopago-payment",
    "send-license-email",
    "send-payment-receipt-email"
)

# Fazer deploy de cada funcao
foreach ($func in $functions) {
    Write-Host "Fazendo deploy de: $func" -ForegroundColor Yellow
    
    # Executa o deploy
    npx -y supabase functions deploy $func
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$func deployado com sucesso!" -ForegroundColor Green
    } else {
        Write-Host "Erro ao fazer deploy de $func" -ForegroundColor Red
        exit 1
    }
    Write-Host ""
}

Write-Host "Todas as funcoes foram deployadas com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Cyan
Write-Host "1. Verifique as funcoes no Dashboard do Supabase"
Write-Host "2. Configure o webhook no Mercado Pago"
Write-Host "3. Teste a integracao"
Write-Host ""
