// 智能数据分析 · Host 半边（技能 + data_module 原生工具 + 面板数据面）。
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createSkillProvider, buildContent } from '../lib/skills.js'
import { registerApi } from '../lib/api.js'
import { listModules, getModule, searchModules } from '../lib/modules.js'

export const name = 'data-analysis'
export const inject = ['tools', 'skills', 'webServer', 'connection']

/** 技能快照目录：skills/<模块名>/SKILL.md。 */
export function skillDirsFrom(metaUrl = import.meta.url) {
  return [join(dirname(fileURLToPath(metaUrl)), '..', 'skills')]
}

const str = (description, extra = {}) => ({ type: 'string', description, ...extra })
const integer = (description, extra = {}) => ({ type: 'integer', description, ...extra })
const text = (value) => [{ type: 'text', text: value }]
const result = (ok, summary, data = '') => ({ ok, summary, data })

// 原生注册路线 dsh 不代验参数，这里按 JSON Schema 手写完整校验：
// required / 类型 / enum / 数值范围 / 字符串长度 / 未知字段。
export function check(args, spec) {
  const problems = []
  const input = args && typeof args === 'object' ? args : {}
  for (const key of spec.required || []) {
    if (input[key] === undefined) problems.push(`缺少必填参数 ${key}`)
  }
  for (const [key, rule] of Object.entries(spec.properties || {})) {
    const value = input[key]
    if (value === undefined) continue
    const okType = rule.type === 'string' ? typeof value === 'string'
      : rule.type === 'integer' ? Number.isInteger(value)
        : rule.type === 'number' ? typeof value === 'number' && Number.isFinite(value)
          : rule.type === 'boolean' ? typeof value === 'boolean'
            : true
    if (!okType) { problems.push(`${key} 应为 ${rule.type}`); continue }
    if (rule.enum && !rule.enum.includes(value)) problems.push(`${key} 只能是 ${rule.enum.join(' / ')} 之一`)
    if (rule.minimum !== undefined && value < rule.minimum) problems.push(`${key} 不能小于 ${rule.minimum}`)
    if (rule.maximum !== undefined && value > rule.maximum) problems.push(`${key} 不能大于 ${rule.maximum}`)
    if (rule.maxLength !== undefined && value.length > rule.maxLength) problems.push(`${key} 最长 ${rule.maxLength} 字符`)
  }
  for (const key of Object.keys(input)) {
    if (!spec.properties || !(key in spec.properties)) problems.push(`未知参数 ${key}`)
  }
  if (problems.length) throw new Error(`data_module 参数有误：${problems.join('；')}。`)
}

const PARAMETERS = {
  type: 'object',
  additionalProperties: false,
  required: ['action'],
  properties: {
    action: str('list 列全部模块；search 关键词搜索；get 取模块完整方法论', { enum: ['list', 'search', 'get'] }),
    id: str('get：模块名（list/search 里能看到）', { maxLength: 200 }),
    keyword: str('search：关键词，如「留存」「漏斗」「RFM」「funnel」「归因」', { maxLength: 100 }),
    limit: integer('search：最多返回条数，默认 8', { minimum: 1, maximum: 19 }),
  },
}

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

const CONDITIONAL = { get: ['id'], search: ['keyword'] }

/**
 * 工具由 apply 显式注入技能目录，不依赖模块级可变单例——
 * 未初始化时不会静默返回「0 个模块」的成功回执。
 */
export function createDataModuleTool(skillDirs) {
  const dirs = [].concat(skillDirs)
  return {
    name: 'data_module',
    description:
      '查询数据分析方法模块（A/B 测试、归因建模、漏斗分析、RFM、留存、LTV、增长模型、回归、推荐系统、可视化探索、报告写作等）。' +
      'search 用中文/英文关键词找对应方法模块；get 拿到完整方法论正文后再动手分析。做数据分析前先用它匹配方法。',
    parameters: PARAMETERS,
    output: OUTPUT,
    async execute(args) {
      check(args, PARAMETERS)
      for (const key of CONDITIONAL[args.action] || []) {
        if (args[key] === undefined || args[key] === '') {
          throw new Error(`data_module 参数有误：action=${args.action} 时 ${key} 必填。`)
        }
      }

      if (args.action === 'list') {
        const mods = listModules(dirs)
        if (!mods.length) return result(false, '技能目录为空或不可读，请检查插件安装是否完整（skills/ 下应有 SKILL.md）。')
        return result(true, `共 ${mods.length} 个分析模块：`,
          mods.map((m) => `- ${m.name}：${m.description}`).join('\n'))
      }

      if (args.action === 'search') {
        const found = searchModules(dirs, args.keyword, args.limit ?? 8)
        if (!found.length) return result(false, `没有匹配「${args.keyword}」的模块，试试 list 看全部。`)
        return result(true, `匹配到 ${found.length} 个模块：`,
          found.map((m) => `- ${m.name}：${m.description}\n  命中：…${m.snippet}…`).join('\n'))
      }

      const mod = getModule(dirs, args.id)
      if (!mod) return result(false, `没有找到模块 ${args.id}（先 search/list 找名字）。`)
      // 与技能 get / 面板 /api/module 共用同一份正文。
      return result(true, `模块「${mod.name}」完整方法论（照此执行分析）：`, buildContent(mod))
    },
  }
}

export function apply(ctx, { skillDirs = skillDirsFrom() } = {}) {
  ctx.effect(() => ctx.tools.register(createDataModuleTool(skillDirs)), `${name}: tool modules`)
  ctx.effect(() => ctx.skills.registerProvider(() => createSkillProvider(skillDirs)), `${name}: skills`)
  ctx.effect(() => registerApi(ctx, { skillDirs }), `${name}: routes`)
}
