// 面板数据面：/data-analysis 前缀路由（模块列表 + 模块正文 + 搜索）。
// 只读接口：全部限定 GET/HEAD，与工具共用 modules.js + buildContent。
import { buildContent } from './skills.js'
import { listModules, getModule, searchModules } from './modules.js'

const BASE = '/data-analysis'
const MAX_QUERY = 100

function json(res, status, value, headers = {}) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
    ...headers,
  })
  res.end(JSON.stringify(value))
}

// 官方 web-and-data.md：宿主 URL token 已在插件之前把关；connection 服务只是深度防御，
// 缺席时放行（fail-closed 会把面板请求全部打成 403）。
export function requestRejection(ctx, req) {
  const connection = ctx.get('connection')
  if (typeof connection?.requestRejection !== 'function') return false
  return connection.requestRejection({ headers: req.headers })
}

export function registerApi(ctx, { skillDirs }) {
  return ctx.webServer.register({
    kind: 'prefix', path: BASE,
    async handler(req, res) {
      try {
        const r = requestRejection(ctx, req)
        if (typeof r === 'number') return json(res, r, { error: '未授权' })

        if (req.method !== 'GET' && req.method !== 'HEAD') {
          return json(res, 405, { error: '只支持 GET / HEAD' }, { allow: 'GET, HEAD' })
        }
        const url = new URL(req.url, 'http://x')
        const path = url.pathname.slice(BASE.length) || '/'

        if (path === '/api/health') return json(res, 200, { ok: true })

        if (path === '/api/modules') {
          const modules = listModules(skillDirs)
          return json(res, 200, { count: modules.length, modules })
        }

        if (path === '/api/module') {
          const id = (url.searchParams.get('id') || '').slice(0, 200)
          const mod = getModule(skillDirs, id)
          if (!mod) return json(res, 404, { error: `没有模块 ${id}` })
          // 与技能 get / data_module get 同一份正文，避免三个入口内容漂移。
          return json(res, 200, {
            module: { name: mod.name, dirName: mod.dirName, description: mod.description, body: buildContent(mod) },
          })
        }

        if (path === '/api/search') {
          const q = (url.searchParams.get('q') || '').slice(0, MAX_QUERY)
          const results = searchModules(skillDirs, q, 8)
          return json(res, 200, { count: results.length, results })
        }

        return json(res, 404, { error: 'not found' })
      } catch (err) { return json(res, 500, { error: err?.message || '内部错误' }) }
    },
  })
}
