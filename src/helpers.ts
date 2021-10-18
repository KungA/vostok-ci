import * as github from "@actions/github";
import os from "os";
import * as path from "path"
import * as exec from "@actions/exec";
import {ExecOptions} from "@actions/exec/lib/interfaces";

export const moduleFolder = "vostok.module";

export function getTestsCacheKey() {
    return `${github.context.repo.owner}.${github.context.repo.repo}-${os.platform()}-${process.env.GITHUB_RUN_ID}-${process.env.GITHUB_RUN_ATTEMPT}`;
}

export function getTestsCachePaths() {
    return [moduleFolder, "vostok.devtools/**/*.props"];
}

export async function execTool(tool: string, args?: string[], options?: ExecOptions): Promise<void> {
    const toolName = tool.replace(/-/g, "");
    await exec.exec("dotnet", ["build", "-c", "Release"], {cwd: `vostok.devtools/${tool}`});
    await exec.exec("dotnet", ["tool", "update", "--add-source", "nupkg", "-g", toolName], {cwd: `vostok.devtools/${tool}`});
    await exec.exec(toolName, args, options);
}