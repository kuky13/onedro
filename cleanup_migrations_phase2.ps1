# Segunda fase da limpeza - remover duplicados específicos restantes

$migrationsPath = "F:\DEV\OENE\one-drip\supabase\migrations"

# Arquivos específicos que devem ser removidos (duplicados restantes)
$specificFilesToRemove = @(
    # Múltiplas correções de estrutura de função (manter apenas a mais recente)
    "20250206130000_fix_function_structure_mismatch.sql",
    "20250206140000_fix_function_structure_mismatch.sql",
    "20250206150000_final_fix_function_structure.sql",
    "20250206160000_final_fix_function_structure.sql",
    "20250206170000_final_fix_function_structure.sql",
    "20250206180000_final_fix_function_structure.sql",
    "20250206190000_final_fix_function_structure.sql",
    "20250206200000_final_fix_function_structure.sql",
    "20250206201500_final_fix_function_structure.sql",
    "20250206201530_final_fix_function_structure.sql",
    "20250206201545_final_fix_function_structure.sql",
    "20250206202000_final_fix_function_structure.sql",
    "20250206203000_final_fix_function_structure.sql",
    "20250206204500_final_fix_function_structure.sql",
    "20250206205000_final_fix_function_structure.sql",
    "20250206210000_final_fix_function_structure.sql",
    "20250206211500_final_fix_function_structure.sql",
    "20250206212000_final_fix_function_structure.sql",
    "20250206213000_final_fix_function_structure.sql",
    "20250206214000_final_fix_function_structure.sql",
    "20250206215000_final_fix_function_structure.sql",
    "20250206220000_final_fix_function_structure.sql",
    "20250206221000_final_fix_function_structure.sql",
    "20250206222000_final_fix_function_structure.sql",
    "20250206223000_final_fix_function_structure.sql",
    
    # Remoção de service orders count (duplicados)
    "20250208160000_remove_service_orders_count_from_admin_function.sql",
    "20250208161500_remove_service_orders_count_from_admin_function.sql",
    "20250208162345_remove_service_orders_count_from_admin_function.sql",
    
    # Arquivos sem timestamp específico (manter apenas os essenciais)
    "fix_ambiguous_column_id_reference_final.sql",
    "fix_ambiguous_id_column_error.sql",
    "fix_ambiguous_id_reference_admin_function.sql",
    "fix_clients_permissions.sql",
    "fix_delete_notification_function.sql",
    "fix_device_types_permissions.sql",
    "fix_function_return_types_compatibility.sql",
    "fix_function_return_types_final.sql",
    "fix_get_optimized_budgets_sequential.sql",
    "fix_license_status_column_reference.sql",
    "fix_notifications_bugs.sql",
    "fix_rls_policies_only.sql",
    "fix_service_orders_vip_enabled_column_error.sql",
    
    # Arquivos de estrutura de usuário duplicados
    "20250215_fix_user_management_structure.sql",
    "20250215152300_fix_user_id_column_references.sql",
    "20250215153200_fix_structure_query_mismatch.sql",
    
    # Outros arquivos temporários
    "create_get_service_order_edit_data_rpc.sql",
    "create_service_order_enhancements.sql",
    "create_user_cookie_preferences.sql",
    "add_admin_to_user.sql",
    "add_user_deleted_at_to_user_notifications.sql",
    "resolve_function_overload_conflict_definitive.sql"
)

Write-Host "Iniciando segunda fase da limpeza..." -ForegroundColor Green

# Obter todos os arquivos de migração
$allFiles = Get-ChildItem $migrationsPath -Name "*.sql"

Write-Host "Total de arquivos encontrados: $($allFiles.Count)" -ForegroundColor Yellow

# Filtrar apenas os arquivos que existem
$filesToRemove = @()
foreach ($file in $specificFilesToRemove) {
    if ($file -in $allFiles) {
        $filesToRemove += $file
    }
}

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
    
    Write-Host "`nSegunda fase da limpeza concluída!" -ForegroundColor Green
    Write-Host "Arquivos removidos: $removedCount" -ForegroundColor Green
    
    # Mostrar arquivos restantes
    $remainingFiles = Get-ChildItem $migrationsPath -Name "*.sql"
    Write-Host "Arquivos restantes: $($remainingFiles.Count)" -ForegroundColor Green
} else {
    Write-Host "Operação cancelada." -ForegroundColor Yellow
}