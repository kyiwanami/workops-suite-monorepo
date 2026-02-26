import type { Schema } from "@workops/data-schema";

// Pageデータの型定義
export interface PageDataType {
  pageId: string;
  projectId: string;
  name: string;
  description?: string | null;
  relativePath?: string | null;
  iconName?: string | null;
}

// Projectデータの型定義
export interface ProjectDataType {
  projectId: string;
  name: string;
  description?: string | null;
  urlDomain: string;
  iconName?: string | null;
  color?: string | null;
  pages: PageDataType[];
}

// Amplify Schema型
export type ProjectType = Schema["Project"]["type"];
export type PageType = Schema["Page"]["type"];

// Amplify Schema Create/Update型
export type CreateProjectInput = Schema["Project"]["createType"];
export type UpdateProjectInput = Schema["Project"]["updateType"];
export type CreatePageInput = Schema["Page"]["createType"];
export type UpdatePageInput = Schema["Page"]["updateType"];
