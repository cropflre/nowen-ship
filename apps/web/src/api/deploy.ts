import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./base";
import type {
  DeployTarget,
  Deployment,
  CreateDeployTargetInput,
  UpdateDeployTargetInput,
  TriggerDeploymentInput,
} from "../types/deploy";

const TARGETS_KEY = "deploy-targets";
const DEPLOYMENTS_KEY = "deployments";

// ===== 部署目标 =====
export function useDeployTargets(projectId?: string) {
  return useQuery({
    queryKey: [TARGETS_KEY, projectId],
    queryFn: async () => {
      const query = projectId ? `?projectId=${projectId}` : "";
      const res = await apiRequest<{ data: DeployTarget[] }>(
        `/api/deploy/targets${query}`
      );
      return res.data;
    },
  });
}

export function useDeployTarget(id: string) {
  return useQuery({
    queryKey: [TARGETS_KEY, id],
    queryFn: async () => {
      const res = await apiRequest<{ data: DeployTarget }>(
        `/api/deploy/targets/${id}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateDeployTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateDeployTargetInput) => {
      const res = await apiRequest<{ data: DeployTarget }>("/api/deploy/targets", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TARGETS_KEY] });
    },
  });
}

export function useUpdateDeployTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      input,
    }: {
      id: string;
      input: UpdateDeployTargetInput;
    }) => {
      const res = await apiRequest<{ data: DeployTarget }>(
        `/api/deploy/targets/${id}`,
        { method: "PUT", body: JSON.stringify(input) }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TARGETS_KEY] });
    },
  });
}

export function useDeleteDeployTarget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/deploy/targets/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [TARGETS_KEY] });
    },
  });
}

// ===== 部署记录 =====
export function useDeployments(projectId?: string) {
  return useQuery({
    queryKey: [DEPLOYMENTS_KEY, projectId],
    queryFn: async () => {
      const query = projectId ? `?projectId=${projectId}` : "";
      const res = await apiRequest<{ data: Deployment[] }>(
        `/api/deploy/deployments${query}`
      );
      return res.data;
    },
  });
}

export function useDeployment(id: string) {
  return useQuery({
    queryKey: [DEPLOYMENTS_KEY, id],
    queryFn: async () => {
      const res = await apiRequest<{ data: Deployment }>(
        `/api/deploy/deployments/${id}`
      );
      return res.data;
    },
    enabled: !!id,
  });
}

export function useTriggerDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TriggerDeploymentInput) => {
      const res = await apiRequest<{ data: Deployment }>("/api/deploy/deployments", {
        method: "POST",
        body: JSON.stringify({ ...input, triggeredBy: "admin" }),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEPLOYMENTS_KEY] });
      qc.invalidateQueries({ queryKey: [TARGETS_KEY] });
    },
  });
}

export function useSyncDeployment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest<{ data: Deployment }>(
        `/api/deploy/deployments/${id}/sync`,
        { method: "POST" }
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [DEPLOYMENTS_KEY] });
    },
  });
}
