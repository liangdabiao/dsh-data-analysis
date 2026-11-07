// 智能数据分析面板。
const h = require('react').createElement
const { useState, useEffect } = require('react')
const PANEL_ID = 'data-analysis'
const BASE = 'data-analysis'

function PanelIcon(props) {
  return h('svg', { width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', ...props },
    h('rect', { x: 2.5, y: 2.5, width: 19, height: 19, rx: 5, fill: '#0891b2' }),
    h('rect', { x: 6, y: 12, width: 2.5, height: 6, fill: '#fff' }),
    h('rect', { x: 10.5, y: 8, width: 2.5, height: 10, fill: '#ffd24a' }),
    h('rect', { x: 15, y: 5, width: 2.5, height: 13, fill: '#fff' }))
}

function Panel() {
  const [skills, setSkills] = useState(null)
  useEffect(() => {
    fetch(BASE + '/api/skills').then(r => r.json()).then(d => setSkills(d.skills)).catch(() => {})
  }, [])
  return h('div', { style: { padding: 16, overflow: 'auto', height: '100%', fontFamily: 'sans-serif', fontSize: 13 } },
    h('div', { style: { fontWeight: 700, marginBottom: 8, color: '#0891b2' } }, '智能数据分析技能集（19 个模块）'),
    h('div', { style: { color: '#666', marginBottom: 12 } }, '6 阶段通用分析 + 19 个专业模块。纯技能零 API key。'),
    skills?.map(s => h('div', { key: s.name, style: { background: '#fff', border: '1px solid #e3e3e6', borderRadius: 8, padding: 10, marginBottom: 6 } },
      h('div', { style: { fontWeight: 600, color: '#0891b2' } }, '/' + s.name),
      h('div', { style: { color: '#666', marginTop: 4 } }, s.description.slice(0, 150)))),
    !skills ? h('div', { color: '#999' }, '加载中…') : null)
}

function apply(ctx) {
  ctx.slots.inject('sidebar.panellist', () =>
    ctx.slots.register({ name: 'sidebar.panellist', id: PANEL_ID, order: 24, label: () => '数据分析' }, PanelIcon))
  ctx.slots.inject('main', () =>
    ctx.slots.register({ name: 'main', key: PANEL_ID }, Panel))
}
exports.isPlugin = true
exports.inject = ['slots']
exports.apply = apply
