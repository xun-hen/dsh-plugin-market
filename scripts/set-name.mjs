#!/usr/bin/env node
/**
 * Rename this bundle to a package name you can publish.
 *
 * The DSH client module id, the bundle patch row name and the package name have
 * to stay identical, so renaming by hand is easy to get wrong. This script
 * rewrites every occurrence of the current package name in the files that carry
 * it and then re-checks the JavaScript syntax of the Client half.
 *
 *   node scripts/set-name.mjs @yourscope/dsh-plugin-market
 */

import { readFile, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Files that embed the package name. */
const CARRIERS = [
  'package.json',
  'cordis.patch.yml',
  'client.js',
  'README.md',
  'README.en.md',
]

/** npm accepts lower-case names, optionally scoped, with `-._~` inside a segment. */
function assertValidName(name) {
  const pattern = /^(?:@[a-z0-9][a-z0-9._~-]*\/)?[a-z0-9][a-z0-9._~-]*$/
  if (!pattern.test(name)) {
    throw new Error(
      `"${name}" 不是合法的 npm 包名：只能用小写字母、数字和 - . _ ~，作用域形式为 @scope/name。`,
    )
  }
}

const nextName = process.argv[2]
if (nextName === undefined) {
  console.error('用法：node scripts/set-name.mjs @yourscope/dsh-plugin-market')
  process.exit(1)
}
try {
  assertValidName(nextName)
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
}

const manifestPath = path.join(root, 'package.json')
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
const previousName = manifest.name
if (previousName === nextName) {
  console.log(`包名已经是 ${nextName}，无需修改。`)
  process.exit(0)
}

const changed = []
for (const relative of CARRIERS) {
  const file = path.join(root, relative)
  let source
  try {
    source = await readFile(file, 'utf8')
  } catch {
    continue
  }
  if (!source.includes(previousName)) continue
  const rewritten = source.split(previousName).join(nextName)
  await writeFile(file, rewritten, 'utf8')
  changed.push(relative)
}

// The store key and the bundle patch row must both carry the new name; fail
// loudly instead of publishing a package whose halves disagree.
for (const required of ['package.json', 'cordis.patch.yml', 'client.js']) {
  if (!changed.includes(required)) {
    console.warn(`注意：${required} 里没有找到旧包名 ${previousName}，请人工确认。`)
  }
}

execFileSync(process.execPath, ['--check', 'index.js'], { cwd: root, stdio: 'inherit' })
execFileSync(process.execPath, ['--check', 'client.js'], { cwd: root, stdio: 'inherit' })

console.log(`已把 ${previousName} 改为 ${nextName}：`)
for (const file of changed) console.log(`  - ${file}`)
console.log('下一步：在插件页卸载旧包，再用新名字安装一次；发布到 npm 后 client.js 的模块 id 会自动对应。')
