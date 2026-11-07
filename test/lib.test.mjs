import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const { createSkillProvider } = await import('../lib/skills.js')
const api = await import('../lib/api.js')

test('19 个技能全部可解析', async () => {
  const provider = createSkillProvider([join(ROOT, 'skills', 'data-analysis', '.claude', 'skills')])
  const candidates = await provider.list()
  assert.equal(candidates.length, 19)
  for (const c of candidates) assert.ok(c.description.length > 20, c.name + ' desc 太短')
})

test('核心技能存在', async () => {
  const provider = createSkillProvider([join(ROOT, 'skills', 'data-analysis', '.claude', 'skills')])
  const list = await provider.list()
  assert.ok(list.some(c => c.name.includes('data-analysis')))
  assert.ok(list.some(c => c.name.includes('internet')))
})

test('面板 API 鉴权', () => {
  assert.equal(api.requestRejection({ get: () => undefined }, { headers: {} }), 403)
})

test('LICENSE 为 MIT', () => {
  assert.match(readFileSync(join(ROOT, 'LICENSE'), 'utf8'), /MIT/)
})
