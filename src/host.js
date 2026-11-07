// 智能数据分析 · Host 半边（技能 + data_module 原生工具 + 面板数据面）。
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSkillProvider } from '../lib/skills.js'
import { registerApi } from '../lib/api.js'
import { listModules, getModule, searchModules } from '../lib/modules.js'

export const name = 'data-analysis'
export const inject = ['tools', 'skills', 'webServer', 'connection']

// 手写参数校验（原生注册工具 dsh 不代验参数）
function check(args, spec) {
  const problems = []
  for (const key of spec.required || []) {
    if (args?.[key] === undefined) problems.push(`缺少必填参数 ${key}`)
  }
  for (const [key, rule] of Object.entries(spec.properties || {})) {
    const value = args?.[key]
    if (value === undefined) continue
    if (rule.enum && !rule.enum.includes(value)) problems.push(`${key} 只能是 ${rule.enum.join(' / ')} 之一`)
  }
  for (const key of Object.keys(args || {})) {
    if (!spec.properties || !(key in spec.properties)) problems.push(`未知参数 ${key}`)
  }
  if (problems.length) throw new Error(`data_module 参数有误：${problems.join('；')}。`)
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const num = (description, extra = {}) => ({ type: 'number', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]

const OUTPUT = {
  schema: {
    type: 'object',
    additionalProperties: false,
    required: ['ok', 'summary'],
    properties: {
      ok: { type: 'boolean' },
      summary: { type: 'string', description: '给模型看的回执' },
      data: { type: 'string', description: '可选：模块列表/正文' },
    },
  },
  render: (_args, value) => text(value.data ? `${value.summary}\n\n${value.data}` : value.summary),
}

const result = (ok, summary, data = '') => ({ ok, summary, data })

// ---------------------------------------------------------------------------
// 工具：data_module —— 19 个专业分析模块查询
// ---------------------------------------------------------------------------
export const dataModuleTool = {
  name: 'data_module',
  description:
    '查询 19 个专业数据分析方法模块（A/B 测试、归因建模、漏斗分析、RFM、留存、LTV、增长模型、回归、推荐系统、可视化探索、报告写作、联网数据分析等）。' +
    'search 用中文/英文关键词找对应方法模块；get 拿到完整方法论正文后再动手分析。做数据分析前先用它匹配方法。',
  parameters: {
    type: 'object',
    additionalProperties: false,
    required: ['action'],
    properties: {
      action: str('list 列全部模块；search 关键词搜索；get 取模块完整正文', { enum: ['list', 'search', 'get'] }),
      id: str('get：模块名（list/search 里能看到）'),
      keyword: str('search：关键词，如「留存」「漏斗」「RFM」「funnel」「归因」'),
      limit: num('search：最多返回条数，默认 8'),
    },
  },
  output: OUTPUT,
  async execute(args) {
    check(args, this.parameters)
    const skillDirs = skillDirsRef.dirs
    if (args.action === 'list') {
      const mods = listModules(skillDirs)
      return result(true, `共 ${mods.length} 个分析模块：`,
        mods.map((m) => `- ${m.name}：${m.description}`).join('\n'))
    }
    if (args.action === 'search') {
      if (!args.keyword) throw new Error('search 需要 keyword。')
      const found = searchModules(skillDirs, args.keyword).slice(0, args.limit || 8)
      if (!found.length) return result(false, `没有匹配「${args.keyword}」的模块，试试 list 看全部。`)
      return result(true, `匹配到 ${found.length} 个模块：`,
        found.map((m) => `- ${m.name}：${m.description}\n  命中：…${m.snippet}…`).join('\n'))
    }
    if (!args.id) throw new Error('get 需要 id。')
    const mod = getModule(skillDirs, args.id)
    if (!mod) return result(false, `没有找到模块 ${args.id}（先 search/list 找名字）。`)
    return result(true, `模块「${mod.name}」完整方法论（照此执行分析）：`, mod.body)
  },
}

const skillDirsRef = { dirs: [] }

export function apply(ctx) {
  const skillDirs = [join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'data-analysis', '.claude', 'skills')]
  skillDirsRef.dirs = skillDirs
  ctx.effect(() => ctx.tools.register(dataModuleTool), `${name}: tool modules`)
  ctx.effect(() => ctx.skills.registerProvider(() => createSkillProvider(skillDirs)), `${name}: skills`)
  ctx.effect(() => registerApi(ctx, { skillDirs }), `${name}: routes`)
}
