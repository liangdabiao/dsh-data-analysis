// 浏览器半边打包：client.cjs → dist/client.js（单文件 CJS + ModuleLoader 包装）。
// dist/client.js 随仓库提交：git / 源码直装不会跑构建，产物必须在包里。
import { build, context } from 'esbuild'
import { readFileSync, readdirSync, rmSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
const PLUGIN_ID = pkg.name

const banner =
  `window.__ModuleLoader__.load({ id: ${JSON.stringify(PLUGIN_ID)}, factory: (require) => {` +
  ` const module = { exports: {} }; const exports = module.exports;`
const footer = ' return module.exports; } });'

const CLIENT_EXTERNALS = ['react', 'react/jsx-runtime', 'react-dom', 'react-dom/client']

function checkBundle() {
  const code = readFileSync(join(root, 'dist/client.js'), 'utf8')
  const requires = [...code.matchAll(/\brequire\(\s*["']([^"']+)["']\s*\)/g)].map((m) => m[1])
  const bad = requires.filter((spec) => !CLIENT_EXTERNALS.includes(spec))
  if (bad.length) throw new Error(`client 产物引用了白名单外的模块：${bad.join(', ')}`)
  if (/\bimport\s*\(/.test(code)) throw new Error('client 产物包含动态 import()，禁止')
  const files = readdirSync(join(root, 'dist'))
  if (files.length !== 1 || files[0] !== 'client.js') {
    throw new Error(`dist/ 应只含 client.js，实际：${files.join(', ')}`)
  }
}

const WATCH = process.argv.includes('--watch')

rmSync(join(root, 'dist'), { recursive: true, force: true })

const options = {
  entryPoints: [join(root, 'client.cjs')],
  outfile: join(root, 'dist/client.js'),
  bundle: true,
  format: 'cjs',
  platform: 'browser',
  target: 'chrome120',
  external: CLIENT_EXTERNALS,
  banner: { js: banner },
  footer: { js: footer },
  minify: !WATCH,
  sourcemap: WATCH ? 'inline' : false,
  logLevel: 'info',
  treeShaking: false, // 防止 esbuild tree-shake 掉只在闭包内引用的组件函数
}

if (WATCH) {
  const c = await context(options)
  await c.watch()
  console.log(`[build] 监听 client.cjs → dist/client.js (id=${PLUGIN_ID})，Ctrl+C 退出`)
} else {
  await build(options)
  checkBundle()
  const size = (Buffer.byteLength(readFileSync(join(root, 'dist/client.js'))) / 1024).toFixed(1)
  console.log(`[build] dist/client.js ${size} KB  (id=${PLUGIN_ID})`)
}
