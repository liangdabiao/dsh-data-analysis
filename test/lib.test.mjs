// 纯函数 / 契约测试：零外部依赖，不需要安装 dsh。npm test → node --test
import test from 'node:test'
import assert from 'node:assert/strict'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { readDir, createSkillProvider, buildContent, rewrite, addendum } from '../lib/skills.js'
import { listModules, getModule, searchModules } from '../lib/modules.js'
import { createDataModuleTool, apply, check, skillDirsFrom, name as pluginName } from '../src/host.js'
import { requestRejection, registerApi } from '../lib/api.js'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const SKILL_DIRS = [join(ROOT, 'skills')]
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/

// ── 技能快照 ───────────────────────────────────────────────
test('skillDirsFrom 指向随包分发的 skills/ 根目录', () => {
  assert.equal(resolve(skillDirsFrom()[0]), resolve(SKILL_DIRS[0]))
})

test('快照：19 个模块，name 合法且与目录名一致、无重名、description 可用', () => {
  const items = readDir(SKILL_DIRS[0])
  assert.equal(items.length, 19)
  const names = items.map((m) => m.name)
  assert.equal(new Set(names).size, names.length)
  for (const m of items) {
    assert.match(m.name, NAME_RE)
    assert.equal(m.name, m.dirName)
    assert.ok(m.description.length >= 20, `${m.name} description 过短`)
    assert.ok(m.body.length > 200, `${m.name} 正文过短`)
  }
})

test('provider.list 是轻量候选层：不含正文、path 是相对标识', async () => {
  const list = await createSkillProvider(SKILL_DIRS).list()
  assert.equal(list.length, 19)
  for (const c of list) {
    assert.equal(c.path, c.name)
    assert.ok(!('body' in c) && !('content' in c))
    assert.equal(c.source, 'bundled')
    assert.equal(c.rank, 600)
    assert.deepEqual(c.invocation, { modelInvocable: true, userInvocable: true })
  }
})

