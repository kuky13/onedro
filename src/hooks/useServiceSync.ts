import { supabase } from '@/integrations/supabase/client';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SyncableBudgetPart {
  id: string;
  name: string;
  part_type?: string | null;
  price: number;            // centavos
  cash_price?: number | null;
  installment_price?: number | null;
  installment_count?: number | null;
  warranty_months?: number | null;
  quantity?: number | null;
}

export interface SyncableBudget {
  id: string;
  device_type: string;
  device_model: string;
  owner_id: string;
}

export interface SyncLink {
  id: string;
  budget_part_id: string;
  store_service_id: string;
  owner_id: string;
  last_synced_at: string;
  sync_direction: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

const centavosToReais = (v: number | null | undefined) => (v ? v / 100 : 0);
const reaisToCentavos = (v: number | null | undefined) => (v ? Math.round(v * 100) : 0);
const monthsToDays = (m: number | null | undefined) => (m ? m * 30 : 90);
const daysToMonths = (d: number | null | undefined) => (d ? Math.round(d / 30) : 3);

// ── Find / Create brand & device (reuse logic from useImportBudgetToStore) ──

async function findOrCreateBrand(storeId: string, brandName: string): Promise<string | null> {
  if (!storeId || !brandName) return null;
  const { data: existing } = await supabase
    .from('store_brands')
    .select('id')
    .eq('store_id', storeId)
    .ilike('name', brandName.trim())
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('store_brands')
    .insert({ store_id: storeId, name: brandName.trim() })
    .select('id')
    .single();
  if (error) { console.error('findOrCreateBrand error', error); return null; }
  return created.id;
}

async function findOrCreateDevice(storeId: string, brandId: string, deviceName: string): Promise<string | null> {
  if (!storeId || !brandId || !deviceName) return null;
  const { data: existing } = await supabase
    .from('store_devices')
    .select('id')
    .eq('brand_id', brandId)
    .ilike('name', deviceName.trim())
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('store_devices')
    .insert({ store_id: storeId, brand_id: brandId, name: deviceName.trim() })
    .select('id')
    .single();
  if (error) { console.error('findOrCreateDevice error', error); return null; }
  return created.id;
}

// ── Core sync functions ─────────────────────────────────────────────────────

/**
 * Worm → Store: After a budget_part is created/updated, push to store_services.
 */
export async function syncPartToStore(
  storeId: string,
  userId: string,
  part: SyncableBudgetPart,
  budget: SyncableBudget,
) {
  try {
    // 1. Check existing link
    const { data: existingLink } = await supabase
      .from('service_sync_links')
      .select('id, store_service_id')
      .eq('budget_part_id', part.id)
      .maybeSingle();

    const servicePayload = {
      name: part.name || part.part_type || 'Serviço',
      category: part.part_type || 'Geral',
      price: centavosToReais(part.cash_price || part.price),
      installment_price: centavosToReais(part.installment_price || part.cash_price || part.price),
      warranty_days: monthsToDays(part.warranty_months),
      max_installments: part.installment_count || 1,
    };

    if (existingLink) {
      // Update existing store_service
      await supabase
        .from('store_services')
        .update(servicePayload)
        .eq('id', existingLink.store_service_id);

      await supabase
        .from('service_sync_links')
        .update({ last_synced_at: new Date().toISOString(), sync_direction: 'worm_to_store' })
        .eq('id', existingLink.id);
    } else {
      // Create brand → device → service
      const brandId = await findOrCreateBrand(storeId, budget.device_type);
      if (!brandId) return;
      const deviceId = await findOrCreateDevice(storeId, brandId, budget.device_model);
      if (!deviceId) return;

      const { data: newService, error: svcErr } = await supabase
        .from('store_services')
        .insert({
          store_id: storeId,
          device_id: deviceId,
          ...servicePayload,
          estimated_time_minutes: 60,
          interest_rate: 0,
        })
        .select('id')
        .single();

      if (svcErr || !newService) {
        console.error('syncPartToStore: create service error', svcErr);
        return;
      }

      // Create link
      await supabase.from('service_sync_links').insert({
        budget_part_id: part.id,
        store_service_id: newService.id,
        owner_id: userId,
        sync_direction: 'worm_to_store',
      });
    }
  } catch (err) {
    console.error('syncPartToStore error', err);
  }
}

/**
 * Store → Worm: After a store_service is updated, push back to budget_part.
 */
export async function syncServiceToPart(serviceId: string, updatedFields: {
  name?: string;
  category?: string;
  price?: number;
  installment_price?: number;
  warranty_days?: number;
  max_installments?: number;
}) {
  try {
    const { data: link } = await supabase
      .from('service_sync_links')
      .select('id, budget_part_id')
      .eq('store_service_id', serviceId)
      .maybeSingle();

    if (!link) return; // no link, independent service

    const partUpdate: Record<string, unknown> = {};
    if (updatedFields.name !== undefined) partUpdate.name = updatedFields.name;
    if (updatedFields.category !== undefined) partUpdate.part_type = updatedFields.category;
    if (updatedFields.price !== undefined) partUpdate.cash_price = reaisToCentavos(updatedFields.price);
    if (updatedFields.price !== undefined) partUpdate.price = reaisToCentavos(updatedFields.price);
    if (updatedFields.installment_price !== undefined) partUpdate.installment_price = reaisToCentavos(updatedFields.installment_price);
    if (updatedFields.warranty_days !== undefined) partUpdate.warranty_months = daysToMonths(updatedFields.warranty_days);
    if (updatedFields.max_installments !== undefined) partUpdate.installment_count = updatedFields.max_installments;

    if (Object.keys(partUpdate).length > 0) {
      await supabase
        .from('budget_parts')
        .update(partUpdate)
        .eq('id', link.budget_part_id);
    }

    await supabase
      .from('service_sync_links')
      .update({ last_synced_at: new Date().toISOString(), sync_direction: 'store_to_worm' })
      .eq('id', link.id);
  } catch (err) {
    console.error('syncServiceToPart error', err);
  }
}

/**
 * Get link for a budget_part
 */
export async function getLinkForPart(partId: string): Promise<SyncLink | null> {
  const { data } = await supabase
    .from('service_sync_links')
    .select('*')
    .eq('budget_part_id', partId)
    .maybeSingle();
  return (data as SyncLink | null);
}

/**
 * Get link for a store_service
 */
export async function getLinkForService(serviceId: string): Promise<SyncLink | null> {
  const { data } = await supabase
    .from('service_sync_links')
    .select('*')
    .eq('store_service_id', serviceId)
    .maybeSingle();
  return (data as SyncLink | null);
}

/**
 * Get all links for a given owner (batch query for UI badges)
 */
export async function getLinksForOwner(ownerId: string): Promise<SyncLink[]> {
  const { data } = await supabase
    .from('service_sync_links')
    .select('*')
    .eq('owner_id', ownerId);
  return (data as SyncLink[] | null) || [];
}

/**
 * Remove link without deleting either side
 */
export async function unlinkPart(partId: string) {
  await supabase
    .from('service_sync_links')
    .delete()
    .eq('budget_part_id', partId);
}

/**
 * Remove link by store_service_id without deleting either side
 */
export async function unlinkService(serviceId: string) {
  await supabase
    .from('service_sync_links')
    .delete()
    .eq('store_service_id', serviceId);
}
