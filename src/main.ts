import * as core from '@actions/core'
import * as github from "@actions/github";
import * as glob from '@actions/glob'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'
import * as cache from '@actions/cache'
import * as path from 'path'
import * as os from 'os'
import {getTestsCacheKey, getTestsCachePaths, execTool, moduleFolder, isMaster, isRelease} from "./helpers";

async function build(): Promise<void> {
  core.info(`Building '${github.context.ref}'`)
  
  core.startGroup("Download Cement")
  const cementArchive = await tc.downloadTool("https://github.com/skbkontur/cement/releases/download/v1.0.71/eed45d0e872e6d783b3a4eb8db0904f574de7018.zip")
  const cementZip = await tc.extractZip(cementArchive, "cement-zip")

  core.startGroup("Install Cement")
  if (os.platform() !== 'win32') {
    await exec.exec("chmod +x ./install.sh", [], {cwd: `${cementZip}/dotnet`});
    await exec.exec("./install.sh", [], {cwd: `${cementZip}/dotnet`});
  } else {
    await exec.exec("./install.cmd", [], {cwd: `${cementZip}/dotnet`});
  }
  core.addPath(`${os.homedir()}/bin`)
  await exec.exec("cm", ["--version"]);

  core.startGroup("Download dependencies")
  await exec.exec("cm", ["init"]);
  await exec.exec("cm", ["update-deps"], {cwd: moduleFolder});

  core.startGroup("Locate projects")
  const projectFilesGlobber = await glob.create([`${moduleFolder}/*/*.csproj`, `!${moduleFolder}/*.Tests/*.csproj`].join("\n"))
  const projectFiles = await projectFilesGlobber.glob()
  core.info(`Detected project files: ${projectFiles}`)
  const projectFolders = projectFiles.map(f => path.dirname(f))
  core.info(`Detected project folders: ${projectFolders}`)    
  const testFilesGlobber = await glob.create([`${moduleFolder}/*.Tests/*.csproj`].join("\n"))
  const testFiles = await testFilesGlobber.glob()
  core.info(`Detected test files: ${testFiles}`)
  const testFolders = testFiles.map(f => path.dirname(f))
  core.info(`Detected test folders: ${testFolders}`)

  core.startGroup("Check ConfigureAwait(false)")
  await execTool("configure-await-false", projectFolders);

  core.startGroup("Check TaskCreationOptions.RunContinuationsAsynchronously")
  await execTool("tcs-create-options", projectFolders);

  if (core.getInput("references") == "cement") {
    core.startGroup("Build dependencies")
    await exec.exec("cm", ["build-deps"], {cwd: moduleFolder});
  } else {
    core.startGroup("Replace cement references")
    await execTool("dotnetcementrefs", ["--source:https://api.nuget.org/v3/index.json"], {cwd: moduleFolder})
  }
  
  if (isMaster && !isRelease) {
    core.startGroup("Add version suffix")
    await execTool("dotnetversionsuffix", ["pre" + String(github.context.runNumber).padStart(6, "0")], {cwd: moduleFolder});
  }
  
  core.startGroup("Build")
  await exec.exec("dotnet", ["build", "-c", "Release"], {cwd: moduleFolder});

  core.startGroup("Cache")
  const testsCacheKey = getTestsCacheKey()
  const testsCachePaths = getTestsCachePaths();
  core.info(`Caching: ${testsCachePaths} with key = ${testsCacheKey}`)
  await cache.saveCache(testsCachePaths, testsCacheKey)
}

async function test(): Promise<void> {
  core.startGroup("Uncache")
  const testsCacheKey = getTestsCacheKey()
  const testsCachePaths = getTestsCachePaths();
  core.info(`Uncaching: ${testsCachePaths} with key = ${testsCacheKey}`)
  await cache.restoreCache(testsCachePaths, testsCacheKey)

  core.startGroup("Restore")
  await exec.exec("dotnet", ["restore"], {cwd: moduleFolder});
  
  core.startGroup("Test")
  await exec.exec("dotnet", 
      ["test", "-c", "Release", "--logger", "GitHubActions", "--framework", core.getInput("framework"), "--no-build"], 
      {cwd: moduleFolder, listeners: {stdline: line => {
        if (line.indexOf("Total:   ") != -1)
          core.notice(line)
          }}});
}

async function publish(): Promise<void> {
  core.startGroup("Pack")
  await exec.exec("dotnet", ["pack", "-c", "Release"], {cwd: moduleFolder});
  
  core.startGroup("Publish")
}

async function main(): Promise<void> {
  try {
    const job = github.context.job;
    switch (job) {
      case "build": await build(); break;
      case "test": await test(); break;
      case "publish": await publish(); break;
      default: core.setFailed(`Unknown '${job}' job.`)
    }
  } catch (error) {
    core.setFailed(JSON.stringify(error))
  }
}

main()