test('注入正文：路径已 rewrite、addendum 齐备、无 git 命令 / .mjs', async () => {
  const p = createSkillProvider(SKILL_DIRS)
  const content = (await p.get((await p.list())[0])).content
  assert.match(content, /## 在 DSH 插件里使用/)
  assert.match(content, /data_module/)
  assert.match(content, /<WORKSPACE>/)
  assert.doesNotMatch(content, /\.\/data_storage\/|\.\/generated_code\//)
  assert.doesNotMatch(content, /git pull|git fetch|git clone|git -C/)
  assert.doesNotMatch(content, /\.mjs/)
  assert.ok(!content.includes(resolve(SKILL_DIRS[0])), '不应把宿主机绝对路径写进正文')

  const explorer = await p.get({ locator: join(SKILL_DIRS[0], 'data-explorer'), name: 'data-explorer' })
  assert.match(explorer.content, /<WORKSPACE>\/data\//, '上游 ./data_storage/ 必须被改写')
  assert.match(addendum({ name: 'x', dirName: 'x' }), /data_module/)
  assert.equal(rewrite('./generated_code/a.py'), '<WORKSPACE>/generated_code/a.py')
})

test('技能 get / 工具 get / buildContent 三入口正文完全一致', async () => {
  const p = createSkillProvider(SKILL_DIRS)
  const c = (await p.list()).find((x) => x.name === 'rfm-customer-segmentation')
  const viaSkill = (await p.get(c)).content
  const viaTool = (await createDataModuleTool(SKILL_DIRS).execute({ action: 'get', id: c.name })).data
  assert.equal(viaSkill, viaTool)
  assert.equal(buildContent(readDir(SKILL_DIRS[0]).find((m) => m.name === c.name)), viaSkill)
})

// ── 模块查询 ───────────────────────────────────────────────
test('modules：list / get / search / limit', () => {
  assert.equal(listModules(SKILL_DIRS).length, 19)
  assert.ok(listModules(SKILL_DIRS).every((m) => !('body' in m)))
  assert.ok(getModule(SKILL_DIRS, 'rfm-customer-segmentation').body.length > 200)
  assert.equal(getModule(SKILL_DIRS, 'no-such-module'), null)
  assert.equal(getModule(SKILL_DIRS, 123), null)
  assert.ok(searchModules(SKILL_DIRS, 'RFM').length >= 1)
  assert.ok(searchModules(SKILL_DIRS, 'funnel').length >= 1)
  assert.equal(searchModules(SKILL_DIRS, 'zzz不存在').length, 0)
  assert.equal(searchModules(SKILL_DIRS, '').length, 0)
  assert.ok(searchModules(SKILL_DIRS, 'a', 3).length <= 3)
})

// ── 工具定义与校验 ─────────────────────────────────────────
test('工具 schema 合规：additionalProperties:false / required / output.render', () => {
  const t = createDataModuleTool(SKILL_DIRS)
  assert.equal(t.name, 'data_module')
  assert.equal(t.parameters.additionalProperties, false)
  assert.deepEqual(t.parameters.required, ['action'])
  assert.ok(t.description.length > 30)
  assert.equal(typeof t.output.render, 'function')
  assert.equal(t.output.schema.additionalProperties, false)
  assert.ok(Object.values(t.parameters.properties).every((p) => p.description))
})

test('check 拒绝：缺参 / 未知参 / 坏枚举 / 类型 / 范围 / 长度', () => {
  const spec = createDataModuleTool(SKILL_DIRS).parameters
  const bad = [
    [{}, /缺少必填参数 action/],
    [{ action: 'list', bogus: 1 }, /未知参数/],
    [{ action: 'bad' }, /只能是/],
    [{ action: 'get', id: 123 }, /id 应为 string/],
    [{ action: 'list', limit: 'abc' }, /limit 应为 integer/],
    [{ action: 'list', limit: 0 }, /不能小于/],
    [{ action: 'list', limit: 999 }, /不能大于/],
    [{ action: 'search', keyword: 'x'.repeat(101) }, /最长/],
  ]
  for (const [args, re] of bad) assert.throws(() => check(args, spec), re)
  assert.doesNotThrow(() => check({ action: 'list' }, spec))
})

test('execute 拒绝条件必填，且错误能被模型读懂', async () => {
  const t = createDataModuleTool(SKILL_DIRS)
  await assert.rejects(() => t.execute({ action: 'get' }), /action=get 时 id 必填/)
  await assert.rejects(() => t.execute({ action: 'search' }), /action=search 时 keyword 必填/)
  await assert.rejects(() => t.execute({ action: 'search', keyword: 123 }), /keyword 应为 string/)
})

test('工具全链路：list / search / get 都拿到真实模块', async () => {
  const t = createDataModuleTool(SKILL_DIRS)
  const list = await t.execute({ action: 'list' })
  assert.equal(list.ok, true)
  assert.match(list.summary, /共 19 个分析模块/)
  assert.match(list.data, /rfm-customer-segmentation/)
  const search = await t.execute({ action: 'search', keyword: '漏斗' })
  assert.equal(search.ok, true)
  assert.ok(search.data.length > 0)
  const get = await t.execute({ action: 'get', id: 'funnel-analysis' })
  assert.equal(get.ok, true)
  assert.match(get.data, /## 在 DSH 插件里使用/)
  const miss = await t.execute({ action: 'get', id: 'nope' })
  assert.equal(miss.ok, false)
})

test('空技能目录不再伪装成成功（回归：旧版返回「共 0 个」且 ok=true）', async () => {
  const r = await createDataModuleTool([join(ROOT, 'no-such-dir')]).execute({ action: 'list' })
  assert.equal(r.ok, false)
  assert.match(r.summary, /为空或不可读/)
})

test('apply 注册工具 / 技能 / 路由三个 effect，无模块级可变状态', () => {
  const tags = []
  const ctx = {
    effect: (fn, tag) => { tags.push(tag); fn(); return { dispose() {} } },
    tools: { register: (t) => { assert.equal(t.name, 'data_module') } },
    skills: { registerProvider: (f) => { assert.equal(f().name, 'data-analysis') } },
    webServer: { register: (r) => { assert.equal(r.path, '/data-analysis') } },
    get: () => undefined,
  }
  apply(ctx, { skillDirs: SKILL_DIRS })
  assert.equal(tags.length, 3)
  assert.equal(pluginName, 'data-analysis')
})

// ── HTTP 数据面 ────────────────────────────────────────────
test('requestRejection：服务缺席放行，返回状态码则拒绝', () => {
  assert.equal(requestRejection({ get: () => undefined }, { headers: {} }), false)
  assert.equal(requestRejection({ get: () => ({ requestRejection: () => 403 }) }, { headers: {} }), 403)
})

function apiClient(connection) {
  let handler
  registerApi({ get: () => connection, webServer: { register: (r) => { handler = r.handler } } }, { skillDirs: SKILL_DIRS })
  return async (method, url) => {
    const res = {
      code: 0, headers: {}, payload: null,
      writeHead(code, headers) { this.code = code; this.headers = headers; return this },
      end(text) { this.payload = JSON.parse(text); return this },
    }
    await handler({ method, url, headers: {} }, res)
    return res
  }
}

test('API：health / modules / module / search / 404 / 方法限制', async () => {
  const call = apiClient(undefined)
  assert.equal((await call('GET', '/data-analysis/api/health')).payload.ok, true)
  const list = await call('GET', '/data-analysis/api/modules')
  assert.equal(list.code, 200)
  assert.equal(list.payload.count, 19)
  assert.equal(list.payload.modules.length, 19)
  const one = await call('GET', '/data-analysis/api/module?id=rfm-customer-segmentation')
  assert.equal(one.code, 200)
  assert.match(one.payload.module.body, /## 在 DSH 插件里使用/)
  assert.equal((await call('GET', '/data-analysis/api/module?id=nope')).code, 404)
  const search = await call('GET', '/data-analysis/api/search?q=%E7%95%99%E5%AD%98')
  assert.equal(search.code, 200)
  assert.ok(search.payload.results.length >= 1)
  assert.equal((await call('GET', '/data-analysis/nope')).code, 404)
  const post = await call('POST', '/data-analysis/api/modules')
  assert.equal(post.code, 405)
  assert.equal(post.headers.allow, 'GET, HEAD')
})

test('API：connection 拒绝时所有接口返回该状态码', async () => {
  const call = apiClient({ requestRejection: () => 403 })
  const r = await call('GET', '/data-analysis/api/modules')
  assert.equal(r.code, 403)
  assert.match(r.payload.error, /未授权/)
})
