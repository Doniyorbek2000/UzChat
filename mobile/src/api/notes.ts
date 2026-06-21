import { apiClient as api } from "./client";

export interface Note {
  id: string;
  userId: string;
  title: string;
  content: string;
  color: string;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export const notesApi = {
  list() {
    return api.get<Note[]>("/notes").then((r) => r.data);
  },

  get(noteId: string) {
    return api.get<Note>(`/notes/${noteId}`).then((r) => r.data);
  },

  create(input: { title: string; content: string; color?: string; isPinned?: boolean }) {
    return api.post<Note>("/notes", input).then((r) => r.data);
  },

  update(noteId: string, input: { title?: string; content?: string; color?: string; isPinned?: boolean }) {
    return api.patch<Note>(`/notes/${noteId}`, input).then((r) => r.data);
  },

  delete(noteId: string) {
    return api.delete(`/notes/${noteId}`);
  },
};
