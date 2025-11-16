# Scripts de Automação - Refatoração One-Drip

## 🤖 Scripts Automatizados para Refatoração

Este documento contém scripts prontos para executar as refatorações identificadas no sistema One-Drip de forma automatizada e segura.

---

## 🔧 SETUP INICIAL

### Script de Backup e Preparação

**Arquivo:** `scripts/refactor-setup.sh`
```bash
#!/bin/bash

echo "🚀 Iniciando setup para refatoração One-Drip..."

# Criar backup
echo "📦 Criando backup..."
git add .
git commit -m "backup: estado antes da refatoração"
git tag backup-pre-refactor-$(date +%Y%m%d-%H%M%S)

# Criar branch de refatoração
echo "🌿 Criando branch de refatoração..."
git checkout -b refactor/cleanup-$(date +%Y%m%d)

# Instalar dependências de análise
echo "📋 Instalando ferramentas de análise..."
npm install --save-dev unimported depcheck webpack-bundle-analyzer

echo "✅ Setup concluído!"
```

### Script de Análise Inicial

**Arquivo:** `scripts/analyze-codebase.sh`
```bash
#!/bin/bash

echo "🔍 Analisando codebase..."

# Criar diretório de relatórios
mkdir -p reports

# Análise de imports não utilizados
echo "📊 Analisando imports não utilizados..."
npx unimported > reports/unused-imports.txt

# Análise de dependências
echo "📦 Analisando dependências..."
npx depcheck > reports/dependencies.txt

# Contagem de console.logs
echo "🐛 Contando console.logs..."
grep -r "console\." src/ --include="*.ts" --include="*.tsx" | wc -l > reports/console-logs-count.txt
grep -r "console\." src/ --include="*.ts" --include="*.tsx" > reports/console-logs-list.txt

# Contagem de TODOs
echo "📝 Contando TODOs..."
grep -r "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx" | wc -l > reports/todos-count.txt
grep -r "TODO\|FIXME\|XXX\|HACK" src/ --include="*.ts" --include="*.tsx" > reports/todos-list.txt

# Análise de duplicação
echo "🔄 Analisando duplicação..."
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n > reports/file-sizes.txt

echo "✅ Análise concluída! Verifique a pasta 'reports/'"
```

---

## 🧹 FASE 1 - LIMPEZA RÁPIDA

### Script de Remoção de Console.logs

**Arquivo:** `scripts/remove-console-logs.sh`
```bash
#!/bin/bash

echo "🧹 Removendo console.logs de debug..."

# Backup dos arquivos que serão modificados
echo "📦 Criando backup dos arquivos..."
find src/ -name "*.ts" -o -name "*.tsx" | xargs grep -l "console\." | while read file; do
  cp "$file" "$file.backup"
done

# Remover console.logs específicos de debug
echo "🗑️ Removendo console.logs de debug..."

# Padrões específicos para remover
patterns=(
  "console\.log.*DEBUG"
  "console\.error.*DEBUG"
  "console\.log.*🔍"
  "console\.log.*\[DEBUG\]"
  "console\.warn.*DEBUG"
)

for pattern in "${patterns[@]}"; do
  echo "Removendo padrão: $pattern"
  find src/ -name "*.ts" -o -name "*.tsx" | xargs sed -i "/$pattern/d"
done

# Remover console.logs em arquivos específicos
echo "🎯 Limpeza específica em arquivos prioritários..."

# serviceOrderPdfUtils.ts
sed -i '/console\.log.*PDF/d' src/utils/serviceOrderPdfUtils.ts
sed -i '/console\.error.*PDF/d' src/utils/serviceOrderPdfUtils.ts

# useNotifications.ts
sed -i '/console\.log.*notification/d' src/hooks/useNotifications.ts

# useShopProfile.ts
sed -i '/console\.log.*shop/d' src/hooks/useShopProfile.ts

echo "✅ Console.logs removidos!"
```

### Script de Consolidação de Rotas

