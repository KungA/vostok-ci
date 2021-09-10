import * as core from '@actions/core'

async function run(): Promise<void> {
  try {
    core.info(`Hello Vostok`)
  } catch (error) {
    core.setFailed(error.message)
  }
}

run()
