"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";

import {
  createSidebarStore,
  type SidebarStore,
  type SidebarStoreApi,
} from "@/stores/sidebar";

const SidebarStoreContext = createContext<SidebarStoreApi | null>(null);

type SidebarStoreProviderProps = {
  children: React.ReactNode;
  defaultOpen: boolean;
};

export function SidebarStoreProvider({
  children,
  defaultOpen,
}: SidebarStoreProviderProps) {
  const [store] = useState(() => createSidebarStore({ isOpen: defaultOpen }));

  return (
    <SidebarStoreContext.Provider value={store}>
      {children}
    </SidebarStoreContext.Provider>
  );
}

export function useSidebarStore<T>(selector: (store: SidebarStore) => T): T {
  const store = useContext(SidebarStoreContext);

  if (!store) {
    throw new Error(
      "useSidebarStore deve ser usado dentro de SidebarStoreProvider.",
    );
  }

  return useStore(store, selector);
}