**Arquivo:** `scripts/consolidate-routes.js`
```javascript
const fs = require('fs');
const path = require('path');

console.log('🛣️ Consolidando rotas duplicadas...');

const appTsxPath = path.join(__dirname, '../src/App.tsx');
let content = fs.readFileSync(appTsxPath, 'utf8');

// Backup
fs.writeFileSync(appTsxPath + '.backup', content);

// Substituições específicas
const replacements = [
  {
    // Rota /painel -> redirect para /dashboard
    from: /<Route path="\/painel" element={\s*<MaintenanceGuard>\s*<UnifiedProtectionGuard>\s*<DashboardLite \/>\s*<\/UnifiedProtectionGuard>\s*<\/MaintenanceGuard>\s*} \/>/g,
    to: '<Route path="/painel" element={<Navigate to="/dashboard" replace />} />'
  },
  {
    // Rota /admin-panel -> redirect para /admin
    from: /<Route path="\/admin-panel" element={\s*<AdminPanelModern \/>\s*} \/>/g,
    to: '<Route path="/admin-panel" element={<Navigate to="/admin" replace />} />'
  }
];

replacements.forEach((replacement, index) => {
  const before = content;
  content = content.replace(replacement.from, replacement.to);
  if (content !== before) {
    console.log(`✅ Substituição ${index + 1} aplicada`);
  } else {
    console.log(`⚠️ Substituição ${index + 1} não encontrada`);
  }
});

// Adicionar import do Navigate se não existir
if (!content.includes('Navigate')) {
  content = content.replace(
    'import { BrowserRouter as Router, Routes, Route',
    'import { BrowserRouter as Router, Routes, Route, Navigate'
  );
}

fs.writeFileSync(appTsxPath, content);
console.log('✅ Rotas consolidadas!');
```

### Script de Remoção de Código Comentado

**Arquivo:** `scripts/remove-commented-code.sh`
```bash
#!/bin/bash

echo "🗑️ Removendo código comentado..."

# Padrões de código comentado para remover
patterns=(
  "\/\/ const response = await fetch"
  "\/\/ await fetch"
  "\/\/ TODO: Implementar WhatsApp"
  "\/\*.*TODO.*\*\/"
  "\/\/ console\."
)

# Arquivos específicos para limpeza
files=(
  "src/services/auditService.ts"
  "src/utils/securityAuditLogger.ts"
  "src/utils/security/inputValidation.ts"
  "src/plans/PlansPage.tsx"
  "src/plans/components/PlanCard.tsx"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    echo "🧹 Limpando $file..."
    cp "$file" "$file.backup"
    
    for pattern in "${patterns[@]}"; do
      sed -i "/$pattern/d" "$file"
    done
  fi
done

echo "✅ Código comentado removido!"
```

---

## 🔧 FASE 2 - REFATORAÇÃO ESTRUTURAL

### Script de Análise de Hooks Duplicados

**Arquivo:** `scripts/analyze-auth-hooks.js`
```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

console.log('🔍 Analisando hooks de autenticação...');

const hooksDir = path.join(__dirname, '../src/hooks');
const authHooks = glob.sync(path.join(hooksDir, '**/use*Auth*.{ts,tsx}'));

console.log('📋 Hooks de autenticação encontrados:');
authHooks.forEach(hook => {
  const relativePath = path.relative(process.cwd(), hook);
  const content = fs.readFileSync(hook, 'utf8');
  const lines = content.split('\n').length;
  const exports = (content.match(/export.*use\w+/g) || []).length;
  
  console.log(`  📄 ${relativePath} (${lines} linhas, ${exports} exports)`);
});

// Análise de dependências entre hooks
console.log('\n🔗 Análise de dependências:');
authHooks.forEach(hook => {
  const content = fs.readFileSync(hook, 'utf8');
  const imports = content.match(/import.*from.*hooks/g) || [];
  if (imports.length > 0) {
    console.log(`  🔗 ${path.basename(hook)} importa:`);
    imports.forEach(imp => console.log(`    - ${imp}`));
  }
});

// Gerar relatório
const report = {
  totalHooks: authHooks.length,
  hooks: authHooks.map(hook => ({
    path: path.relative(process.cwd(), hook),
    lines: fs.readFileSync(hook, 'utf8').split('\n').length,
    exports: (fs.readFileSync(hook, 'utf8').match(/export.*use\w+/g) || []).length
  }))
};

fs.writeFileSync('reports/auth-hooks-analysis.json', JSON.stringify(report, null, 2));
console.log('\n✅ Relatório salvo em reports/auth-hooks-analysis.json');
```

