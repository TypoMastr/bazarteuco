import { ApiCredentials, Product, Category, Sale, SaleItem } from '../types';

// --- MOCK DATA (Traduzido para PT-BR) ---

let mockCategories: Category[] = [
  { id: 1, name: 'Eletrônicos', viewMode: 'TEXT', color: '#10b981' },
  { id: 2, name: 'Roupas & Moda', viewMode: 'TEXT', color: '#8b5cf6' },
  { id: 3, name: 'Casa & Jardim', viewMode: 'TEXT', color: '#f59e0b' },
  { id: 4, name: 'Livraria', viewMode: 'TEXT', color: '#3b82f6' }
];

let mockProducts: Product[] = [
  { 
    id: 101, 
    name: 'Fone de Ouvido Bluetooth Pro', 
    sellValue: 299.99, 
    minimumStock: 15, 
    category: { id: 1, description: 'Eletrônicos' }, 
    categoryId: 1, 
    hasVariant: false 
  },
  { 
    id: 102, 
    name: 'Suporte de Celular (Alumínio)', 
    sellValue: 29.99, 
    minimumStock: 45, 
    category: { id: 1, description: 'Eletrônicos' }, 
    categoryId: 1, 
    hasVariant: false 
  },
  { 
    id: 103, 
    name: 'Camiseta Algodão Premium', 
    sellValue: 49.90, 
    minimumStock: 120, 
    category: { id: 2, description: 'Roupas & Moda' }, 
    categoryId: 2, 
    hasVariant: true, 
    variants: [
      { id: 'v1', name: 'P - Branca', sku: 'TS-W-S', sellValue: 49.90 },
      { id: 'v2', name: 'M - Branca', sku: 'TS-W-M', sellValue: 49.90 },
      { id: 'v3', name: 'G - Branca', sku: 'TS-W-L', sellValue: 49.90 },
      { id: 'v4', name: 'M - Preta', sku: 'TS-B-M', sellValue: 49.90 }
    ]
  },
  { 
    id: 104, 
    name: 'Calça Jeans Slim', 
    sellValue: 119.90, 
    minimumStock: 20, 
    category: { id: 2, description: 'Roupas & Moda' }, 
    categoryId: 2, 
    hasVariant: false 
  },
  { 
    id: 105, 
    name: 'Vaso de Cerâmica Moderno', 
    sellValue: 85.00, 
    minimumStock: 5, 
    category: { id: 3, description: 'Casa & Jardim' }, 
    categoryId: 3, 
    hasVariant: false 
  },
  { 
    id: 106, 
    name: 'O Futuro da IA (Capa Dura)', 
    sellValue: 59.90, 
    minimumStock: 12, 
    category: { id: 4, description: 'Livraria' }, 
    categoryId: 4, 
    hasVariant: false 
  },
];

const generateMockSales = (): Sale[] => {
  const sales: Sale[] = [];
  const now = new Date();
  
  for (let i = 0; i < 60; i++) {
    const daysAgo = Math.floor(Math.random() * 10); // Últimos 10 dias
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    date.setHours(9 + Math.floor(Math.random() * 12), Math.floor(Math.random() * 60));
    
    const isCanceled = Math.random() > 0.95; 

    // Generate random items for this sale
    const itemCount = Math.floor(Math.random() * 4) + 1;
    const saleItems: SaleItem[] = [];
    let totalAmount = 0;

    for (let j = 0; j < itemCount; j++) {
        const randomProduct = mockProducts[Math.floor(Math.random() * mockProducts.length)];
        const quantity = Math.floor(Math.random() * 2) + 1;
        const usedPrice = randomProduct.sellValue;
        const netItem = usedPrice * quantity;
        
        saleItems.push({
            product: randomProduct,
            quantity,
            usedPrice,
            netItem
        });
        totalAmount += netItem;
    }

    sales.push({
      id: `PED-${202400 + i}`,
      orderName: `Pedido #${202400 + i}`,
      creationDate: date.toISOString(),
      totalAmount: parseFloat(totalAmount.toFixed(2)),
      statusNf: 'SUCCESS',
      isCanceled: isCanceled,
      uniqueIdentifier: `uid-${i}`,
      items: saleItems,
      customer: {
          id: i,
          personType: 'FISICA',
          cpfCnpj: '000.000.000-00',
          companyName: 'Cliente Exemplo'
      }
    });
  }
  // Sort descending
  return sales.sort((a, b) => new Date(b.creationDate).getTime() - new Date(a.creationDate).getTime());
};

