import axios from "axios";
import { BACKEND_URL } from "@/app/config";

const IS_DEV = process.env.NEXT_PUBLIC_DEV_MODE === "true";
const DEV_TOKEN = process.env.NEXT_PUBLIC_DEV_TOKEN || "dev-demo-token";

// ─── Types ──────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  description?: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
  members?: WorkspaceMember[];
  _count?: {
    workflows?: number;
    members?: number;
  };
}

export interface WorkspaceMember {
  id: string;
  userId: string;
  workspaceId: string;
  role: "ADMIN" | "EDITOR" | "VIEWER";
  joinedAt: string;
  user?: {
    id: string;
    name: string;
    email: string;
    avatar?: string;
  };
}

export interface CreateWorkspaceRequest {
  name: string;
  description?: string;
  slug?: string;
}

export interface UpdateWorkspaceRequest {
  name?: string;
  description?: string;
  slug?: string;
}

export interface AddMemberRequest {
  email: string;
  role?: "ADMIN" | "EDITOR" | "VIEWER";
}

// ─── Ensure dev token is in localStorage ──────────────────

export function ensureDevToken() {
  if (IS_DEV && typeof window !== "undefined") {
    const existing = localStorage.getItem("token");
    if (!existing) {
      localStorage.setItem("token", DEV_TOKEN);
    }
  }
}

// ─── API Configuration ───────────────────────────────

const api = axios.create({
  baseURL: BACKEND_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    ensureDevToken();
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "An unexpected error occurred";
    const enriched = new Error(message);
    (enriched as any).status = error.response?.status;
    (enriched as any).originalError = error;
    return Promise.reject(enriched);
  },
);

export { api };

// ─── Workspace API Functions ─────────────────────

export const workspaceApi = {
  async listWorkspaces(): Promise<Workspace[]> {
    const response = await api.get("/api/v1/workspaces");
    return response.data;
  },

  async getWorkspace(id: string): Promise<Workspace> {
    const response = await api.get(`/api/v1/workspaces/${id}`);
    return response.data;
  },

  async createWorkspace(data: CreateWorkspaceRequest): Promise<Workspace> {
    const response = await api.post("/api/v1/workspaces", data);
    return response.data;
  },

  async updateWorkspace(
    id: string,
    data: UpdateWorkspaceRequest,
  ): Promise<Workspace> {
    const response = await api.put(`/api/v1/workspaces/${id}`, data);
    return response.data;
  },

  async deleteWorkspace(id: string): Promise<void> {
    await api.delete(`/api/v1/workspaces/${id}`);
  },

  async addMember(
    workspaceId: string,
    data: AddMemberRequest,
  ): Promise<WorkspaceMember> {
    const response = await api.post(
      `/api/v1/workspaces/${workspaceId}/members`,
      data,
    );
    return response.data;
  },

  async removeMember(workspaceId: string, userId: string): Promise<void> {
    await api.delete(`/api/v1/workspaces/${workspaceId}/members/${userId}`);
  },
};

// ─── Workflow API Functions ─────────────────────

export const workflowApi = {
  async list() {
    const response = await api.get("/api/v1/workflows");
    return response.data;
  },

  async get(id: string) {
    const response = await api.get(`/api/v1/workflows/${id}`);
    return response.data;
  },

  async create(data: any) {
    const response = await api.post("/api/v1/workflows", data);
    return response.data;
  },

  async update(id: string, data: any) {
    const response = await api.put(`/api/v1/workflows/${id}`, data);
    return response.data;
  },

  async delete(id: string) {
    await api.delete(`/api/v1/workflows/${id}`);
  },
};