### Script de Consolidação de Hooks

**Arquivo:** `scripts/consolidate-auth-hooks.js`
```javascript
const fs = require('fs');
const path = require('path');

console.log('🔧 Consolidando hooks de autenticação...');

// Definir estratégia de consolidação
const consolidationPlan = {
  keep: 'src/hooks/useAuth.tsx',
  merge: [
    'src/hooks/useAuthOptimized.ts',
    'src/hooks/useUnifiedAuth.ts'
  ],
  remove: [
    'src/hooks/useAuthSimple.tsx',
    'src/hooks/useStableAuth.ts'
  ],
  createNew: 'src/hooks/useAuthSecurity.ts'
};

// Backup dos arquivos
console.log('📦 Criando backup...');
[...consolidationPlan.merge, ...consolidationPlan.remove, consolidationPlan.keep]
  .forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, file + '.backup');
    }
  });

// Extrair funcionalidades úteis dos hooks a serem mesclados
console.log('🔄 Extraindo funcionalidades...');
const extractedFeatures = [];

consolidationPlan.merge.forEach(hookPath => {
  if (fs.existsSync(hookPath)) {
    const content = fs.readFileSync(hookPath, 'utf8');
    
    // Extrair exports principais
    const exports = content.match(/export const \w+ = [\s\S]*?(?=export|$)/g) || [];
    extractedFeatures.push({
      file: hookPath,
      exports: exports
    });
  }
});

// Gerar novo hook consolidado (template)
const consolidatedHookTemplate = `
// Consolidated Auth Hook - Generated by refactor script
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export const useAuth = () => {
  // Base functionality from useAuth.tsx
  // TODO: Merge extracted features from other hooks
  
  // Extracted features will be added here
  ${extractedFeatures.map(feature => 
    `// From ${feature.file}:\n// ${feature.exports.join('\n// ')}`
  ).join('\n\n')}
  
  return {
    // Consolidated API
  };
};
`;

// Salvar template para revisão manual
fs.writeFileSync('src/hooks/useAuth.consolidated.tsx', consolidatedHookTemplate);

console.log('✅ Template de consolidação criado em useAuth.consolidated.tsx');
console.log('⚠️ Revisão manual necessária antes de aplicar mudanças');
```

---

## 🧪 SCRIPTS DE TESTE E VALIDAÇÃO

### Script de Teste de Rotas

**Arquivo:** `scripts/test-routes.js`
```javascript
const puppeteer = require('puppeteer');

async function testRoutes() {
  console.log('🧪 Testando rotas...');
  
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  const routes = [
    'http://localhost:5173/',
    'http://localhost:5173/dashboard',
    'http://localhost:5173/painel',
    'http://localhost:5173/auth',
    'http://localhost:5173/plans',
    'http://localhost:5173/admin'
  ];
  
  const results = [];
  
  for (const route of routes) {
    try {
      console.log(`🔍 Testando ${route}...`);
      const response = await page.goto(route, { waitUntil: 'networkidle0' });
      
      results.push({
        url: route,
        status: response.status(),
        success: response.ok(),
        loadTime: Date.now() - response.request().timestamp()
      });
      
      console.log(`✅ ${route} - Status: ${response.status()}`);
    } catch (error) {
      console.log(`❌ ${route} - Erro: ${error.message}`);
      results.push({
        url: route,
        status: 'ERROR',
        success: false,
        error: error.message
      });
    }
  }
  
  await browser.close();
  
  // Salvar relatório
  const report = {
    timestamp: new Date().toISOString(),
    totalRoutes: routes.length,
    successfulRoutes: results.filter(r => r.success).length,
    results: results
  };
  
  require('fs').writeFileSync('reports/route-test-results.json', JSON.stringify(report, null, 2));
  console.log('📊 Relatório salvo em reports/route-test-results.json');
}

testRoutes().catch(console.error);
```

