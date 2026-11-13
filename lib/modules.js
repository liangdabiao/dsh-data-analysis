// 模块查询：工具（data_module）与面板 API 共用的唯一数据层。
// 读盘统一走 skills.readDir（带签名缓存），避免多处各自重复实现。
import { readDir } from './skills.js'

/** 全量模块（含正文），内部使用。 */
export function loadModules(skillDirs) {
  return skillDirs.flatMap((d) => readDir(d))
}

/** 轻量列表：面板 / 工具 list 用，不返回正文。 */
export function listModules(skillDirs) {
  return loadModules(skillDirs).map(({ name, dirName, description }) => ({ name, dirName, description }))
}

/** 按 name / dirName 精确取，返回含正文的条目。 */
export function getModule(skillDirs, id) {
  if (typeof id !== 'string') return null
  return loadModules(skillDirs).find((m) => m.name === id || m.dirName === id) || null
}

/** 跨 name / description / 正文 的关键词搜索（不区分大小写，带命中摘要）。 */
export function searchModules(skillDirs, keyword, limit = 8) {
  const needle = String(keyword ?? '').trim().toLowerCase()
  if (!needle) return []
  const hits = []
  for (const m of loadModules(skillDirs)) {
    const haystack = `${m.name} ${m.description} ${m.body}`
    const at = haystack.toLowerCase().indexOf(needle)
    if (at === -1) continue
    hits.push({
      name: m.name,
      dirName: m.dirName,
      description: m.description,
      snippet: haystack.slice(Math.max(0, at - 40), at + 80).replace(/\s+/g, ' '),
    })
    if (hits.length >= limit) break
  }
  return hits
}
