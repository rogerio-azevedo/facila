"use client";

import { createContext, useContext, useState } from "react";
import { useStore } from "zustand";

import {
  createPageHeaderStore,
  type PageHeaderStore,
  type PageHeaderStoreApi,
} from "@/stores/page-header";

const PageHeaderStoreContext = createContext<PageHeaderStoreApi | null>(null);

type PageHeaderStoreProviderProps = {
  children: React.ReactNode;
};

export function PageHeaderStoreProvider({ children }: PageHeaderStoreProviderProps) {
  const [store] = useState(() => createPageHeaderStore());

  return (
    <PageHeaderStoreContext.Provider value={store}>
      {children}
    </PageHeaderStoreContext.Provider>
  );
}

export function usePageHeaderStore<T>(selector: (store: PageHeaderStore) => T): T {
  const store = useContext(PageHeaderStoreContext);

  if (!store) {
    throw new Error(
      "usePageHeaderStore deve ser usado dentro de PageHeaderStoreProvider.",
    );
  }

  return useStore(store, selector);
}
