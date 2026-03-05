export type TableName =
  | "budgets"
  | "service_orders"
  | "clients"
  | "stores"
  | "company_info";

interface TableCatalogEntry {
  columns: string[];
}

export const DATA_CATALOG: Record<TableName, TableCatalogEntry> = {
  budgets: {
    columns: [
      "id",
      "owner_id",
      "sequential_number",
      "device_type",
      "device_model",
      "client_id",
      "client_name",
      "client_phone",
      "status",
      "total_price",
      "cash_price",
      "installment_price",
      "installments",
      "issue",
      "warranty_months",
      "part_type",
      "part_quality",
      "includes_delivery",
      "includes_screen_protector",
      "custom_services",
      "notes",
      "valid_until",
      "expires_at",
      "workflow_status",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
  },
  service_orders: {
    columns: [
      "id",
      "owner_id",
      "sequential_number",
      "device_type",
      "device_model",
      "client_id",
      "client_name",
      "client_phone",
      "status",
      "total_price",
      "created_at",
      "updated_at",
      "deleted_at",
    ],
  },
  clients: {
    columns: [
      "id",
      "user_id",
      "name",
      "phone",
      "email",
      "city",
      "state",
      "address",
      "zip_code",
      "tags",
      "notes",
      "created_at",
      "updated_at",
    ],
  },
  stores: {
    columns: [
      "id",
      "owner_id",
      "name",
      "slug",
      "description",
      "contact_info",
      "theme",
      "is_published",
      "created_at",
      "updated_at",
    ],
  },
  company_info: {
    columns: [
      "id",
      "owner_id",
      "name",
      "description",
      "address",
      "phone",
      "whatsapp_phone",
      "email",
      "business_hours",
      "website",
      "logo_url",
      "created_at",
      "updated_at",
    ],
  },
};

export function buildSelectColumns(table: TableName): string {
  return DATA_CATALOG[table].columns.join(", ");
}
