import fetch from 'node-fetch';
import { validate } from "jsonschema";
import { HollowKnightModManagerPackageDefV1 } from "./types/HollowKnightModManagerPackageDefV1.js";
import { HollowKnightPackageDef } from "./types/HollowKnightPackageDef.js";
import { options } from './agent.js';
import { ROOT } from './consts.js';
import { report } from './output.js';
import { writeFileSync } from 'fs';

const hkmmpackSchema = await (await fetch("https://raw.githubusercontent.com/hkmodmanager/hkmm-schema/main/hkmm-schema/hkmmpackage.v1.schema.json", options)).text();
const hpackSchema = await (await fetch("https://raw.githubusercontent.com/hpackage/hpackage-schema/main/hpackage.schema.json", options)).text();

export async function checkModpack(file: string, head: string, repo: string, owner: string, onlyCheck: boolean) {
    const missingFields: string[] = [];
    console.log(`https://raw.githubusercontent.com/${owner}/${repo}/${head}/${file}`);
    const data = await (await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${head}/${file}`, options)).text();
    const j = JSON.parse(data) as (HollowKnightPackageDef | HollowKnightModManagerPackageDefV1);
    const requireFields: (keyof HollowKnightPackageDef)[] = ["name", "version", "description", "authors"];
    for (const name of requireFields) {
        if (!j[name]) {
            if(onlyCheck) return false;
            report(file, `Missing field ${name}`)
            missingFields.push(name);
        }
    }
    if(missingFields.length > 0) {
        return false;
    }
    let correctPath = false;
    for (const author of j.authors ?? []) {
        if(file.startsWith(author + "/")) {
            correctPath = true;
            break;
        }
    }
    if(!correctPath) {
        report(file, `wrong file path`)
    }
    const isHKMMPackage = j.packageVersion == 1;
    const schema = JSON.parse(isHKMMPackage ? hkmmpackSchema : hpackSchema);
    schema["additionalProperties"] = true;
    const result = validate(j, schema);
    if(!result.valid) {
        if(onlyCheck) return false;
        for (const error of result.errors) {
            report(file, `${error.property}:${error.message}`);
        }
        return false;
    }
    return true;
}
