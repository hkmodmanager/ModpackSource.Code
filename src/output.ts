import { Octokit } from "@octokit/rest";
import { REPO_NAME, REPO_OWNER } from "./consts.js";

export interface ErrorInfo {
    path: string;
    msg: string;
}

export const errors: ErrorInfo[] = [];

export async function report(path: string, msg: string) {
    console.error(`Error: ${path}: ${msg}`);
    errors.push({
        path, msg
    });
}

export async function send(rest: Octokit) {
    const check = (await rest.checks.listForRef({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        ref: process.env.REF as string,
        check_name: process.env.CHECK_NAME as string
    })).data.check_runs[0];
    console.log("Check id: " + check.id);
    await rest.checks.update({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        check_run_id : check.id,
        output: {
            title: "Check",
            summary: `There are ${errors.length} failures, 0 warnings, and 0 notices.`,
            annotations: errors.map(x => {
                return {
                    path: x.path,
                    annotation_level: "failure",
                    message: x.msg,
                    start_line: 1,
                    end_line: 1
                }
            })
        }
    });
}
