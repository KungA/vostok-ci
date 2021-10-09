import * as core from '@actions/core'
import * as github from "@actions/github";
import * as glob from '@actions/glob'
import * as exec from '@actions/exec'
import * as tc from '@actions/tool-cache'
import * as cache from '@actions/cache'
import * as path from 'path'
import * as os from 'os'
import {getTestsCacheKey} from "./helpers";

async function build(): Promise<void> {
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
  await exec.exec("cm", ["init"], {cwd: ".."});
  await exec.exec("cm", ["update-deps"]);

  core.startGroup("Build dependencies")
  await exec.exec("cm", ["build-deps"]);

  core.startGroup("Locate projects")
  const projectFilesGlobber = await glob.create(["*/*.csproj", "!*.Tests/*.csproj"].join("\n"))
  const projectFiles = await projectFilesGlobber.glob()
  core.info(`Detected project files: ${projectFiles}`)
  const projectFolders = projectFiles.map(f => path.dirname(f))
  core.info(`Detected project folders: ${projectFolders}`)    
  const testFilesGlobber = await glob.create(["*.Tests/*.csproj"].join("\n"))
  const testFiles = await testFilesGlobber.glob()
  core.info(`Detected test files: ${testFiles}`)
  const testFolders = testFiles.map(f => path.dirname(f))
  core.info(`Detected test folders: ${testFolders}`)

  core.startGroup("Check ConfigureAwait(false)")
  await exec.exec("dotnet", ["build", "-c", "Release"], {cwd: "../vostok.devtools/configure-await-false"});
  await exec.exec("dotnet", ["tool", "update", "--add-source", "nupkg", "-g", "configureawaitfalse"], {cwd: "../vostok.devtools/configure-await-false"});
  await exec.exec("configureawaitfalse", projectFolders);

  core.startGroup("Build")
  await exec.exec("dotnet", ["build", "-c", "Release"]);

  core.startGroup("Cache")
  const testsCacheKey = getTestsCacheKey()
  core.info(`Tests cache key: ${testsCacheKey}`)
  await cache.saveCache(["**"], testsCacheKey)
}

async function test(): Promise<void> {
  core.startGroup("Uncache")
  const testsCacheKey = getTestsCacheKey()
  core.info(`Tests cache key: ${testsCacheKey}`)
  await cache.restoreCache(["**"], testsCacheKey)

  core.startGroup("Test")
  await exec.exec("dotnet", ["build", "-c", "Release", "--logger GitHubActions", "--framework", core.getInput("framework") ]);
}

async function publish(): Promise<void> {
  core.startGroup("Publish")
}

async function main(): Promise<void> {
  try {
    const type = core.getInput("type");
    switch (type) {
      case "build": await build(); break;
      case "test": await test(); break;
      case "publish": await publish(); break;
    }
  } catch (error) {
    core.setFailed(JSON.stringify(error))
  }
}

main()
