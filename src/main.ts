import * as core from '@actions/core'
import * as glob from '@actions/glob'

async function run(): Promise<void> {
  try {
    core.info(`Hello Vostok`)

    const projectsGlobber = await glob.create(['*.csproj', '!*.Tests/*.csproj'].join('\n'))
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
