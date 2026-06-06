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
  createdAt: number;
  modifiedAt: number;
}

/**
 * Represents the manifest section of a .5boardz document.
 * Should be equivalent to manifest.json within the .5boardz zip file
 */
export interface BoardManifest {
  title: string;
  createdAt: number;
  modifiedAt: number;
  version: string;
}

/**
 * Represents the content section of a .5boardz document
 * Should be equivalent to the content.json within the .5boardz zip file
 */
export interface BoardContent {
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
  mime: string;
  bytes: Uint8Array;
  // timestamp of creation, should be set when the asset is first created and never modified afterwards
  createdAt: number;
  // timestamp of last modification, should be updated whenever the asset is modified
  modifiedAt: number;
}
