export interface Project {
  id: string;
  name: string;
  repoFullName: string;
  defaultBranch: string;
  projectType: "desktop" | "web" | "mobile" | "backend" | "mixed";
  workflowFile: string;
  buildInputsSchema: Record<string, unknown> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type CreateProjectInput = {
  name: string;
  repoFullName: string;
  defaultBranch?: string;
  projectType: Project["projectType"];
  workflowFile: string;
  buildInputsSchema?: Record<string, unknown>;
  isActive?: boolean;
};

export type UpdateProjectInput = Partial<CreateProjectInput>;
