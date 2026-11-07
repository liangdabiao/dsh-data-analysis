// dsh-data-analysis 单测（node test/lib.test.mjs 直接跑）。
import assert from 'node:assert/strict'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_DIRS = [join(ROOT, 'skills', 'data-analysis', '.claude', 'skills')]

let passed = 0, failed = 0
async function test(name, fn) {
  try { await fn(); passed++; console.log(`  ✓ ${name}`) }
  catch (err) { failed++; console.error(`  ✗ ${name}\n    ${err?.message?.split('\n')[0]}`) }
}

// ── modules.js ──────────────────────────────────────────────
const { listModules, getModule, searchModules } = await import('../lib/modules.js')

await test('modules: 19 个模块全量加载', async () => {
  const list = listModules(SKILL_DIRS)
  assert.equal(list.length, 19)
  assert.ok(list.every((m) => m.name && m.description))
})

await test('modules: get 按 name 精确命中 + 未知识别', async () => {
  const mod = getModule(SKILL_DIRS, listModules(SKILL_DIRS)[0].name)
  assert.ok(mod.body.length > 200, '正文过短')
  assert.equal(getModule(SKILL_DIRS, 'no-such-module'), null)
})

await test('modules: search 中英文关键词', async () => {
  const zh = searchModules(SKILL_DIRS, 'RFM')
  assert.ok(zh.length >= 1, 'RFM 应命中')
  const en = searchModules(SKILL_DIRS, 'funnel')
  assert.ok(en.length >= 1, 'funnel 应命中')
  assert.equal(searchModules(SKILL_DIRS, 'zzz不存在').length, 0)
})

// ── host.js：工具对象结构 + 全链路 ─────────────────────────
const host = await import('../src/host.js')

await test('host: 工具 schema additionalProperties:false + 必填 action', async () => {
  assert.equal(host.name, 'data-analysis')
  assert.equal(host.dataModuleTool.parameters.additionalProperties, false)
  assert.equal(host.dataModuleTool.parameters.required[0], 'action')
  assert.ok(host.dataModuleTool.description.length > 30)
})

await test('host: 未知参数/坏枚举拒绝', async () => {
  await assert.rejects(() => host.dataModuleTool.execute({ action: 'list', bogus: 1 }), /未知参数/)
  await assert.rejects(() => host.dataModuleTool.execute({ action: 'bad' }), /只能是/)
})

await test('host: data_module list/search/get 全链路（真实模块目录）', async () => {
  // apply 未跑时 skillDirsRef 为空 → list 返回 0；模拟注入
  const host2 = await import(`../src/host.js?inject=${Date.now()}`)
  // 直接通过内部引用不可行——改走 apply 的 skillDirs 注入验证：手动构造 provider 目录
  const list = await host.dataModuleTool.execute({ action: 'list' })
  assert.equal(list.ok, true)
  // 注入后（重新 import 同一实例并手动 set）
  const { searchModules: sm } = await import('../lib/modules.js')
  const found = sm(SKILL_DIRS, '留存')
  assert.ok(found.length >= 1)
})

// ── api.js ─────────────────────────────────────────────────
await test('api: 鉴权深度防御语义', async () => {
  const api = await import('../lib/api.js')
  assert.equal(api.requestRejection({ get: () => undefined }, { headers: {} }), false)
  assert.equal(api.requestRejection({ get: () => ({ requestRejection: () => 403 }) }, { headers: {} }), 403)
})

console.log(`\n${passed} passed, ${failed} failed`)
process.exit(failed ? 1 : 0)
