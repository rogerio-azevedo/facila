"use client";

import { useLayoutEffect } from "react";

import { usePageHeaderStore } from "@/stores/page-header-provider";

type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: React.ReactNode;
};

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  const setPageHeader = usePageHeaderStore((state) => state.setPageHeader);
  const clearPageHeader = usePageHeaderStore((state) => state.clearPageHeader);

  useLayoutEffect(() => {
    setPageHeader({ title, description, actions });

    return () => {
      clearPageHeader();
    };
  }, [title, description, actions, setPageHeader, clearPageHeader]);

  return null;
}
