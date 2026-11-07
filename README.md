# 插件市场 · Plugin Market for DeepSeek Harness

给 [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（DSH）侧边栏加一个「插件市场」页面：**直接读取 GitHub 主题 [`dsh-plugin`](https://github.com/topics/dsh-plugin) 的仓库列表，并给每个项目配一条中文导读。**

数据不落库、不搬静态快照：每次打开都按主题现查 GitHub；中文导读分三类并在卡片上标注来源，方便判断可信度。

- `中文导读 · 编辑整理`：本插件手写的知名项目介绍（约 30 个，集中在生态头部项目）
- `中文导读 · 仓库原文`：仓库自带的简介本来就是中文，直接采用
- `中文导读 · 自动整理`：其余项目按作者、语言、星标、最近更新、能力关键词生成，并明确提示"仓库暂无中文简介"

> 中文导读只是帮你快速筛选；判断一个插件能不能用，永远以仓库 README 为准。

## 功能

- 主题直连：默认 `topic:dsh-plugin` + 星标倒序
- 卡片信息：仓库全名、作者、语言、星标、最近更新、话题标签、仓库直链
- 搜索：走 GitHub 搜索接口，支持 `language:TypeScript`、`in:readme` 等搜索语法
- 排序切换：最热 / 最新更新
- 刷新与分页：5 分钟缓存，翻页追加，到底提示
- 复制仓库链接、在新标签打开仓库或 GitHub 主题页
- 骨架屏、空结果、限流与网络错误都有中文说明和重试
- 视觉完全跟随宿主主题（浅色 / 深色），只用 `--dsw-alias-*` 主题变量

## 安装

在 DSH 的「插件」页点添加，填入下列任一安装规格：

| 来源 | 规格写法 |
| --- | --- |
| GitHub 仓库 | `github:<owner>/<repo>` 或 `https://github.com/<owner>/<repo>` |
| 本地目录（开发） | `link:F:\path\to\dsh-plugin-market` |
| 本地打包 | `file:F:\path\to\dsh-plugin-market-1.0.0.tgz` |
| npm（发布后） | `@yourscope/dsh-plugin-market` |

安装后侧边栏会出现「插件市场」图标（位于「插件」与「定时任务」之间）；如果图标没出现，刷新一次页面。

## 使用

1. 点侧边栏的摊位图标打开页面；
2. 顶部搜索框输入关键词，回车走 GitHub 搜索；
3. 卡片上的中文导读先看方向，再点「查看仓库 ↗」读 README；
4. 「复制链接」便于把候选插件丢给同事或贴回对话里。

## 中文导读从哪里来

Host 侧（`index.js`）为每个仓库算一条导读：

1. 命中 `CURATED` 表（`owner/repo` → 手写中文），标记 `editor`；
2. 仓库简介本身是中文（汉字数 ≥ 6），原样采用，标记 `repo`；
3. 其余用可核实字段拼装，标记 `auto`。

想让某个项目有更准的导读，往 `CURATED` 里加一行即可，例如：

```js
'owner/repo': '一句话说明这个插件解决什么问题、装完之后多出什么能力。',
```

注意 `CURATED` 的 key 是小写 `owner/repo`。

## 数据来源、限流与隐私

- 只访问 GitHub 公开搜索接口：`https://api.github.com/search/repositories`，不带任何 token；
- 未登录状态搜索接口约 10 次/分钟、结果最多前 1000 条，因此 Host 侧做了 5 分钟内存缓存并在页面给出提示；频繁刷新会被 GitHub 限流，页面会说明原因而不是报错码；
- 若本机经过 TLS 检查代理且系统根证书未被 Node 信任，Host 会先按正常校验请求，**仅在证书类错误时**降级重试；其他网络错误照实显示；
- 插件本身不收集、不上报任何数据，也不写用户目录。

## 自定义

| 想改什么 | 改哪里 |
| --- | --- |
| 中文导读 | `index.js` 的 `CURATED` |
| 自动导读里的能力标签 | `index.js` 的 `KEYWORDS` |
| 每页条数、最大页数、缓存时长 | `index.js` 顶部 `PAGE_SIZE` / `MAX_PAGE` / `CACHE_TTL_MS` |
| 侧边栏位置、图标 | `client.js` 的 `PANEL_ORDER`、`MarketIcon` |
| 界面文案与语言 | `client.js` 的 `DICTS`（zh-CN / en） |
| 插件页显示的标题与描述 | `locale/zh.json`、`locale/en.json` |

## 分享与发布

1. **先改成你自己的包名**（DSH 要求包名、补丁行名、Client 模块 id 三处一致）：

   ```bash
   node scripts/set-name.mjs @yourscope/dsh-plugin-market
   ```

   脚本会同步改 `package.json`、`cordis.patch.yml`、`client.js`（以及 README 里的示例），并顺带做语法检查。

2. **推到 GitHub**，同时给仓库加上 `dsh-plugin` 话题——这样它自己也会出现在这个市场里：

   ```bash
   git remote add origin https://github.com/<owner>/<repo>.git
   git push -u origin main
   ```

3. **发布到 npm**（可选）：

   ```bash
   npm publish --access public
   ```

   仓库里带了 `.github/workflows/publish.yml`：打 tag（如 `v1.0.0`）即自动 `npm publish`，需要在仓库 Secrets 里配置 `NPM_TOKEN`。

4. 别人安装：插件页填 `github:<owner>/<repo>` 或（已发布时）包名。

## 兼容性

- 依赖宿主提供的 `webServer` 服务、`sidebar.panellist` 与 `main` 槽位、Client `locale` 服务；
- 已在当前 DSH Desktop 版本（desktop profile）上安装验证：路由返回真实数据、侧边栏行与主面板槽位均 active；
- 宿主若不含 `webServer`，Host 半不会激活，页面会显示读取失败——这是降级，不是崩溃。

## 目录结构

```
.
├── package.json          # 包清单：dsh.bundle 补丁 + dsh.client 声明
├── cordis.patch.yml      # 插入 plugin-market 行
├── index.js              # Host 半：GitHub 查询、中文导读、/api/dsh-plugin-market/items
├── client.js             # Client 半：侧边栏图标 + 主面板页面（React，无构建）
├── locale/               # 插件页展示用的标题与描述（zh / zh-CN / en）
├── icon.svg              # 包图标（原创）
└── scripts/set-name.mjs  # 改名脚本
```

## 许可

[MIT](LICENSE)。图标为本项目原创，可随包分发。

---

English: [README.en.md](README.en.md)
