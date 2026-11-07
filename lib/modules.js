// 智能数据分析 · 模块查询（19 个专业分析模块），工具与面板 API 共用。
import { readDir } from './skills.js'

// 全量模块（含正文）。
export function loadModules(skillDirs) {
  return skillDirs.flatMap((d) => readDir(d))
}

// 轻量列表（面板/工具 list 用）。
export function listModules(skillDirs) {
  return loadModules(skillDirs).map((m) => ({
    name: m.name,
    dirName: m.dirName,
    description: m.description,
  }))
}

// 按 name/dirName 精确取。
export function getModule(skillDirs, id) {
  return loadModules(skillDirs).find((m) => m.name === id || m.dirName === id) || null
}

// 跨 name/description/正文 关键词搜索（不区分大小写，返回带命中摘要的列表）。
export function searchModules(skillDirs, keyword) {
  const needle = String(keyword).toLowerCase()
  return loadModules(skillDirs)
    .filter((m) => `${m.name} ${m.description} ${m.body}`.toLowerCase().includes(needle))
    .map((m) => {
      const at = `${m.name} ${m.description} ${m.body}`.toLowerCase().indexOf(needle)
      const snippet = `${m.name} ${m.description} ${m.body}`.slice(Math.max(0, at - 40), at + 80).replace(/\s+/g, ' ')
      return { name: m.name, dirName: m.dirName, description: m.description, snippet }
    })
}
