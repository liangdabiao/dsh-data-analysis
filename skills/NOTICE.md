# 技能快照说明

本目录下的 19 个分析模块是 `dsh-data-analysis` 插件自带的技能快照，内容源自
`liangdabiao/claude-data-analysis-ultra-main`，**由本插件作者本人创作并拥有全部权利**，
随插件以 MIT 许可分发，可自由修改、再利用与再分发。

## 快照范围

- 来源仓库：`https://github.com/liangdabiao/claude-data-analysis-ultra-main`
- 内容：19 份 `SKILL.md` 方法论正文，以及各模块自带的 `examples/`、`guide/`、
  `templates/`、`scripts/`、`requirements.txt` 等参考资料。
- 已剔除：本机编辑器配置、测试截图与生成的图表、示例运行结果（HTML/CSV 报告）、
  上游项目的 CHANGELOG / PROJECT_SUMMARY 等非技能内容。
- 目录结构已扁平化为 `skills/<模块名>/SKILL.md`，不再保留上游 `.claude/skills/` 嵌套。

## 维护约定

1. **技能正文不写死宿主路径**：正文里上游的 `./data_storage/`、`./generated_code/`
   等相对路径，由 `lib/skills.js` 的 `rewrite()` 在注入模型时统一改写为 `<WORKSPACE>/…`，
   并在 `addendum()` 里说明 `<WORKSPACE>` 的含义。不要把这些路径写回正文。
2. **资源根目录**：每个模块的 `SKILL.md` 同级目录就是它的资源根，示例脚本、模板、
   样例数据都在这里；宿主通过 `resourceBase` 拿到该路径。
3. **新增模块**：新建一个目录，放一份带 `name` + `description` frontmatter 的
   `SKILL.md` 即可被自动扫描；`name` 必须是 kebab-case 且与目录名一致，无重名。
4. **一条内容两个入口**：模型既能通过技能自动加载，也能用 `data_module` 工具查询。
   两者共用 `buildContent()`，改动时不要只改一边。
5. 依赖声明保留在各模块的 `requirements.txt`，插件本身不自动安装 Python 依赖。
