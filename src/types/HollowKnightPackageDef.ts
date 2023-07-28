/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

export type ArrayReferences = string[];
export type ReferenceVersion = StringVersion | ReferenceDef;
export type StringVersion = string;
export type UniversalAsset = string;

/**
 * Package definition schema for Hollow Knight mods and modpacks
 */
export interface HollowKnightPackageDef {
    name?: string;
    version?: string;
    tags?: ("Boss" | "Cosmetic" | "Expansion" | "Gameplay" | "Library" | "Utility")[];
    description?: string;
    authors?: string[];
    repository?: string;
    packageVersion: undefined;
    dependencies?: ArrayReferences | MappedReferences;
    devDependencies?: ArrayReferences | MappedReferences;
    releaseAssets?: UniversalAsset | PlatformAssets;
    additionalAssets?: AdditionalAsset[];
}
export interface MappedReferences {
    [k: string]: ReferenceVersion;
}
export interface ReferenceDef {
    alternateInstallName?: string;
    fileType?: "zip" | "dll" | "infer";
    ref: GitReference | ModlinksReference | LinkReference;
}
export interface GitReference {
    asset?: UniversalAsset | PlatformAssets;
    tag?: string;
    useLatestRelease?: true;
}
export interface PlatformAssets {
    win32?: string;
    linux?: string;
    macos?: string;
}
export interface ModlinksReference {
    useLatestPublished?: true;
    version?: string;
}
export interface LinkReference {
    link: string;
}
export interface AdditionalAsset {
    downloadUrl: string;
    installPath: string;
    installRootDir: "mods" | "saves";
}