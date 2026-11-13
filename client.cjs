// ============================================================================
// 智能数据分析 · 浏览器半边（模块浏览器 + 指南 两标签面板）。
// 源码用 .cjs：本包 "type": "module"，CJS 出口必须显式 .cjs 才不会被 esbuild
// 当成 ESM 解析（原来 client.js 会报 commonjs-variable-in-esm 警告）。
// ============================================================================
const h = require('react').createElement
const { useState, useEffect } = require('react')

const PANEL_ID = 'data-analysis'
const BASE = 'data-analysis' // 官方约定：host 侧前缀带 /，client 侧常量不带

function PanelIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 5, fill: '#0891b2' }),
    h('rect', { x: 6, y: 12, width: 2.5, height: 6, fill: '#fff' }),
    h('rect', { x: 10.5, y: 8, width: 2.5, height: 10, fill: '#ffd24a' }),
    h('rect', { x: 15, y: 5, width: 2.5, height: 13, fill: '#fff' }))
}

// 跟随宿主明暗主题：宿主在 <body> 上打 data-ds-dark-theme，用 MutationObserver
// 监听切换；单独打开时退回系统偏好。
function readDark() {
  if (typeof document === 'undefined') return false
  const body = document.body
  if (body && body.hasAttribute('data-ds-dark-theme')) return true
  if (body && body.hasAttribute('data-ds-light-theme')) return false
  return !!window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
}

function useHostTheme() {
  const [dark, setDark] = useState(readDark)
  useEffect(() => {
    if (typeof document === 'undefined' || !document.body) return
    const sync = () => setDark(readDark())
    sync()
    const observer = new MutationObserver(sync)
    observer.observe(document.body, { attributes: true, attributeFilter: ['data-ds-dark-theme', 'data-ds-light-theme'] })
    const mq = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)')
    if (mq && mq.addEventListener) mq.addEventListener('change', sync)
    return () => {
      observer.disconnect()
      if (mq && mq.removeEventListener) mq.removeEventListener('change', sync)
    }
  }, [])
  return dark
}

function makeStyles(dark) {
  const p = dark ? {
    text: '#e6edf3', card: '#1b2127', border: '#333c45', muted: '#9aa7b2',
    subtle: '#7d8b98', accent: '#5eead4', accentBg: '#123039', input: '#141a1f',
    pre: '#141a1f', chip: '#1b2127', error: '#ff7b72',
  } : {
    text: '#1a1a1a', card: '#ffffff', border: '#e3e3e6', muted: '#6b7280',
    subtle: '#8a8a92', accent: '#0e7490', accentBg: '#ecfeff', input: '#ffffff',
    pre: '#f7f7f8', chip: '#ffffff', error: '#c0392b',
  }
  return {
    wrap: { padding: 16, overflow: 'auto', height: '100%', boxSizing: 'border-box', fontFamily: '-apple-system, "Segoe UI", "Microsoft YaHei", sans-serif', fontSize: 13, color: p.text },
    tabBar: { display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' },
    tab: { padding: '8px 16px', border: `1px solid ${p.border}`, borderRadius: 8, background: p.card, color: p.muted, cursor: 'pointer', fontSize: 13 },
    tabActive: { padding: '8px 16px', border: `1px solid ${p.accent}`, borderRadius: 8, background: p.accentBg, color: p.accent, cursor: 'pointer', fontWeight: 600, fontSize: 13 },
    row: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 10 },
    chip: { padding: '4px 12px', border: `1px solid ${p.border}`, borderRadius: 999, background: p.chip, color: p.text, cursor: 'pointer', fontSize: 12 },
    card: { background: p.card, border: `1px solid ${p.border}`, borderRadius: 10, padding: 12, marginBottom: 10 },
    sectionTitle: { fontWeight: 700, marginBottom: 6, color: p.text },
    stepList: { lineHeight: 1.9, color: p.text },
    quote: { background: p.accentBg, borderRadius: 6, padding: '4px 10px', margin: '4px 0', color: p.accent },
    muted: { color: p.muted, lineHeight: 1.8 },
    mutedSmall: { color: p.subtle, fontSize: 12, lineHeight: 1.6 },
    error: { color: p.error, padding: 12 },
    search: { width: '100%', boxSizing: 'border-box', padding: '8px 12px', border: `1px solid ${p.border}`, borderRadius: 8, background: p.input, color: p.text, fontSize: 13, marginBottom: 10 },
    grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 8 },
    modName: { fontWeight: 600, color: p.accent, marginBottom: 4 },
    body: { background: p.pre, color: p.text, borderRadius: 8, padding: 12, fontSize: 12, overflow: 'auto', maxHeight: '65vh', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.7 },
    tag: { display: 'inline-block', padding: '2px 8px', margin: '2px 4px 2px 0', borderRadius: 6, background: p.accentBg, color: p.accent, fontSize: 12 },
  }
}

