import { apiClient as api } from "./client";

export interface WishlistItem {
  id: string;
  userId: string;
  productId: string;
  createdAt: string;
  product: {
    id: string;
    name: string;
    price: string;
    currency: string;
    imageUrls: string[];
    store: { id: string; name: string };
  };
}

export const wishlistApi = {
  getAll() { return api.get<WishlistItem[]>("/wishlist").then((r) => r.data); },
  add(productId: string) { return api.post(`/wishlist/${productId}`).then((r) => r.data); },
  remove(productId: string) { return api.delete(`/wishlist/${productId}`).then((r) => r.data); },
  check(productId: string) { return api.get<{ inWishlist: boolean }>(`/wishlist/${productId}/check`).then((r) => r.data); },
};
