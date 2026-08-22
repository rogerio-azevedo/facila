import { createStore } from "zustand/vanilla";

export type PageHeaderState = {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
};

export type PageHeaderActions = {
  setPageHeader: (state: PageHeaderState) => void;
  clearPageHeader: () => void;
};

export type PageHeaderStore = PageHeaderState & PageHeaderActions;
export type PageHeaderStoreApi = ReturnType<typeof createPageHeaderStore>;

const defaultInitialState: PageHeaderState = {};

export function createPageHeaderStore(
  initialState: PageHeaderState = defaultInitialState,
) {
  return createStore<PageHeaderStore>()((set) => ({
    ...initialState,
    setPageHeader: (state) => set(state),
    clearPageHeader: () => set(defaultInitialState),
  }));
}
