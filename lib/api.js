// 面板数据面：/data-analysis 前缀路由（模块列表 + 模块正文 + 搜索）。
import { readDir } from './skills.js'
import { listModules, getModule, searchModules } from './modules.js'

const BASE = '/data-analysis'

function json(res, status, value) {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
  res.end(JSON.stringify(value))
}
export function requestRejection(ctx, req) {
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection !== 'function') return false // dsh 0.2.x 宿主已 token 鉴权，服务缺席时放行（fail-closed 会把面板永久 403）
  return connection.requestRejection({ headers: req.headers })
}
export function registerApi(ctx, { skillDirs }) {
  return ctx.webServer.register({
    kind: 'prefix', path: BASE,
    async handler(req, res) {
      try {
        const r = requestRejection(ctx, req)
        if (typeof r === 'number') return json(res, r, { error: '未授权' })
        const url = new URL(req.url, 'http://x')
        const path = url.pathname.slice(BASE.length) || '/'
        if (path === '/api/health') return json(res, 200, { ok: true })
        if (path === '/api/modules') {
          return json(res, 200, { count: listModules(skillDirs).length, modules: listModules(skillDirs) })
        }
        if (path === '/api/module' && req.method === 'GET') {
          const id = url.searchParams.get('id') || ''
          const mod = getModule(skillDirs, id)
          if (!mod) return json(res, 404, { error: `没有模块 ${id}` })
          return json(res, 200, { module: { name: mod.name, description: mod.description, body: mod.body } })
        }
        if (path === '/api/search') {
          const keyword = url.searchParams.get('q') || ''
          return json(res, 200, { results: searchModules(skillDirs, keyword).slice(0, 8) })
        }
        json(res, 404, { error: 'not found' })
      } catch (err) { json(res, 500, { error: err?.message }) }
    },
  })
}

// 兼容旧面板调用
export { readDir }
