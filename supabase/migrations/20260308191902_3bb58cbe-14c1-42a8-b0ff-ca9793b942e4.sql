
CREATE OR REPLACE FUNCTION public.get_public_company_info(p_owner_id uuid)
RETURNS TABLE (
  id uuid,
  name text,
  logo_url text,
  address text,
  whatsapp_phone text,
  email text,
  cnpj text,
  website text,
  description text,
  business_hours text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    ci.id,
    ci.name,
    ci.logo_url,
    ci.address,
    ci.whatsapp_phone,
    ci.email,
    ci.cnpj,
    ci.website,
    ci.description,
    ci.business_hours
  FROM public.company_info ci
  WHERE ci.owner_id = p_owner_id
  LIMIT 1;
$$;
