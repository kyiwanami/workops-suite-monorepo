import type { Schema } from "@workops/data-schema";

// Pageデータの型定義
export interface PageDataType {
  pageId: string;
  appId: string;
  name: string;
  description?: string | null;
  relativePath?: string | null;
  iconName?: string | null;
}

// Appデータの型定義
export interface AppDataType {
  appId: string;
  name: string;
  description?: string | null;
  urlDomain: string;
  iconName?: string | null;
  color?: string | null;
  pages: PageDataType[];
}

// Amplify Schema型
export type AppType = Schema["App"]["type"];
export type PageType = Schema["Page"]["type"];

// Amplify Schema Create/Update型
export type CreateAppInput = Schema["App"]["createType"];
export type UpdateAppInput = Schema["App"]["updateType"];
export type CreatePageInput = Schema["Page"]["createType"];
export type UpdatePageInput = Schema["Page"]["updateType"];
