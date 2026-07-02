import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "./base";
import type { Project, CreateProjectInput, UpdateProjectInput } from "../types/project";

const PROJECTS_KEY = "projects";

export function useProjects() {
  return useQuery({
    queryKey: [PROJECTS_KEY],
    queryFn: async () => {
      const res = await apiRequest<{ data: Project[] }>("/api/projects");
      return res.data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: [PROJECTS_KEY, id],
    queryFn: async () => {
      const res = await apiRequest<{ data: Project }>(`/api/projects/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateProjectInput) => {
      const res = await apiRequest<{ data: Project }>("/api/projects", {
        method: "POST",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
}

export function useUpdateProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, input }: { id: string; input: UpdateProjectInput }) => {
      const res = await apiRequest<{ data: Project }>(`/api/projects/${id}`, {
        method: "PUT",
        body: JSON.stringify(input),
      });
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await apiRequest(`/api/projects/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [PROJECTS_KEY] });
    },
  });
}
