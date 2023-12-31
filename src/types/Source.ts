/* eslint-disable */
/**
 * This file was automatically generated by json-schema-to-typescript.
 * DO NOT MODIFY IT BY HAND. Instead, modify the source JSONSchema file,
 * and run json-schema-to-typescript to regenerate this file.
 */

import { HollowKnightModManagerPackageDefV1 } from "./HollowKnightModManagerPackageDefV1";
import { HollowKnightPackageDef } from "./HollowKnightPackageDef";

/**
 * Definition schema for Hollow Knight Mod Manager Packages Provider
 */
export interface HollowKnightModManagerPackageProviderV1 {
    name: string;
    icon?: string;
    description: string;
    authors?: string[];
    repository?: string;
    packages: (string | HollowKnightPackageDef | HollowKnightModManagerPackageDefV1)[];
}
