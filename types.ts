export interface Variant {
  id?: string;
  name: string;
  sku: string;
  sellValue: number;
}

export interface Category {
  id?: number;
  name: string;
  viewMode?: string;
  text?: string;
  color?: string;
  showCatalog?: boolean;
  archived?: boolean;
}

export interface Product {
  id?: number;
  name: string;
  alphaCode?: string;
  sellValue: number;
  costValue?: number;
  eanCode?: string;
  minimumStock?: number;
  hasVariant?: boolean;
  category?: {
    description: string;
    id?: number;
  };
  categoryId?: number; // Helper for form
  variants?: Variant[];
}

export interface SaleItem {
  product: Product;
  quantity: number;
  usedPrice: number;
  netItem: number;
  observation?: string;
}

export interface Customer {
  id: number;
  personType: string;
  cpfCnpj: string;
  companyName?: string;
  fantasyName?: string;
  email?: string;
  phone?: string;
}

export interface Sale {
  id: string;
  orderName?: string;
  creationDate: string;
  totalAmount: number;
  statusNf?: string;
  numberInvoice?: number;
  accessKey?: string;
  isCanceled: boolean;
  uniqueIdentifier: string;
  customer?: Customer;
  items?: SaleItem[]; // Added for reporting purposes in mock
}

export interface ApiCredentials {
  keyId: string;
  keySecret: string;
}

export type ViewState = 
  | { name: 'dashboard' }
  | { name: 'products' }
  | { name: 'product-form'; productId?: number }
  | { name: 'categories' }
  | { name: 'category-form'; categoryId?: number }
  | { name: 'settings' };