import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./base";
import type { ReleasePlan, CreateReleasePlanInput } from "../types/release";

const RELEASES_KEY = "releases";

export function useReleasePlans(params: { projectId?: string; status?: string } = {}) {
  return useQuery({
    queryKey: [RELEASES_KEY, params],
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params.projectId) searchParams.set("projectId", params.projectId);
      if (params.status) searchParams.set("status", params.status);
      const query = searchParams.toString();
      const res = await apiRequest<{ data: ReleasePlan[] }>(
        `/api/releases/plans${query ? `?${query}` : ""}`
      );
      return res.data;
    },
  });
}

export function useReleasePlan(id: string) {
  return useQuery({
    queryKey: [RELEASES_KEY, id],
    queryFn: async () => {
      const res = await apiRequest<{ data: ReleasePlan }>(`/api/releases/plans/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateReleasePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateReleasePlanInput) => {
      const res = await apiRequest<{ data: ReleasePlan }>("/api/releases/plans", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RELEASES_KEY] });
    },
  });
}

export function useCreateTag() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: { sha: string; message: string } }>(
        `/api/releases/plans/${id}/create-tag`,
        { method: "POST" }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RELEASES_KEY] });
    },
  });
}

export function useTriggerBuildForPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: { jobId: string; message: string } }>(
        `/api/releases/plans/${id}/trigger-build`,
        { method: "POST" }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RELEASES_KEY] });
    },
  });
}

export function useCreateGitHubRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: { id: number; htmlUrl: string }; message: string }>(
        `/api/releases/plans/${id}/create-github-release`,
        { method: "POST" }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RELEASES_KEY] });
    },
  });
}

export function usePublishGitHubRelease() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: { message: string } }>(
        `/api/releases/plans/${id}/publish-github-release`,
        { method: "POST" }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [RELEASES_KEY] });
    },
  });
}

export function useCalculateVersion() {
  return useQuery({
    queryKey: ["calculate-version"],
    queryFn: async () => null, // 手动触发
    enabled: false,
  });
}
