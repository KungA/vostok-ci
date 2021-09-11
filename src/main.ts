import * as core from '@actions/core'
import * as glob from '@actions/glob'
import * as fs from 'fs'
const axios = require('axios');
const admzip = require('adm-zip');

async function run(): Promise<void> {
  try {
    core.info(`Hello Vostok`)

    const cementAchve = await axios.get("https://github.com/skbkontur/cement/releases/download/v1.0.58/63d70a890a8a69703c066965196021afb7a793c1.zip", { responseType: "arraybuffer" });
    await fs.promises.writeFile("cement.zip", cementAchve.data);
    const cementZip = new admzip("cement.zip");
    cementZip.extractEntryTo(".")
    
    const projectsGlobber = await glob.create(['*/*.csproj', '!*.Tests/*.csproj'].join('\n'))
    const projects = await projectsGlobber.glob()
    console.log(projects)
    
    const testsGlobber = await glob.create(['*.Tests/*.csproj'].join('\n'))
    const tests = await testsGlobber.glob()
    console.log(tests)
    
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
