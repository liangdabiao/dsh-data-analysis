// 技能快照提供方：skills/<模块名>/SKILL.md → SkillProvider 候选 + 注入正文。
// 同一份内容也供 data_module 工具使用（buildContent），保证两个入口完全一致。
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'

const RANK = 600
const NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/
const INVOCATION = { modelInvocable: true, userInvocable: true }
const FRONTMATTER = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/

// 只读快照：按目录内 SKILL.md 的 mtime:size 做签名，变了才重读。
// 避免 provider.list / 工具 list / 面板 /api 每次都全量读 19 份正文。
const cache = new Map()

function unquote(value) {
  return value?.trim().replace(/^(["'])(.*)\1$/, '$2') ?? ''
}

function parse(text) {
  const m = text.match(FRONTMATTER)
  if (!m) return null
  const block = m[1]
  const name = unquote(block.match(/^name:\s*(.+)$/m)?.[1])
  let description = unquote(block.match(/^description:\s*(.+)$/m)?.[1]) || ''
  // 兼容 YAML 折叠块（description: > / |）
  if (!description) {
    const lines = block.split(/\r?\n/)
    const start = lines.findIndex((l) => /^description:\s*[>|]/.test(l))
    if (start !== -1) {
      const collected = []
      for (let i = start + 1; i < lines.length; i++) {
        if (/^\S/.test(lines[i])) break
        collected.push(lines[i].replace(/^\s+/, ''))
      }
      description = collected.join(' ').trim()
    }
  }
  return { name, description, body: text.slice(m[0].length) }
}

/** 扫描一个技能根目录，返回含正文的条目；目录不存在或不可读时返回空数组。 */
export function readDir(dir) {
  const root = resolve(dir)
  if (!existsSync(root)) return []
  let entries
  try {
    entries = readdirSync(root, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => ({ dir: join(root, e.name), dirName: e.name, file: join(root, e.name, 'SKILL.md') }))
      .filter((e) => existsSync(e.file))
  } catch { return [] }

  const sig = entries.map((e) => {
    const s = statSync(e.file)
    return `${e.dirName}:${s.mtimeMs}:${s.size}`
  }).join('|')
  const hit = cache.get(root)
  if (hit?.sig === sig) return hit.items

  const seen = new Set()
  const items = []
  for (const e of entries) {
    const p = parse(readFileSync(e.file, 'utf8'))
    // name 必须 kebab-case 且与目录名一致；description 要能当触发条件用；不收重名。
    if (!p || !NAME_RE.test(p.name) || p.name !== e.dirName || p.description.length < 20 || seen.has(p.name)) continue
    seen.add(p.name)
    items.push({ ...e, ...p })
  }
  cache.set(root, { sig, items })
  return items
}

// 上游正文写死了 Claude Code 工作目录里的相对路径，插件里没有这些目录。
// 不改快照文件，只在注入模型时改写。
const REWRITES = [
  [/(?:\.\/)?stage5_generated_code\//g, '<WORKSPACE>/generated_code/'],
  [/(?:\.\/)?generated_code\//g, '<WORKSPACE>/generated_code/'],
  [/(?:\.\/)?data_storage\//g, '<WORKSPACE>/data/'],
  [/(?:\.\/)?visualizations\//g, '<WORKSPACE>/visualizations/'],
  [/(?:\.\/)?analysis_reports\//g, '<WORKSPACE>/reports/'],
]

export function rewrite(body) {
  return REWRITES.reduce((text, [from, to]) => text.replace(from, to), body)
}

export function addendum(skill) {
  return ['', '---', '', '## 在 DSH 插件里使用', '',
    `- 本方法论模块名 \`${skill.name}\`，由 \`data_module\` 工具或技能自动加载提供。`,
    '- `<WORKSPACE>` 指用户当前工作区。用户数据以实际给出的路径为准，不要假设上游的 `data_storage/` 等目录存在；产出文件一律写到工作区。',
    `- 配套示例、模板与脚本在本模块的资源根目录（宿主用 \`resourceBase\` 给出，随安装位置变化）：\`${skill.dirName}/\`。`,
    '- 正文中的 `pip install` 与 Python 脚本仅供参考：优先让宿主模型直接完成分析；确需执行时先确认环境与依赖，不要默认安装。',
    '- 数据缺口如实标注 N/A，不编造数字。', ''].join('\n')
}

/** 两个入口共用的正文：改写路径 + 插件环境说明。 */
export function buildContent(skill) {
  return rewrite(skill.body) + addendum(skill)
}

export function createSkillProvider(dirs) {
  const list = [].concat(dirs)
  const all = () => list.flatMap(readDir)
  const candidate = (s) => ({
    name: s.name,
    description: s.description,
    path: s.dirName,                       // 相对标识，不把宿主机绝对路径塞进上下文
    invocation: INVOCATION,
    source: 'bundled',
    provider: 'data-analysis',
    rank: RANK,
    locator: s.dir,
    resourceBase: { kind: 'directory', path: s.dir },
  })
  return {
    name: 'data-analysis',
    // 常驻层：只给候选元信息，不把正文带进上下文。
    async list() { return all().map(candidate) },
    async get(c) {
      const s = all().find((x) => x.dir === c.locator && x.name === c.name)
      if (!s) return undefined
      const { rank, locator, ...summary } = candidate(s)
      return { ...summary, content: buildContent(s) }
    },
  }
}
