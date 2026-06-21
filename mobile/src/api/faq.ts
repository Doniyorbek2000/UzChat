import { apiClient as api } from "./client";

export interface FaqArticleData {
  id: string;
  question: string;
  answer: string;
  category: string;
  sortOrder: number;
}

export const faqApi = {
  list(category?: string) { return api.get<FaqArticleData[]>("/faq", { params: { category } }).then((r) => r.data); },
  getCategories() { return api.get<string[]>("/faq/categories").then((r) => r.data); },
  search(q: string) { return api.get<FaqArticleData[]>("/faq/search", { params: { q } }).then((r) => r.data); },
};
