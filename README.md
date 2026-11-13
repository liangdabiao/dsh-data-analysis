# dsh-data-analysis · 智能数据分析工作台

19 个分析方法模块（A/B 测试、归因建模、漏斗、RFM、LTV、留存、回归、增长模型、可视化、推荐系统、内容分析等）+ 6 阶段通用分析流程。纯技能，无需 API key，不联网取数。

- **技能**：19 份 `SKILL.md` 方法论，模型可自主加载，也可用 `/命令` 调用。
- **工具**：`data_module` — `list` 列模块 / `search` 关键词匹配 / `get` 取完整方法论。
- **面板**：侧栏「数据分析」，模块库可搜索、可点开看正文；指南页跟随宿主明暗主题。

技能、工具、面板三个入口读的是同一份正文（`lib/skills.js` 的 `buildContent()`），不会出现内容漂移。

## 安装与升级

```bash
dsh plugin --profile web add dsh-data-analysis
```

第三方插件升级 = 卸载重装：`dsh plugin --profile web remove dsh-data-analysis`，再执行上面的 add。装完记得在插件列表点「立即启用」。

## 使用

在对话里直接描述任务即可，模型会先用 `data_module` 匹配方法：

```
帮我分析这份电商销售 CSV，找出复购特征
做个 RFM 分层，输出营销建议
这组 A/B 实验数据显著吗
```

数据放工作区或直接粘贴到对话；图表、报告等产出写到工作区。数据缺口如实标注 N/A，不编造数字。

## 目录结构

```
src/host.js        Host 入口：注册工具 / 技能 Provider / HTTP 路由
lib/skills.js      快照扫描、frontmatter 解析、路径 rewrite、addendum、buildContent
lib/modules.js     模块列表 / 精确取 / 关键词搜索（工具与 API 共用）
lib/api.js         /data-analysis/api/* 只读接口
client.cjs         浏览器半边（CJS 源码，打包成 dist/client.js）
dist/client.js     随仓库提交的浏览器产物；git/源码直装不跑构建也能用
skills/            19 个方法模块，见 skills/NOTICE.md
locale/            插件市场中英文元信息
```

## 开发

需要 Node 22.19+ 或 24+。

```bash
npm install
npm test              # node --test，纯函数/契约测试，不需要装 dsh
npm run build         # 打包 client.cjs → dist/client.js + 产物三项自检
npm run watch         # 监听 client.cjs 改动并自动重打包
```

改动 `client.cjs` 后**必须重新 build 并提交 `dist/client.js`**：从 git / 源码目录安装时不会执行构建脚本。`prepack` 会在 npm 打包前再构建一次，保证 tgz 里的产物最新。

Host 半边是纯 ESM 源码，`main` 直接指向 `src/host.js`，不构建；运行时只从 `ctx` 拿宿主服务，无第三方运行时依赖。

## 数据与隐私

插件不写 `$DSH_HOME` 数据目录、不保存用户数据、不调用任何外部 API、不需要 API key。技能正文里的 Python 示例与各模块 `requirements.txt` 只是参考资料，插件不会自动安装依赖或执行脚本；是否执行由用户与模型在对话中决定。用户数据只在当前对话里使用，卸载插件不会留下任何数据文件。

## 技能快照

`skills/` 下 19 个模块源自 [claude-data-analysis-ultra](https://github.com/liangdabiao/claude-data-analysis-ultra-main)，由本插件作者本人创作并拥有，随插件以 MIT 分发。快照范围、清理规则与维护约定见 [skills/NOTICE.md](skills/NOTICE.md)。

## 兼容版本

| 项 | 范围 |
| --- | --- |
| Node | `^22.19.0 \|\| >=24.0.0` |
| dsh | `>=0.2.1-rc.2 <0.3.0` |

## 许可

MIT，见 [LICENSE](LICENSE)。
