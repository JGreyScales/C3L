import { checkModules } from '../src/core/checkModules'

// Run it with:  bun run sanity
// It loads every module and opens its front page, then prints which modules are OK.

const results = await checkModules()
const onGitHub = process.env.GITHUB_ACTIONS === 'true'

if (results.length === 0) {
  console.log('No modules found yet in src/modules. Nothing to check.')
}

for (const result of results) {
  if (result.ok) {
    console.log(`  OK    ${result.folder}`)
    continue
  }

  console.log(`  FAIL  ${result.folder}\n          ${result.problem}`)

  // On GitHub this turns into a red message on the pull request.
  if (onGitHub) {
    const file = `src/modules/${result.folder}`
    const text = String(result.problem).replaceAll('\n', ' ')
    console.log(`::error file=${file},title=Module "${result.folder}" is broken::${text}`)
  }
}

const failed = results.filter((result) => !result.ok)
console.log(
  failed.length === 0
    ? `\nAll ${results.length} module(s) are OK.`
    : `\n${failed.length} of ${results.length} module(s) need fixing.`,
)

process.exit(failed.length === 0 ? 0 : 1)
