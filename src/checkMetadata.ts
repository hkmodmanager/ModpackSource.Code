import { validate } from 'jsonschema';
import fetch from 'node-fetch';
import { options } from './agent.js';
import { report } from './output.js';
import { SourceMetadata } from './types/SourceMetadata.js';

const schemaRAW = await (await fetch("https://raw.githubusercontent.com/hkmodmanager/ModpackSource/schema/mps.schema.json", options)).text();


export async function checkSourceMetadata(file: string, head: string, repo: string, owner: string, onlyCheck: boolean) {
    const missingFields: string[] = [];
    console.log(`https://raw.githubusercontent.com/${owner}/${repo}/${head}/${file}`);
    const data = await (await fetch(`https://raw.githubusercontent.com/${owner}/${repo}/${head}/${file}`, options)).text();
    const j = JSON.parse(data) as SourceMetadata;
    const requireFields: (keyof SourceMetadata)[] = ["name", "description", "authors"];
    for (const name of requireFields) {
        if (!j[name]) {
            if (onlyCheck) return false;
            report(file, `Missing field ${name}`)
            missingFields.push(name);
        }
    }
    if (missingFields.length > 0) {
        return false;
    }
    if(j.name.includes('/') || j.name.includes('\\')) {
        report(file, `Invalid name: ${j.name}`);
        return false;
    }
    let correctPath = false;
    for (const author of j.authors ?? []) {
        if (file.startsWith(author + "/")) {
            correctPath = true;
            break;
        }
    }

    const schema = JSON.parse(schemaRAW);
    schema["additionalProperties"] = true;
    const result = validate(j, schema);
    if (!result.valid) {
        if (onlyCheck) return false;
        for (const error of result.errors) {
            report(file, `${error.property}:${error.message}`);
        }
        return false;
    }
    return true;
}