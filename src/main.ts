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
    const cementAchve = await axios.get("https://github.com/skbkontur/cement/releases/download/v1.0.58/63d70a890a8a69703c066965196021afb7a793c1.zip", { responseType: "arraybuffer" })
    await fs.promises.writeFile("cement.zip", cementAchve.data)
    const cementZip = new admzip("cement.zip")
    cementZip.extractAllTo(".cement")

    core.startGroup("Install Cement")
    if (os.platform() !== 'win32') {
      await exec.exec("chmod +x ./install.sh", [], {cwd: ".cement/dotnet"});
      await exec.exec("./install.sh", [], {cwd: ".cement/dotnet"});
    } else {
      await exec.exec("./install.cmd", [], {cwd: ".cement/dotnet"});
    }
    core.addPath("/home/runner/bin")
    await exec.exec("cm", ["--version"]);

    core.startGroup("Locate projects")
    const projectsGlobber = await glob.create(["*/*.csproj", "!*.Tests/*.csproj"].join("\n"))
    const projects = await projectsGlobber.glob()
    core.info(`Detected projects: ${projects}`)
    
    const testsGlobber = await glob.create(["*.Tests/*.csproj"].join("\n"))
    const tests = await testsGlobber.glob()
    core.info(`Detected tests: ${tests}`)
    
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
