import { BoardElement } from './element';

/**
 * Represents a single .5boardz file in memory
 */
export interface BoardDocument {
  manifest: BoardManifest;
  content: BoardContent;
  sources: Source[];
  assets: Asset[];
}

/**
 * Represents a single source file within a .5boardz document
 */
export interface Source {
  name: string;
  language: string;
  code: string;
}

/**
 * Represents the manifest section of a .5boardz document.
 * Should be equivalent to manifest.json within the .5boardz zip file
 */
export interface BoardManifest {
  title: string;
  createdAt: string;
  modifiedAt: string;
  version: string;
}

/**
 * Represents the content section of a .5boardz document
 * Should be equivalent to the content.json within the .5boardz zip file
 */
export interface BoardContent {
  selectedElementId: string | null;
  elements: BoardElement[];
  background?: string;
  snapAngle?: number;
  revealOrder?: number;
}

/**
 * Represents an asset (e.g. image) within a .5boardz document
 * Any non-textual data should be stored as an asset
 */
export interface Asset {
  name: string;
  mime?: string;
  bytes: Uint8Array;
}