### Script de Validação de Build

**Arquivo:** `scripts/validate-build.sh`
```bash
#!/bin/bash

echo "🏗️ Validando build..."

# Limpar build anterior
echo "🧹 Limpando build anterior..."
rm -rf dist/

# Build de produção
echo "📦 Executando build..."
npm run build

if [ $? -eq 0 ]; then
  echo "✅ Build bem-sucedido!"
  
  # Análise do bundle
  echo "📊 Analisando bundle..."
  npx webpack-bundle-analyzer dist/assets/*.js --mode static --report reports/bundle-analysis.html --open false
  
  # Verificar tamanho dos arquivos
  echo "📏 Tamanhos dos arquivos:"
  find dist/ -name "*.js" -o -name "*.css" | xargs ls -lh
  
  # Verificar se não há console.logs em produção
  echo "🔍 Verificando console.logs em produção..."
  if grep -r "console\." dist/ > /dev/null; then
    echo "⚠️ Console.logs encontrados em produção!"
    grep -r "console\." dist/ > reports/production-console-logs.txt
  else
    echo "✅ Nenhum console.log em produção"
  fi
  
else
  echo "❌ Build falhou!"
  exit 1
fi
```

---

## 📊 SCRIPTS DE MÉTRICAS

### Script de Análise de Complexidade

**Arquivo:** `scripts/complexity-analysis.js`
```javascript
const fs = require('fs');
const path = require('path');
const glob = require('glob');

function calculateComplexity(content) {
  // Contadores básicos de complexidade
  const ifStatements = (content.match(/\bif\s*\(/g) || []).length;
  const forLoops = (content.match(/\bfor\s*\(/g) || []).length;
  const whileLoops = (content.match(/\bwhile\s*\(/g) || []).length;
  const switchStatements = (content.match(/\bswitch\s*\(/g) || []).length;
  const ternaryOperators = (content.match(/\?.*:/g) || []).length;
  const logicalOperators = (content.match(/&&|\|\|/g) || []).length;
  
  return ifStatements + forLoops + whileLoops + switchStatements + ternaryOperators + logicalOperators;
}

console.log('📊 Analisando complexidade do código...');

const files = glob.sync('src/**/*.{ts,tsx}');
const results = [];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n').length;
  const complexity = calculateComplexity(content);
  const complexityPerLine = lines > 0 ? (complexity / lines).toFixed(3) : 0;
  
  results.push({
    file: path.relative(process.cwd(), file),
    lines,
    complexity,
    complexityPerLine: parseFloat(complexityPerLine)
  });
});

// Ordenar por complexidade
results.sort((a, b) => b.complexity - a.complexity);

// Estatísticas
const totalFiles = results.length;
const totalLines = results.reduce((sum, r) => sum + r.lines, 0);
const totalComplexity = results.reduce((sum, r) => sum + r.complexity, 0);
const averageComplexity = (totalComplexity / totalFiles).toFixed(2);

console.log(`📈 Estatísticas de Complexidade:`);
console.log(`   Total de arquivos: ${totalFiles}`);
console.log(`   Total de linhas: ${totalLines}`);
console.log(`   Complexidade total: ${totalComplexity}`);
console.log(`   Complexidade média: ${averageComplexity}`);

// Top 10 arquivos mais complexos
console.log(`\n🔥 Top 10 arquivos mais complexos:`);
results.slice(0, 10).forEach((result, index) => {
  console.log(`   ${index + 1}. ${result.file} (${result.complexity} pontos, ${result.lines} linhas)`);
});

// Salvar relatório completo
const report = {
  timestamp: new Date().toISOString(),
  summary: {
    totalFiles,
    totalLines,
    totalComplexity,
    averageComplexity: parseFloat(averageComplexity)
  },
  files: results
};

fs.writeFileSync('reports/complexity-analysis.json', JSON.stringify(report, null, 2));
console.log('\n✅ Relatório completo salvo em reports/complexity-analysis.json');
```

