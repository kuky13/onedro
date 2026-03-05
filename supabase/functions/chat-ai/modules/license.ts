import { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function getUserLicense(supabase: SupabaseClient, userId: string) {
  try {
    const { data, error } = await supabase
      .rpc('get_user_license_status', {
        p_user_id: userId
      });

    if (error) {
      console.error('Error fetching license status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception fetching license status:', error);
    return null;
  }
}

export async function getUserLicenseHistory(
  supabase: SupabaseClient,
  userId: string
) {
  const { data, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);

  if (error) return [];
  return data || [];
}

export function calculateRemainingDays(expiresAt: string): number {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diffTime = expires.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
}

export function formatLicenseInfo(license: any): string {
  if (!license || !license.has_license) {
    return "❌ **NENHUMA LICENÇA ENCONTRADA**\n\nVocê não possui uma licença ativa no momento.";
  }

  const remainingDays = license.days_remaining || 0;
  const isValid = license.is_valid === true;
  const status = isValid ? "Ativa" : "Inativa/Expirada";
  const statusEmoji = isValid ? "✅" : "❌";
  
  // Informações sobre tipo de licença
  const licenseTypeInfo = license.is_trial 
    ? "🧪 Licença Trial" 
    : license.is_legacy 
    ? "⭐ Licença Legacy" 
    : "💎 Licença Normal";

  return `📜 **SUA LICENÇA ONEDRIP**

${statusEmoji} Status: ${status}
${licenseTypeInfo}
${license.license_code ? `🔑 Código: ${license.license_code}` : ""}
${license.activated_at ? `📅 Ativada em: ${new Date(license.activated_at).toLocaleDateString("pt-BR")}` : ""}
${
  license.expires_at
    ? `⏳ Válida até: ${new Date(license.expires_at).toLocaleDateString("pt-BR")}`
    : ""
}
${remainingDays > 0 ? `🕐 Dias restantes: ${remainingDays} dias` : ""}
${license.days_granted ? `📆 Dias concedidos: ${license.days_granted} dias` : ""}

${
  isValid
    ? "💡 Sua licença está em dia! Continue aproveitando todos os recursos."
    : license.requires_activation
    ? "⚠️ Sua licença precisa ser ativada. Acesse a página de licenças para ativar."
    : license.requires_renewal
    ? "⚠️ Sua licença expirou. Entre em contato para renovar."
    : "⚠️ Sua licença está inativa. Entre em contato com o suporte."
}

${license.message ? `\n💬 ${license.message}` : ""}`;
}
