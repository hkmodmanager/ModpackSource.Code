import fetch from 'node-fetch';
import { Octokit } from "@octokit/rest";
import { parse } from "path";
import { checkModpack } from "./checkModpack.js";
import { REPO_NAME, REPO_OWNER, ROOT } from "./consts.js";
import { options } from "./agent.js";
import { report } from './output.js';
import { checkSourceMetadata } from './checkMetadata.js';

export async function checkPR(rest: Octokit, prId: number, onlyCheck: boolean) {
    let success: boolean = true;

    const pr = await rest.pulls.get({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: prId
    });

    if(pr.data.base.ref != "main") return false;

    const authorId = pr.data.user.id;
    const files = await rest.pulls.listFiles({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        pull_number: prId,
        per_page: 100
    });

    for (const file of files.data) {
        console.log("File name: " + file.filename);
        const fileName = file.filename;
        if (!fileName.endsWith(".json") || !fileName.includes("/") || fileName.startsWith('.github')) {
            report(fileName, "Invalid file");
            if (onlyCheck) return false;
            success = false;
            continue;
        }
        const checkFile = fileName + ".authors";
        const authorsRep = await fetch(`https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/main/${checkFile}`, options);
        if (authorsRep.status == 200) {
            const authors = (await authorsRep.text()).split('\n');
            if (!authors.includes(authorId.toString())) {
                report(fileName, "No permission to modify");
                if (onlyCheck) return false;
                success = false;
                continue;
            }
        }
        if(parse(fileName).base == "_.json") {
            const result = await checkSourceMetadata(fileName, pr.data.head.sha, pr.data.head.repo?.name ?? "", pr.data.head.user.login, onlyCheck);
            if(!result) {
                if(onlyCheck) {
                    return false;
                }
                success = false;
            }
        } else {
            const result = await checkModpack(fileName, pr.data.head.sha, pr.data.head.repo?.name ?? "", pr.data.head.user.login, onlyCheck);
            if(!result) {
                if(onlyCheck) {
                    return false;
                }
                success = false;
            }
        }
    }
    return success;
}
