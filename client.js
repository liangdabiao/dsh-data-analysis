// ============================================================================
// 智能数据分析 · 浏览器半边（模块浏览器 + 指南 两标签面板）。
// ============================================================================
const h = require('react').createElement
const { useState, useEffect } = require('react')

const PANEL_ID = 'data-analysis'
const BASE = 'data-analysis'

function PanelIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 5, fill: '#0b6e4f' }),
    h('path', { d: 'M7 15l3-4 3 2 4-6', stroke: '#7ee2b8', 'stroke-width': 1.8, 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
    h('rect', { x: 5.5, y: 16.5, width: 13, height: 2, rx: 1, fill: '#7ee2b8' }))
}

async function fetchJson(path) {
  const res = await fetch(BASE + path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

function ModuleDetail({ id, onBack }) {
  const [mod, setMod] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    fetchJson(`/api/module?id=${encodeURIComponent(id)}`).then((d) => setMod(d.module)).catch((e) => setError(e.message))
  }, [id])
  if (error) return h('div', { style: styles.error }, error)
  if (!mod) return h('div', { style: styles.muted }, '加载中…')
  return h('div', null,
    h('div', { style: styles.row },
      h('button', { style: styles.chip, onClick: onBack }, '← 返回列表'),
      h('div', { style: styles.modName }, mod.name)),
    h('div', { style: styles.muted, marginBottom: 8 }, mod.description || ''),
    h('pre', { style: styles.body }, mod.body))
}

function ModulesTab() {
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  useEffect(() => {
    fetchJson('/api/modules').then((d) => setModules(d.modules)).catch((e) => setError(e.message))
  }, [])
  if (error) return h('div', { style: styles.error }, error)
  if (selected) return h(ModuleDetail, { id: selected, onBack: () => setSelected(null) })
  if (modules === null) return h('div', { style: styles.muted }, '加载中…')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? modules.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q))
    : modules

  return h('div', null,
    h('input', {
      style: styles.search, placeholder: '搜索 19 个模块，如「留存」「漏斗」「RFM」…',
      value: query, onChange: (e) => setQuery(e.target.value),
    }),
    h('div', { style: styles.grid },
      filtered.map((m) => h('div', {
        key: m.dirName, style: styles.card, onClick: () => setSelected(m.name),
        title: '点击查看完整方法论',
      },
        h('div', { style: styles.modName }, m.name),
        h('div', { style: styles.mutedSmall }, m.description || '')))))
}

function GuideTab() {
  return h('div', null,
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '怎么用'),
      h('div', { style: styles.stepList },
        h('div', { style: styles.quote }, '「帮我分析这份电商销售 CSV，找出复购特征」'),
        h('div', { style: styles.quote }, '「做个 RFM 分层，输出营销建议」'),
        h('div', { style: styles.quote }, '「这组 A/B 实验数据显著吗」'),
        '模型先调 data_module 匹配方法模块（漏斗/RFM/归因/留存…），拿到完整方法论后照此执行分析。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '1 个工具'),
      h('div', { style: styles.muted, lineHeight: 2 },
        h('b', null, 'data_module'), ' — list 列 19 个模块 / search 关键词匹配 / get 取完整方法论正文。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '19 个模块覆盖'),
      h('div', { style: styles.muted, lineHeight: 1.9 },
        'A/B 测试、归因建模、漏斗分析、RFM 分层、留存分析、LTV 预测、增长模型、回归建模、推荐系统、可视化探索、数据探索、内容分析、互联网数据分析、报告写作、质量保障、增长假设、代码生成、AB 实验分析、推荐归因等。')),
    h('div', { style: styles.card },
      h('div', { style: styles.sectionTitle }, '数据从哪来'),
      h('div', { style: styles.muted },
        '把 CSV/Excel 放进工作区或在对话里粘贴数据；分析产出（图表/报告）写到工作区文件。数据缺口如实标注 N/A，不编造数字。')))
}

const TABS = [['modules', '模块库'], ['guide', '指南']]

function Panel() {
  const [tab, setTab] = useState('modules')
  return h('div', { style: styles.wrap },
    h('div', { style: styles.tabBar },
      TABS.map(([id, label]) => h('button', {
        key: id, style: tab === id ? styles.tabActive : styles.tab, onClick: () => setTab(id),
      }, label))),
    tab === 'modules' ? h(ModulesTab) : h(GuideTab))
}

const styles = {
  wrap: { padding: 16, overflow: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif', fontSize: 13, color: '#1a1a1a' },
  tabBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
  tab: { padding: '8px 16px', border: '1px solid #d9d9de', borderRadius: 8, background: '#fff', color: '#1a1a1a', cursor: 'pointer', fontSize: 13 },
  tabActive: { padding: '8px 16px', border: '1px solid #0b6e4f', borderRadius: 8, background: '#e8f5ef', color: '#0b6e4f', cursor: 'pointer', fontWeight: 600, fontSize: 13 },
  row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
  chip: { padding: '4px 12px', border: '1px solid #d9d9de', borderRadius: 999, background: '#fff', cursor: 'pointer', fontSize: 12 },
  card: { background: '#fff', border: '1px solid #e3e3e6', borderRadius: 10, padding: 12, marginBottom: 10 },
  sectionTitle: { fontWeight: 700, marginBottom: 6 },
  stepList: { lineHeight: 1.9 },
  quote: { background: '#e8f5ef', borderRadius: 6, padding: '4px 10px', margin: '4px 0', color: '#0b6e4f' },
  muted: { color: '#8a8a92', lineHeight: 1.8 },
  mutedSmall: { color: '#a0a0a8', fontSize: 12, lineHeight: 1.6 },
  error: { color: '#c0392b', padding: 12 },
  search: { width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: '1px solid #d9d9de', borderRadius: 8, fontSize: 13, marginBottom: 10 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 },
  modName: { fontWeight: 600, color: '#0b6e4f', marginBottom: 4 },
  body: { background: '#f7f7f8', borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: '65vh', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 },
}

function apply(ctx) {
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 15, label: () => '数据分析' }, PanelIcon))
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel))
}

exports.isPlugin = true
exports.inject = ['slots']
exports.apply = apply
