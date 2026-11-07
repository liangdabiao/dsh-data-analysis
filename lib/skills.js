// 智能数据分析 · 技能快照提供方（19 个专业模块）。
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const RANK = 600
const INVOCATION = { modelInvocable: true, userInvocable: true }

function parse(file) {
  const text = readFileSync(file, 'utf8')
  const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!m) return null
  const block = m[1]
  const name = block.match(/^name:\s*(.+)$/m)?.[1]?.trim()
  let description = block.match(/^description:\s*(.+)$/m)?.[1]?.trim().replace(/^(["'])(.*)\1$/, '$2') || null
  if (!description) {
    const lines = block.split(/\r?\n/)
    const start = lines.findIndex((l) => /^description:\s*[>|]/.test(l))
    if (start !== -1) {
      const collected = []
      for (let i = start + 1; i < lines.length; i++) { if (/^\S/.test(lines[i])) break; collected.push(lines[i].replace(/^\s+/, '')) }
      description = collected.join(' ').trim()
    }
  }
  return name && description ? { name, description, body: text.slice(m[0].length) } : null
}

function readDir(dir) {
  if (!existsSync(dir)) return []
  const out = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    if (!e.isDirectory()) continue
    const sDir = join(dir, e.name)
    const sf = join(sDir, 'SKILL.md')
    if (!existsSync(sf)) continue
    const p = parse(sf)
    if (p) out.push({ dir: sDir, file: sf, ...p, dirName: e.name })
  }
  return out
}

function addendum(skill) {
  return ['', '---', '', '## 在 DSH 插件里使用', '',
    `- 技能目录：\`${skill.dir}\`。`,
    '- 正文提到的 Python/代码：沙箱 pip install 后执行，或让宿主模型直接做分析。产出文件写到工作区。',
    '- 数据缺口如实标注 N/A，不编造数字。', ''].join('\n')
}

export function createSkillProvider(dirs) {
  const list = [].concat(dirs)
  const candidate = (s) => ({ name: s.name, description: s.description, path: s.file, invocation: INVOCATION, source: 'bundled', provider: 'data-analysis', rank: RANK, locator: s.dir, resourceBase: { kind: 'directory', path: s.dir } })
  return {
    name: 'data-analysis',
    async list() { return list.flatMap(readDir).map(candidate) },
    async get(c) {
      const s = list.flatMap(readDir).find((x) => x.dir === c.locator && x.name === c.name)
      if (!s) return undefined
      const content = s.body + addendum(s)
      const { rank, locator, ...summary } = candidate(s)
      return { ...summary, content }
    },
  }
}
export { readDir, addendum }
