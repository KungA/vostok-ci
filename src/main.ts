import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as exec from '@actions/exec'
import * as fs from 'fs'
const axios = require('axios');
const admzip = require('adm-zip');

async function run(): Promise<void> {
  try {
    core.info("Downloading Cement..")
    const cementAchve = await axios.get("https://github.com/skbkontur/cement/releases/download/v1.0.58/63d70a890a8a69703c066965196021afb7a793c1.zip", { responseType: "arraybuffer" })
    await fs.promises.writeFile("cement.zip", cementAchve.data)
    const cementZip = new admzip("cement.zip")
    cementZip.extractAllTo(".cement")

    const tmpGlobber = await glob.create([".cement/**"].join("\n"))
    const tmp = await tmpGlobber.glob()
    console.log(tmp)
    
    core.info("Installing Cement..")
    await exec.exec("./install.sh", [], {cwd: ".cement/dotnet"});
    
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