async function fetchJson(path) {
  const res = await fetch(BASE + path)
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.error || `请求失败（${res.status}）`)
  return data
}

function ModuleDetail({ id, onBack, s }) {
  const [mod, setMod] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    fetchJson(`/api/module?id=${encodeURIComponent(id)}`)
      .then((d) => { if (alive) setMod(d.module) })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [id])
  if (error) return h('div', { style: s.error }, error)
  if (!mod) return h('div', { style: s.muted }, '加载中…')
  return h('div', null,
    h('div', { style: s.row },
      h('button', { style: s.chip, onClick: onBack }, '← 返回列表'),
      h('div', { style: s.modName }, mod.name)),
    h('div', { style: { ...s.muted, marginBottom: 8 } }, mod.description || ''),
    h('pre', { style: s.body }, mod.body))
}

function ModulesTab({ modules, error, s }) {
  const [selected, setSelected] = useState(null)
  const [query, setQuery] = useState('')
  if (error) return h('div', { style: s.error }, error)
  if (selected) return h(ModuleDetail, { id: selected, onBack: () => setSelected(null), s })
  if (modules === null) return h('div', { style: s.muted }, '加载中…')

  const q = query.trim().toLowerCase()
  const filtered = q
    ? modules.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(q))
    : modules

  return h('div', null,
    h('input', {
      style: s.search, placeholder: `搜索 ${modules.length} 个模块，如「留存」「漏斗」「RFM」…`,
      value: query, onChange: (e) => setQuery(e.target.value),
    }),
    !filtered.length && h('div', { style: s.muted }, '没有匹配的模块。'),
    h('div', { style: s.grid },
      filtered.map((m) => h('div', {
        key: m.dirName, style: { ...s.card, marginBottom: 0, cursor: 'pointer' },
        onClick: () => setSelected(m.name), title: '点击查看完整方法论',
      },
        h('div', { style: s.modName }, m.name),
        h('div', { style: s.mutedSmall }, m.description || '')))))
}

function GuideTab({ modules, s }) {
  const list = modules || []
  return h('div', null,
    h('div', { style: s.card },
      h('div', { style: s.sectionTitle }, '怎么用'),
      h('div', { style: s.stepList },
        h('div', { style: s.quote }, '「帮我分析这份电商销售 CSV，找出复购特征」'),
        h('div', { style: s.quote }, '「做个 RFM 分层，输出营销建议」'),
        h('div', { style: s.quote }, '「这组 A/B 实验数据显著吗」'),
        '模型先调 data_module 匹配方法模块，拿到完整方法论后照此执行分析。')),
    h('div', { style: s.card },
      h('div', { style: s.sectionTitle }, '1 个工具'),
      h('div', { style: { ...s.muted, lineHeight: 2 } },
        h('b', null, 'data_module'), ' — list 列出全部模块 / search 关键词匹配 / get 取完整方法论正文。')),
    h('div', { style: s.card },
      h('div', { style: s.sectionTitle }, `已内置 ${list.length} 个方法模块`),
      list.length
        ? h('div', null, list.map((m) => h('span', { key: m.dirName, style: s.tag, title: m.description }, m.name)))
        : h('div', { style: s.muted }, '模块列表加载中…')),
    h('div', { style: s.card },
      h('div', { style: s.sectionTitle }, '数据从哪来'),
      h('div', { style: s.muted },
        '把 CSV/Excel 放进工作区或在对话里粘贴数据；分析产出（图表/报告）写到工作区文件。数据缺口如实标注 N/A，不编造数字。')))
}

const TABS = [['modules', '模块库'], ['guide', '指南']]

function Panel() {
  const dark = useHostTheme()
  const s = makeStyles(dark)
  const [tab, setTab] = useState('modules')
  const [modules, setModules] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    fetchJson('/api/modules')
      .then((d) => { if (alive) setModules(d.modules || []) })
      .catch((e) => { if (alive) setError(e.message) })
    return () => { alive = false }
  }, [])

  return h('div', { style: s.wrap },
    h('div', { style: s.tabBar },
      TABS.map(([id, label]) => h('button', {
        key: id, style: tab === id ? s.tabActive : s.tab, onClick: () => setTab(id),
      }, label))),
    tab === 'modules'
      ? h(ModulesTab, { modules, error, s })
      : h(GuideTab, { modules, s }))
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
