# Script para limpar migrações duplicadas e desnecessárias
# Mantém apenas as migrações essenciais e mais recentes

$migrationsPath = "F:\DEV\OENE\one-drip\supabase\migrations"

# Lista de migrações essenciais que devem ser preservadas (estruturas principais)
$essentialMigrations = @(
    # Criação de tabelas principais
    "20240117000000_create_service_orders_types.sql",
    "20240117000001_create_service_orders.sql",
    "20240117000002_create_service_order_items.sql",
    "20240117000003_create_service_order_events.sql",
    "20240117000004_create_service_order_attachments.sql",
    "20240117000005_create_service_orders_rpcs.sql",
    "20240119000000_enhance_license_system.sql",
    "20240125000000_create_whatsapp_analytics_tables.sql",
    
    # Sistema de licenças principal
    "20250101000000_new_license_system_13_digits.sql",
    "20250101000001_license_system_triggers.sql",
    "20250101000002_license_migration_compatibility.sql",
    "20250101000003_license_system_rpc_functions.sql",
    "20250101000004_license_permissions_check.sql",
    "20250101000005_license_cleanup_automation.sql",
    
    # Estruturas principais do sistema
    "20250120000000_license_management_functions.sql",
    "20250120000001_license_management_functions_fixed.sql",
    "20250120000000_new_license_system_core_functions.sql",
    "20250120000001_enhanced_user_management.sql",
    "20250120000001_trial_license_system.sql",
    
    # Notificações e push
    "20241221000003_create_notifications_table.sql",
    "20241221000004_add_push_subscriptions.sql",
    "20250120000001_enhance_push_notifications.sql",
    
    # Compartilhamento de ordens de serviço
    "20250127000001_create_service_order_sharing_tables.sql",
    "20250127000002_create_company_share_settings.sql",
    "20250127000002_create_service_order_sharing_functions.sql",
    
    # Sistema de status
    "20250909120000_create_system_status_houston.sql",
    
    # Melhorias de usuário e licenças mais recentes
    "20250814000001_enhanced_user_license_management.sql",
    
    # Correção final do admin_id (mais recente)
    "fix_admin_id_license_history_final.sql"
)

# Padrões de arquivos que devem ser removidos (duplicados)
$duplicatePatterns = @(
    "*fix_admin_function*",
    "*fix_admin_id_column_in_license_history*",
    "*fix_admin_id_column_references*",
    "*fix_created_by_column_error*",
    "*fix_function_overload_conflict*",
    "*fix_activate_license_enhanced*",
    "*enhance_admin_users_with_detailed_license_info*",
    "*fix_admin_get_all_users_detailed*",
    "*fix_structure_mismatch*",
    "*fix_confirmation_code*",
    "*fix_device_serial*",
    "*fix_gen_random_bytes*",
    "*remove_audit_service_orders*",
    "*fix_is_active_column*",
    "*fix_dashboard_stats*",
    "*force_fix_admin*",
    "*final_fix_admin*",
    "*definitive_admin*",
    "*ultimate_admin*",
    "*fix_admin_transfer_license*",
    "*fix_user_structure*",
    "*fix_id_ambiguity*",
    "*fix_email_column*",
    "*fix_parameter_order*",
    "*fix_type_compatibility*"
)

# Arquivos temporários e de debug que devem ser removidos
$debugFiles = @(
    "debug_rpc_function.sql",
    "check_permissions.sql",
    "check_sequential_numbers.sql",
    "security_audit.sql",
    "security_report.sql",
    "simple_security_audit.sql",
    "final_security_check.sql",
    "validate_security.sql",
    "verify_fix.sql",
    "update_cnpj_test.sql",
    "check_cnpj_status.sql"
)

Write-Host "Iniciando limpeza de migrações duplicadas..." -ForegroundColor Green

# Obter todos os arquivos de migração
$allFiles = Get-ChildItem $migrationsPath -Name "*.sql"

Write-Host "Total de arquivos encontrados: $($allFiles.Count)" -ForegroundColor Yellow

# Arquivos para remover
$filesToRemove = @()

# Adicionar arquivos que correspondem aos padrões duplicados
foreach ($pattern in $duplicatePatterns) {
    $matchingFiles = $allFiles | Where-Object { $_ -like $pattern }
    foreach ($file in $matchingFiles) {
        if ($file -notin $essentialMigrations) {
            $filesToRemove += $file
        }
    }
}

# Adicionar arquivos de debug
foreach ($debugFile in $debugFiles) {
    if ($debugFile -in $allFiles) {
        $filesToRemove += $debugFile
    }
}

# Remover arquivos com timestamps muito altos (99999999999999_*)
$highTimestampFiles = $allFiles | Where-Object { $_ -match "^99999999999999_" }
foreach ($file in $highTimestampFiles) {
    if ($file -notin $essentialMigrations) {
        $filesToRemove += $file
    }
}

# Remover duplicados da lista
$filesToRemove = $filesToRemove | Sort-Object | Get-Unique

Write-Host "Arquivos que serão removidos: $($filesToRemove.Count)" -ForegroundColor Red

# Mostrar lista de arquivos que serão removidos
Write-Host "`nArquivos que serão removidos:" -ForegroundColor Red
foreach ($file in $filesToRemove) {
    Write-Host "  - $file" -ForegroundColor Red
}

# Confirmar antes de remover
$confirmation = Read-Host "`nDeseja continuar com a remoção? (s/N)"
if ($confirmation -eq 's' -or $confirmation -eq 'S') {
    $removedCount = 0
    foreach ($file in $filesToRemove) {
        $fullPath = Join-Path $migrationsPath $file
        if (Test-Path $fullPath) {
            Remove-Item $fullPath -Force
            $removedCount++
            Write-Host "Removido: $file" -ForegroundColor Yellow
        }
    }
    
    Write-Host "`nLimpeza concluída!" -ForegroundColor Green
    Write-Host "Arquivos removidos: $removedCount" -ForegroundColor Green
    
    # Mostrar arquivos restantes
    $remainingFiles = Get-ChildItem $migrationsPath -Name "*.sql"
    Write-Host "Arquivos restantes: $($remainingFiles.Count)" -ForegroundColor Green
} else {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
}