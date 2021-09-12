import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as exec from '@actions/exec'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as os from 'os'
const axios = require('axios');
const admzip = require('adm-zip');

async function run(): Promise<void> {
  try {
    core.startGroup("Download Cement")
    const cementAchve = await axios.get("https://github.com/skbkontur/cement/releases/download/v1.0.71/eed45d0e872e6d783b3a4eb8db0904f574de7018.zip", { responseType: "arraybuffer" })
    await fs.promises.writeFile("cement.zip", cementAchve.data)
    const cementZip = new admzip("cement.zip")
    cementZip.extractAllTo("cement-zip")

    core.startGroup("Install Cement")
    if (os.platform() !== 'win32') {
      await exec.exec("chmod +x ./install.sh", [], {cwd: "cement-zip/dotnet"});
      await exec.exec("./install.sh", [], {cwd: "cement-zip/dotnet"});
    } else {
      await exec.exec("./install.cmd", [], {cwd: "cement-zip/dotnet"});
    }
    core.addPath(`${os.homedir()}/bin`)
    await exec.exec("cm", ["--version"]);

    core.startGroup("Download dependencies")
    await exec.exec("cm", ["init"], {cwd: ".."});
    await exec.exec("cm", ["update-deps"]);

    core.startGroup("Build dependencies")
    await exec.exec("cm", ["build-deps"]);

    core.startGroup("Locate projects")
    const projectFoldersGlobber = await glob.create(["*", "!*.Tests"].join("\n"))
    const projectFolders = await projectFoldersGlobber.glob()
    core.info(`Detected project folders: ${projectFolders}`)
    const projectsGlobber = await glob.create(["*/*.csproj", "!*.Tests/*.csproj"].join("\n"))
    const projects = await projectsGlobber.glob()
    core.info(`Detected projects: ${projects}`)
    const testFoldersGlobber = await glob.create(["*.Tests"].join("\n"))
    const testFolders = await testFoldersGlobber.glob()
    core.info(`Detected test folders: ${testFolders}`)
    const testsGlobber = await glob.create(["*.Tests/*.csproj"].join("\n"))
    const tests = await testsGlobber.glob()
    core.info(`Detected tests: ${tests}`)
    
    core.startGroup("Check ConfigureAwait(false)")
    await exec.exec("dotnet", ["build", "-c", "Release"], {cwd: "../vostok.devtools/configure-await-false"});
    await exec.exec("dotnet", ["tool", "update", "--add-source", "nupkg", "-g", "configureawaitfalse"], {cwd: "../vostok.devtools/configure-await-false"});
    await exec.exec("configureawaitfalse", projectFolders);
    
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