---

## 🚀 SCRIPT MASTER DE EXECUÇÃO

### Script Principal

**Arquivo:** `scripts/run-refactor.sh`
```bash
#!/bin/bash

echo "🚀 Iniciando Refatoração Completa One-Drip"
echo "=========================================="

# Verificar se estamos no diretório correto
if [ ! -f "package.json" ]; then
  echo "❌ Execute este script na raiz do projeto!"
  exit 1
fi

# Menu de opções
echo "Escolha a fase da refatoração:"
echo "1. Setup e Análise Inicial"
echo "2. Fase 1 - Limpeza Rápida"
echo "3. Fase 2 - Refatoração Estrutural"
echo "4. Fase 3 - Reorganização"
echo "5. Testes e Validação"
echo "6. Executar Tudo (Automático)"
echo "0. Sair"

read -p "Digite sua opção: " option

case $option in
  1)
    echo "🔧 Executando Setup e Análise..."
    bash scripts/refactor-setup.sh
    bash scripts/analyze-codebase.sh
    ;;
  2)
    echo "🧹 Executando Limpeza Rápida..."
    bash scripts/remove-console-logs.sh
    node scripts/consolidate-routes.js
    bash scripts/remove-commented-code.sh
    ;;
  3)
    echo "🔧 Executando Refatoração Estrutural..."
    node scripts/analyze-auth-hooks.js
    node scripts/consolidate-auth-hooks.js
    ;;
  4)
    echo "🗂️ Executando Reorganização..."
    echo "⚠️ Esta fase requer intervenção manual"
    echo "Consulte o plano de implementação"
    ;;
  5)
    echo "🧪 Executando Testes..."
    bash scripts/validate-build.sh
    node scripts/test-routes.js
    node scripts/complexity-analysis.js
    ;;
  6)
    echo "🚀 Executando Refatoração Completa..."
    bash scripts/refactor-setup.sh
    bash scripts/analyze-codebase.sh
    bash scripts/remove-console-logs.sh
    node scripts/consolidate-routes.js
    bash scripts/remove-commented-code.sh
    node scripts/analyze-auth-hooks.js
    bash scripts/validate-build.sh
    echo "✅ Refatoração automática concluída!"
    echo "⚠️ Revisão manual necessária para fases avançadas"
    ;;
  0)
    echo "👋 Saindo..."
    exit 0
    ;;
  *)
    echo "❌ Opção inválida!"
    exit 1
    ;;
esac

echo "✅ Operação concluída!"
echo "📊 Verifique os relatórios na pasta 'reports/'"
```

---

## 📋 INSTRUÇÕES DE USO

### Pré-requisitos
```bash
# Instalar dependências necessárias
npm install --save-dev puppeteer glob unimported depcheck webpack-bundle-analyzer
```

### Execução
```bash
# Dar permissão aos scripts
chmod +x scripts/*.sh

# Executar script principal
bash scripts/run-refactor.sh
```

### Estrutura de Relatórios
```
reports/
├── unused-imports.txt
├── dependencies.txt
├── console-logs-count.txt
├── console-logs-list.txt
├── todos-count.txt
├── todos-list.txt
├── file-sizes.txt
├── auth-hooks-analysis.json
├── route-test-results.json
├── bundle-analysis.html
├── complexity-analysis.json
└── production-console-logs.txt
```

---

*Scripts de automação gerados em: Janeiro 2025*  
*Versão: 1.0*