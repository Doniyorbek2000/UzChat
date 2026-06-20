import { apiClient as api } from "./client";

export interface StoreOwner {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface Store {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  avatarUrl: string | null;
  category: string;
  isActive: boolean;
  createdAt: string;
  owner?: StoreOwner;
  _count?: { products: number; orders?: number };
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  imageUrls: string[];
  stock: number;
  category: string;
  isActive: boolean;
  createdAt: string;
  store?: { id: string; name: string; avatarUrl: string | null };
}

export interface OrderItem {
  id: string;
  productId: string;
  quantity: number;
  price: number;
  product: Product;
}

export interface Order {
  id: string;
  buyerId: string;
  storeId: string;
  status: "PENDING" | "CONFIRMED" | "SHIPPED" | "DELIVERED" | "CANCELLED" | "REFUNDED";
  totalAmount: number;
  currency: string;
  note: string | null;
  createdAt: string;
  items: OrderItem[];
  store: { id: string; name: string; avatarUrl?: string | null };
}

export const marketplaceApi = {
  async createStore(data: { name: string; description?: string; avatarUrl?: string; category?: string }): Promise<Store> {
    const res = await api.post("/marketplace/stores", data);
    return res.data;
  },

  async listStores(category?: string, cursor?: string): Promise<{ stores: Store[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (category) params.set("category", category);
    if (cursor) params.set("cursor", cursor);
    const q = params.toString();
    const res = await api.get(`/marketplace/stores${q ? `?${q}` : ""}`);
    return res.data;
  },

  async getMyStores(): Promise<Store[]> {
    const res = await api.get("/marketplace/stores/mine");
    return res.data;
  },

  async getStore(storeId: string): Promise<Store> {
    const res = await api.get(`/marketplace/stores/${storeId}`);
    return res.data;
  },

  async updateStore(storeId: string, data: Partial<{ name: string; description: string; avatarUrl: string; category: string }>): Promise<Store> {
    const res = await api.patch(`/marketplace/stores/${storeId}`, data);
    return res.data;
  },

  async addProduct(storeId: string, data: { name: string; description?: string; price: number; currency?: string; imageUrls?: string[]; stock?: number; category?: string }): Promise<Product> {
    const res = await api.post(`/marketplace/stores/${storeId}/products`, data);
    return res.data;
  },

  async listProducts(storeId: string, cursor?: string): Promise<{ products: Product[]; nextCursor: string | null }> {
    const params = cursor ? `?cursor=${cursor}` : "";
    const res = await api.get(`/marketplace/stores/${storeId}/products${params}`);
    return res.data;
  },

  async searchProducts(query: string, category?: string, cursor?: string): Promise<{ products: Product[]; nextCursor: string | null }> {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (category) params.set("category", category);
    if (cursor) params.set("cursor", cursor);
    const res = await api.get(`/marketplace/products/search?${params}`);
    return res.data;
  },

  async updateProduct(productId: string, data: Partial<{ name: string; description: string; price: number; imageUrls: string[]; stock: number; isActive: boolean }>): Promise<Product> {
    const res = await api.patch(`/marketplace/products/${productId}`, data);
    return res.data;
  },

  async deleteProduct(productId: string): Promise<void> {
    await api.delete(`/marketplace/products/${productId}`);
  },

  async createOrder(data: { storeId: string; items: { productId: string; quantity: number }[]; note?: string }): Promise<Order> {
    const res = await api.post("/marketplace/orders", data);
    return res.data;
  },

  async getMyOrders(): Promise<Order[]> {
    const res = await api.get("/marketplace/orders/mine");
    return res.data;
  },

  async getStoreOrders(storeId: string): Promise<Order[]> {
    const res = await api.get(`/marketplace/orders/store/${storeId}`);
    return res.data;
  },

  async updateOrderStatus(orderId: string, status: string): Promise<Order> {
    const res = await api.patch(`/marketplace/orders/${orderId}/status`, { status });
    return res.data;
  },
};