let mockSales = generateMockSales();

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// --- MOCK API IMPLEMENTATION ---

export const Api = {
  Sales: {
    list: async (): Promise<Sale[]> => {
      await delay(600); 
      return [...mockSales];
    },
    getItems: async (uniqueIdentifier: string) => {
      await delay(300);
      const sale = mockSales.find(s => s.uniqueIdentifier === uniqueIdentifier);
      return sale?.items || []; 
    }
  },
  Products: {
    list: async (): Promise<Product[]> => {
      await delay(600);
      return [...mockProducts];
    },
    get: async (id: number): Promise<Product> => {
      await delay(300);
      const product = mockProducts.find(p => p.id === id);
      if (!product) throw new Error('Produto não encontrado');
      return JSON.parse(JSON.stringify(product));
    },
    create: async (data: Product): Promise<Product> => {
      await delay(800);
      const newProduct = { 
        ...data, 
        id: Math.floor(Math.random() * 10000) + 1000,
        category: data.category || (data.categoryId ? { id: data.categoryId, description: mockCategories.find(c => c.id === data.categoryId)?.name || '' } : undefined)
      };
      mockProducts = [newProduct, ...mockProducts];
      return newProduct;
    },
    update: async (id: number, data: Product): Promise<Product> => {
      await delay(800);
      const index = mockProducts.findIndex(p => p.id === id);
      if (index === -1) throw new Error('Produto não encontrado');
      
      const updatedProduct = { 
        ...data, 
        id,
        category: data.category || (data.categoryId ? { id: data.categoryId, description: mockCategories.find(c => c.id === data.categoryId)?.name || '' } : undefined)
      };
      
      mockProducts[index] = updatedProduct;
      mockProducts = [...mockProducts]; 
      return updatedProduct;
    },
    delete: async (id: number): Promise<void> => {
      await delay(500);
      mockProducts = mockProducts.filter(p => p.id !== id);
    }
  },
  Categories: {
    list: async (): Promise<Category[]> => {
      await delay(400);
      return [...mockCategories];
    },
    get: async (id: number): Promise<Category> => {
      await delay(200);
      const cat = mockCategories.find(c => c.id === id);
      if (!cat) throw new Error('Categoria não encontrada');
      return cat;
    },
    create: async (data: Category): Promise<Category> => {
      await delay(500);
      const newCat = { ...data, id: Math.floor(Math.random() * 1000) + 100 };
      mockCategories = [...mockCategories, newCat];
      return newCat;
    },
    update: async (id: number, data: Category): Promise<Category> => {
      await delay(500);
      const index = mockCategories.findIndex(c => c.id === id);
      if (index === -1) throw new Error('Categoria não encontrada');
      mockCategories[index] = { ...data, id };
      mockCategories = [...mockCategories];
      return mockCategories[index];
    },
    delete: async (id: number): Promise<void> => {
      await delay(500);
      mockCategories = mockCategories.filter(c => c.id !== id);
    }
  }
};

export const checkAuth = (): boolean => {
  return !!localStorage.getItem('sp_key_id');
};

export const saveAuth = (creds: ApiCredentials) => {
  localStorage.setItem('sp_key_id', creds.keyId);
  localStorage.setItem('sp_key_secret', creds.keySecret);
};

export const clearAuth = () => {
  localStorage.removeItem('sp_key_id');
  localStorage.removeItem('sp_key_secret');
};