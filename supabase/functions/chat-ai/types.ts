export interface AIContext {
  userQuestion: string;
  contextType:
    | "license"
    | "budgets"
    | "budgets_count"
    | "service_orders"
    | "service_orders_count"
    | "trash"
    | "peliculas"
    | "clients"
    | "store"
    | "company_profile"
    | "general";
  dataFound: boolean;
  data: {
    license?: any;
    budgets?: any[];
    serviceOrders?: any[];
    trashedItems?: any[];
    peliculas?: any[];
    clients?: any[];
    store?: any;
    companyInfo?: any;
    searchedModel?: string;
    similarModels?: string[];
  };
  userInfo: {
    userId: string;
    userName: string;
    userRole: string;
  };
}


export interface ContextMarker {
  type: string;
  message: string;
  hasData: boolean;
}

export interface ValidationResult {
  isValid: boolean;
  issues?: string[];
}
