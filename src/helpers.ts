﻿import * as github from "@actions/github";
import os from "os";
import * as path from "path"
import * as exec from "@actions/exec";
import {ExecOptions} from "@actions/exec/lib/interfaces";
import * as core from "@actions/core";

export const moduleFolder = "vostok.module";

export const isMaster = github.context.ref == "refs/heads/master"
export const isRelease = github.context.ref.startsWith("refs/tags/release/")
export const isPreRelease = github.context.ref.startsWith("refs/tags/prerelease/")

export function getTestsCacheKey(references?: string) {
    return `${github.context.repo.owner}.${github.context.repo.repo}-${os.platform()}-${references ?? core.getInput("references")}-${process.env.GITHUB_RUN_NUMBER}-${process.env.GITHUB_RUN_ATTEMPT}`;
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