import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./base";
import type { ReleaseJob, TriggerBuildInput } from "../types/build";

const BUILDS_KEY = "builds";

export function useBuilds(params: { projectId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: [BUILDS_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.projectId) searchParams.set("projectId", params.projectId);
      if (params.status) searchParams.set("status", params.status);
      const query = searchParams.toString();
      const res = await apiRequest<{ data: ReleaseJob[] }>(
        `/api/builds${query ? `?${query}` : ""}`
      );
      return res.data;
    },
  });
}

export function useBuild(id: string) {
  return useQuery({
    queryKey: [BUILDS_KEY, id],
    queryFn: async () => {
      const res = await apiRequest<{ data: ReleaseJob }>(`/api/builds/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useTriggerBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TriggerBuildInput) => {
      const res = await apiRequest<{ data: ReleaseJob }>("/api/builds", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUILDS_KEY] });
    },
  });
}

export function useSyncBuild() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: ReleaseJob }>(`/api/builds/${id}/sync`, {
        method: "POST",
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUILDS_KEY] });
    },
  });
}

export function useSyncArtifacts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest(`/api/builds/${id}/artifacts/sync`, {
        method: "POST",
      });
      return res;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [BUILDS_KEY] });
    },
  });
}
