const Settings = require('settings-sharelatex')

async function run({ assertHasStatusCode, request }) {
  const response = await request(`/project/${Settings.smokeTest.projectId}`)

  assertHasStatusCode(response, 200)

  const PROJECT_ID_REGEX = new RegExp(
    `window.project_id = "${Settings.smokeTest.projectId}"`
  )
  if (!PROJECT_ID_REGEX.test(response.body)) {
    throw new Error('project page html does not have project_id')
  }
}

module.exports = { run }
