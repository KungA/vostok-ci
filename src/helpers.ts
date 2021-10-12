import * as github from "@actions/github";
import os from "os";

export function getTestsCacheKey() {
    return `${github.context.repo.owner}.${github.context.repo.repo}-${os.platform()}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
}