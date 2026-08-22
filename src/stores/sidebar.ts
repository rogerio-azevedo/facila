import { createStore } from "zustand/vanilla";

import { persistSidebarPreference } from "@/lib/sidebar-preference";

export type SidebarState = {
  isOpen: boolean;
};

export type SidebarActions = {
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

export type SidebarStore = SidebarState & SidebarActions;
export type SidebarStoreApi = ReturnType<typeof createSidebarStore>;

const defaultInitialState: SidebarState = {
  isOpen: true,
};

export function createSidebarStore(
  initialState: SidebarState = defaultInitialState,
) {
  return createStore<SidebarStore>()((set, get) => {
    function updateOpen(isOpen: boolean) {
      set({ isOpen });
      persistSidebarPreference(isOpen);
    }

    return {
      ...initialState,
      setOpen: updateOpen,
      toggle: () => updateOpen(!get().isOpen),
    };
  });
}
