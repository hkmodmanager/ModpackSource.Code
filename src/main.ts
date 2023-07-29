import fetch from 'node-fetch';
import { Octokit } from "@octokit/rest";
import { options } from "./agent.js";
import { REPO_NAME, REPO_OWNER } from "./consts.js";
import { checkPR } from "./prCheck.js";
import { send } from './output.js';
import { existsSync, mkdirSync, readdirSync, readFileSync, realpath, writeFileSync } from 'fs';
import { HollowKnightModManagerPackageProviderV1 } from './types/Source.js';
import { dirname, join } from 'path';
import { SourceMetadata } from './types/SourceMetadata.js';
import * as cpi from 'compressing'

export const rest = new Octokit({
    auth: process.env.GH_TOKEN
});

const action = process.argv[2];
console.log(action);
if (action == "pr") {

    const prID = Number.parseInt(process.env.PR_ID ?? "-1");
    if (prID <= 0) process.exit(-1);
    const result = await checkPR(rest, prID, false);
    await send(rest);
    process.exit(result ? 0 : -1);
}

let hasChanged = false;
const prs = await rest.pulls.list({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    per_page: 40,
    state: "open"
});

const modifiedFiles: string[] = [];

for (const pr of prs.data) {
    console.log("PR Id: " + pr.number);
    try {
        const result = await checkPR(rest, pr.number, true);
        if (!result) continue;
        hasChanged = true;
        await rest.pulls.merge({
            repo: REPO_NAME,
            owner: REPO_OWNER,
            pull_number: pr.number
        });
        var files = await rest.pulls.listFiles({
            repo: REPO_NAME,
            owner: REPO_OWNER,
            pull_number: pr.number
        });
        for (const file of files.data) {
            modifiedFiles.push(file.filename);
            const checkFile = file.filename + ".authors";
            let req = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${checkFile}`, options);
            if (req.status == 200) {
                continue;
            }
            const content = (pr.user?.id ?? 0) + "\n";
            try {
                await rest.repos.createOrUpdateFileContents({
                    repo: REPO_NAME,
                    owner: REPO_OWNER,
                    path: checkFile,
                    content: Buffer.from(content, 'utf8').toString("base64"),
                    message: "Update author"
                });
            } catch (e) {
                console.error(e);
            }
        }
        console.log("Merge pr: " + pr.id);
    } catch (e) {
        console.error(e);
    }
}
if (!hasChanged) process.exit(0);
console.log('Downloading Zip Archive');
let data: Buffer | undefined;
const archive = await rest.repos.downloadZipballArchive({
    owner: REPO_OWNER,
    repo: REPO_NAME,
    ref: "main"
});

if (archive.status == 302) {
    data = Buffer.from(await (await fetch(archive.headers.location ?? "", options)).arrayBuffer());
} else {
    data = Buffer.from(archive.data as any);
}

if (!data) {
    console.error("Unable to download ZipArchive");
    process.exit(-1);
}
console.log('Zip Archive Size: ' + data.length);
//Generate modpack source
let root = "modpacks";
mkdirSync(root);
await cpi.zip.uncompress(data, root);
root = join(root, readdirSync(root, 'utf8')[0]);
console.log('uncompress: ' + root);
for (const file of modifiedFiles) {
    const dir = dirname(join(root, file));
    if (!existsSync(dir)) {
        mkdirSync(dir, {
            recursive: true
        });
    }
    const p = join(dir, "__MODIFIED__");
    writeFileSync(p, "modified");
}

const sources: Set<HollowKnightModManagerPackageProviderV1> = new Set();

async function entry(path: string, source: HollowKnightModManagerPackageProviderV1) {
    const real = path == "" ? root : join(root, path);
    const def = join(real, "_.json");
    console.log(`Entry dir: ${path}(${real}) [${def}]`);
    if (existsSync(def)) {
        console.log(`Found def file: ` + def);
        const defContent = JSON.parse(readFileSync(def, 'utf8')) as SourceMetadata;
        source = {
            name: defContent.name,
            authors: defContent.authors,
            description: defContent.description,
            repository: defContent.repository,
            packages: [],
            icon: defContent.icon
        };
    } else if (!source) return;
    for (const dirent of readdirSync(real, {
        withFileTypes: true,
        recursive: false,
        encoding: 'utf8'
    })) {
        console.log(`Got dirent: ${dirent.name} ${dirent.path} ${dirent.isFile()}`);
        if (dirent.name == "_.json" || dirent.name.endsWith(".authors") || dirent.name.startsWith('.')) continue;
        const p = join(path, dirent.name);
        if (dirent.isDirectory()) {
            await entry(p, source);
        } else if (dirent.isFile()) {
            if (dirent.name == "__MODIFIED__") {
                console.log(`Modified modpack source: ${source?.name}`);
                sources.add(source);
                continue;
            }
            if (!dirent.name.endsWith('.json')) continue;
            let p2 = p.replaceAll("\\", "/");
            if (!p2.startsWith('/')) p2 = '/' + p2;
            const url = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main${p2}`;
            source.packages.push(url);
        }
    }
}

await entry("", undefined as any);

for (const source of sources) {
    const p = source.name + ".json";
    let sha: string | undefined;
    try {
        const old = await rest.repos.getContent({
            owner: REPO_OWNER,
            repo: REPO_NAME,
            path: p,
            ref: "refs/heads/source"
        });
        sha = (old.data as any).sha;
    } catch (e) {
        console.error(e);
    }
    await rest.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        branch: "source",
        path: p,
        content: Buffer.from(JSON.stringify(source, undefined, 4)).toString('base64'),
        message: "Update source: " + source.name,
        sha
    });
}
