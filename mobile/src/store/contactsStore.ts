import { create } from "zustand";
import { contactsApi } from "../api/contacts";
import { getSocket } from "../socket/socket";

interface ContactsState {
  pendingRequestCount: number;
  listenersRegistered: boolean;
  lastRequestReceivedAt: number | null;
  setPendingRequestCount: (count: number) => void;
  refreshPendingRequestCount: () => Promise<void>;
  setupSocketListeners: () => void;
}

export const useContactsStore = create<ContactsState>((set, get) => ({
  pendingRequestCount: 0,
  listenersRegistered: false,
  lastRequestReceivedAt: null,

  setPendingRequestCount: (count) => set({ pendingRequestCount: count }),

  refreshPendingRequestCount: async () => {
    try {
      const requests = await contactsApi.listIncomingRequests();
      set({ pendingRequestCount: requests.length });
    } catch {
      // badge keeps its last known value
    }
  },

  setupSocketListeners: () => {
    if (get().listenersRegistered) return;
    const socket = getSocket();
    if (!socket) return;

    socket.on("contact:request", () => {
      get().refreshPendingRequestCount();
      set({ lastRequestReceivedAt: Date.now() });
    });

    set({ listenersRegistered: true });
  },
}));
