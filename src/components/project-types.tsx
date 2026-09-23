"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "@/lib/client";

export type ProjectTypeOption = {
  id: string;
  name: string;
  slug: string;
  color: string;
  sortOrder: number;
  projectCount?: number;
};

const ProjectTypesContext = createContext<{
  types: ProjectTypeOption[];
  loading: boolean;
  reload: () => Promise<void>;
}>({
  types: [],
  loading: true,
  reload: async () => {},
});

export function ProjectTypesProvider({ children }: { children: React.ReactNode }) {
  const [types, setTypes] = useState<ProjectTypeOption[]>([]);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    const data = await api<{ types: ProjectTypeOption[] }>("/api/admin/project-types");
    setTypes(data.types);
  }, []);

  useEffect(() => {
    reload()
      .catch(() => setTypes([]))
      .finally(() => setLoading(false));
  }, [reload]);

  const value = useMemo(() => ({ types, loading, reload }), [types, loading, reload]);

  return <ProjectTypesContext.Provider value={value}>{children}</ProjectTypesContext.Provider>;
}

export function useProjectTypes() {
  return useContext(ProjectTypesContext);
}

export function useProjectType(slug?: string | null) {
  const { types } = useProjectTypes();
  return types.find((item) => item.slug === slug);
}
