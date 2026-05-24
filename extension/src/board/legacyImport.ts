// import * as path from 'path';
// import * as vscode from 'vscode';
// import {
//   Asset,
//   FiveBoardzDocument,
//   FiveBoardzSourceFile,
//   EXPORTS_ROOT,
//   ASSET_ROOT,
//   JsonArray,
//   JsonObject,
//   JsonValue,
//   LegacyDocument,
//   create5boardzManifest,
//   isJsonObject,
//   validateOld5boardDocument,
//   FiveBoardzContent,
// } from '5board.vsc-common';
// import { makePackagePath, sanitizeJavaFileName } from './boardPackage';

// interface ImportedDataUrl {
//   bytes: Uint8Array;
//   extension: string;
//   mime: string;
//   isImage: boolean;
// }

// interface AssetImportState {
//   assets: Asset[];
//   dataUrlPaths: Map<string, string>;
//   imageCount: number;
//   assetCount: number;
// }

// //Loads .5board file and returns the converted document structure
// export async function loadOld5boardFile(sourceUri: vscode.Uri): Promise<FiveBoardzDocument> {
//   const bytes = await vscode.workspace.fs.readFile(sourceUri);
//   const legacyText = new TextDecoder('utf-8').decode(bytes);
//   const title = path.basename(sourceUri.fsPath, path.extname(sourceUri.fsPath));

//   return convertOld5boardTo5boardzDocument(JSON.parse(legacyText) as unknown, title);
// }

// //Converts parsed JSON to .5boardz structure and returns the FiveBoardzDocument Object
// export function convertOld5boardTo5boardzDocument(
//   value: unknown,
//   title: string,
// ): FiveBoardzDocument {
//   const legacy = validateOld5boardDocument(value);
//   const assetState: AssetImportState = {
//     assets: [],
//     dataUrlPaths: new Map(),
//     imageCount: 0,
//     assetCount: 0,
//   };

//   return {
//     manifest: create5boardzManifest(title),
//     content: externalizeDataUrls(
//       legacy.content as unknown as JsonValue,
//       assetState,
//     ) as unknown as FiveBoardzContent,
//     sources: convertClassesArrayToSourceFiles(legacy),
//     assets: assetState.assets,
//   };
// }

// // Creates source files based on classes Array from .5board format
// function convertClassesArrayToSourceFiles(legacy: LegacyDocument): FiveBoardzSourceFile[] {
//   const usedPaths = new Set<string>();

//   return legacy.classes.map((legacyClass) => {
//     const safeName = sanitizeJavaFileName(legacyClass.name);
//     let candidateName = safeName;
//     let candidatePath = makePackagePath(ASSET_ROOT, `${candidateName}.java`);
//     let suffix = 2;

//     while (usedPaths.has(candidatePath)) {
//       candidateName = `${safeName}_${suffix}`;
//       candidatePath = makePackagePath(ASSET_ROOT, `${candidateName}.java`);
//       suffix += 1;
//     }

//     usedPaths.add(candidatePath);

//     return {
//       name: legacyClass.name,
//       path: candidatePath,
//       language: 'java',
//       code: legacyClass.code,
//     };
//   });
// }

// //Replaces the Base64 String with the path to the asset
// function externalizeDataUrls(value: JsonValue, state: AssetImportState): JsonValue {
//   if (Array.isArray(value)) {
//     return value.map((entry) => externalizeDataUrls(entry, state)) as JsonArray;
//   }

//   if (!isJsonObject(value)) {
//     return value;
//   }

//   const result: JsonObject = {};

//   for (const [key, entry] of Object.entries(value)) {
//     if (key === 'src' && typeof entry === 'string' && entry.startsWith('data:')) {
//       result[key] = addAsset(entry, state);
//       continue;
//     }

//     result[key] = externalizeDataUrls(entry, state);
//   }

//   return result;
// }

// // Adds a data URL as an asset and returns the path

// function addAsset(dataUrl: string, state: AssetImportState): string {
//   const existingPath = state.dataUrlPaths.get(dataUrl);
//   if (existingPath) {
//     return existingPath;
//   }

//   const imported = parseDataUrl(dataUrl);
//   const counter = imported.isImage ? state.imageCount + 1 : state.assetCount + 1;
//   const prefix = imported.isImage ? 'img' : 'asset';
//   const packagePath = makePackagePath(
//     EXPORTS_ROOT,
//     `${prefix}${counter.toString().padStart(3, '0')}.${imported.extension}`,
//   );

//   if (imported.isImage) {
//     state.imageCount = counter;
//   } else {
//     state.assetCount = counter;
//   }

//   state.dataUrlPaths.set(dataUrl, packagePath);
//   state.assets.push({
//     path: packagePath,
//     mime: imported.mime,
//     bytes: imported.bytes,
//   });

//   return packagePath;
// }

// // function that converts the Data URL back to an actual file
// function parseDataUrl(dataUrl: string): ImportedDataUrl {
//   const commaIndex = dataUrl.indexOf(',');
//   if (!dataUrl.startsWith('data:') || commaIndex === -1) {
//     throw new Error('Nur Base64 Data URLs werden unterstützt.');
//   }

//   const metadataParts = dataUrl.slice(5, commaIndex).split(';');
//   const declaredMime = metadataParts[0].toLowerCase();
//   const isBase64 = metadataParts.slice(1).some((part) => part.toLowerCase() === 'base64');
//   if (!isBase64) {
//     throw new Error('Nur Base64 Data URLs werden unterstützt.');
//   }

//   const bytes = Buffer.from(dataUrl.slice(commaIndex + 1), 'base64');
//   const detected = detectImageType(bytes);

//   if (declaredMime.length > 0 && declaredMime !== 'image') {
//     const declaredExtension = extensionFromMime(declaredMime);
//     if (declaredExtension) {
//       return {
//         bytes,
//         extension: declaredExtension,
//         mime: declaredMime,
//         isImage: declaredMime.startsWith('image/'),
//       };
//     }
//   }

//   return {
//     bytes,
//     extension: detected.extension,
//     mime: detected.mime,
//     isImage: detected.mime.startsWith('image/'),
//   };
// }

// //detects file type based on file signature (needs tweaking because it falls back to .bin if its not a img or jpeg)
// function detectImageType(bytes: Uint8Array): Omit<ImportedDataUrl, 'bytes'> {
//   if (hasPrefix(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
//     return { extension: 'png', mime: 'image/png', isImage: true };
//   }

//   if (hasPrefix(bytes, [0xff, 0xd8, 0xff])) {
//     return { extension: 'jpg', mime: 'image/jpeg', isImage: true };
//   }

//   return { extension: 'bin', mime: 'application/octet-stream', isImage: false };
// }

// function extensionFromMime(mime: string): string | undefined {
//   switch (mime) {
//     case 'image/png':
//       return 'png';
//     case 'image/jpeg':
//     case 'image/jpg':
//       return 'jpg';
//     case 'image/gif':
//       return 'gif';
//     case 'image/webp':
//       return 'webp';
//     case 'image/svg+xml':
//       return 'svg';
//     case 'application/pdf':
//       return 'pdf';
//     case 'application/zip':
//       return 'zip';
//     default:
//       return undefined;
//   }
// }
// //Checks if a file has a specified prefix in byte siganture
// function hasPrefix(bytes: Uint8Array, prefix: number[]): boolean {
//   return prefix.every((byte, index) => bytes[index] === byte);
// }
