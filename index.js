/**
 * Plugin market — Host half.
 *
 * Serves one read-only route, `/api/dsh-plugin-market/items`, that queries the
 * GitHub repository search API for the `dsh-plugin` topic
 * (https://github.com/topics/dsh-plugin) and returns a normalized page of
 * repositories together with a Chinese introduction for each one.
 *
 * The Chinese text comes from three sources, reported per item so the page can
 * label it honestly:
 *   - `editor`  — hand-written copy bundled in this file for well-known plugins;
 *   - `repo`    — the repository's own description when it is already Chinese;
 *   - `auto`    — a sentence assembled from verified metadata (owner, language,
 *                 stars, last push, matched capability keywords).
 *
 * The route is public read-only data and lives beside the other `/api/*`
 * families. Responses carry `cache-control: no-store`; the process keeps a
 * short in-memory cache so repeated page loads do not exhaust the unauthenticated
 * GitHub search quota.
 *
 * @module @local/dsh-plugin-market
 */

import { request as httpsRequest } from 'node:https'

/** Route served to the page. */
const API_PATH = '/api/dsh-plugin-market/items'
/** GitHub topic this market reads. */
const TOPIC = 'dsh-plugin'
/** Topic page the header links to. */
const TOPIC_URL = `https://github.com/topics/${TOPIC}`
/** GitHub search `per_page`; 30 keeps one page inside a comfortable payload. */
const PAGE_SIZE = 30
/** GitHub search exposes at most the first 1000 results, i.e. 33 pages here. */
const MAX_PAGE = 10
/** How long one GitHub response is reused. */
const CACHE_TTL_MS = 5 * 60 * 1000
/** Bound on the in-memory response cache. */
const CACHE_MAX = 60
/** Bound on one upstream body. */
const MAX_BODY_BYTES = 4 * 1024 * 1024

/**
 * Hand-written Chinese introductions for the topic's best-known projects,
 * keyed by `owner/repo` in lower case. Copy stays factual: it restates what the
 * repository's own description and topics promise.
 */
const CURATED = new Map(Object.entries({
  'deepseek-ai/deepseek-harness': 'DSH 官方主仓库：一套「万物皆插件」的 AI 编码代理运行时，插件机制、内置能力都在这里，想深入插件体系就从这里读起。',
  'dsh-market/dsh-market': '跑在 DSH 内部的可视化插件市场：浏览、搜索、一键安装，可以作为自建插件市场的参考实现。',
  'awesome-dsh-plugin/awesome-dsh-plugin': '社区维护的 DSH 插件精选清单，按类别整理可直接安装的插件，适合当作选型目录先逛一圈。',
  'anywhere-labs/dsh-desktop': '把 DSH 做成桌面端应用，桌面本身也按插件实现，适合想要独立窗口与系统集成的用户。',
  'dataelement/dsh-desktop': '另一个社区维护的 DSH 桌面版封装（DSHDesktop），开箱即用，省去自己搭建运行环境。',
  'zhu1090093659/dsh-web': 'DSH 的 Web 插件聚合生态，通过「创意工坊」分发网页侧插件，可以边逛边装。',
  'omdsh-dev/dsh-better-sidebar': '开放式的侧边栏底座：文件预览编辑、终端、侧边对话、Git、子代理等页面都能由第三方插件注册进来。',
  'ccch1mneyyy/dsh-tui': 'DSH 的终端界面（TUI）插件：占用低、支持鼠标交互，适合长期泡在终端里的用户。',
  'ccch1mneyyy/dsh-go': '把 DSH 装进口袋：既能在手机本机运行，也能远程遥控电脑上的会话。',
  'yjh051108/dsh-routing-suite': '模型路由套件：先装运行时注入器，再按任务类型把请求路由到不同的推理模型。',
  'meteornox/deepseek-balance-whale-widget': '界面右下角的小鲸鱼挂件：可拖拽吸附、带数字滚动动画，实时显示 DeepSeek 账户余额。',
  'pc2005-cloud/dsh-pet': '桌面宠物插件：一行命令装好的透明动画小桌宠，支持多开，位置和大小都能调，还内置 DIY 素材链。',
  'elysia395/dsh-wallpaper-engine': '把本机 Wallpaper Engine 的壁纸搬进 DSH 网页界面，用内置开源 WebGL 引擎实时渲染场景壁纸。',
  't-auto/dsh-ops': 'DSH 底层操作工具集，目标是少花 token、少等时间地完成常见底层操作。',
  'bowenliang123/dsh-context': '上下文洞察与管理插件：仪表盘、浏览器、侧边栏三种视角查看并清理上下文占用。',
  'ranxianglei/billion-context': '上下文压缩插件，面向超长单会话（十亿级 token）与小窗口模型，尽量把长任务压进有限上下文。',
  'liustack/modlens': '给纯文本编码代理补上「视觉」：粘贴一张图就能让模型看懂，是 DSH 生态里较早的视觉插件。',
  'kingcharleslzy-ai/dsh-purge': '社区维护版 dsh-purge：宿主兼容、状态诊断、提示词管理、更新与本机备份回滚一条龙。',
  'xiaobright/dsh-anchored-standard': '两阶段预设：先用对齐 Minimal 的引导起步，再切换到完整 Standard 工具集，兼顾稳定与能力。',
  'fei2411/ds-bot': '常驻机器人团队：主机器人、机器人之间的消息与群聊，适合把多代理协作长期跑起来。',
  'ebony-vinyl/dsh-our-free-model': '装上就能用一批前沿模型，作者声明无需登录或填 API Key（免费范围与额度请以仓库说明为准）。',
  'alchaincyf/nuwa-skill': '把任何人的思维方式蒸馏成可复用技能：心智模型、决策启发式与表达风格。',
  'tencent/browserskill': '让 AI 代理直接使用你已登录的真实浏览器，不打断你手头的工作，提供 CLI 与浏览器扩展两种接入。',
  'freestylefly/awesome-gpt-image-2': 'GPT Image 2 / 2.5 的提示词与案例库：530+ 案例、20+ 套模板，附完整提示词与生成记录。',
  'lingfengqaq/webnovel-writer': '面向长篇网文连载的写作系统，重点解决 AI 写作里的「遗忘」和「幻觉」，支持百万字量级。',
  'alchaincyf/huashu-design': '一句话拿回能交付的设计：网页 / App 原型 / 可编辑 PPTX / 动画 / 信息图，附风格库与设计体检。',
  'qingyuna/answer-me-with-html': '把技能丢给代理，它会用一页可读的 HTML 回答难题，而不是一屏纯文本。',
  'titanwings/distilly': '把一个人「怎么想」蒸馏成可复用技能：心智模型、判断方式与表达风格，供任意代理使用。',
  'molunerfinn/picgo': '老牌图床上传工具，支持 60+ 图床与 Obsidian、Typora、VS Code 等编辑器，也以插件形式进入 DSH 生态。',
  'reactive-resume/reactive-resume': '注重隐私的简历生成器：数据自持、样式可定制、可导出，另提供面向代理的配套能力。',
}))

/** Capability keywords used by the generated Chinese sentence. */
const KEYWORDS = [
  [/plugin[-_ ]?market|marketplace|\bmarket\b/i, '插件市场与分发'],
  [/sidebar/i, '侧边栏扩展'],
  [/desktop|electron|tauri/i, '桌面端客户端'],
  [/\btui\b|terminal|\bshell\b|\bcli\b/i, '终端与命令行'],
  [/\bweb\b|webui|frontend/i, '网页界面'],
  [/pet|桌宠/i, '桌面宠物'],
  [/wallpaper|壁纸/i, '壁纸与视觉'],
  [/memory|memor/i, '记忆与长期上下文'],
  [/compact|压缩/i, '上下文压缩'],
  [/context/i, '上下文管理'],
  [/vision|视觉|看图/i, '图像与视觉'],
  [/voice|speech|语音/i, '语音'],
  [/translat|翻译/i, '翻译'],
  [/skill|技能/i, '技能包'],
  [/rout|路由/i, '模型路由'],
  [/\bgit\b/i, 'Git 集成'],
  [/\bmcp\b/i, 'MCP 连接'],
  [/browser|浏览器/i, '浏览器自动化'],
  [/design|设计|figma/i, '设计产出'],
  [/diagram|图表/i, '图表绘制'],
  [/\bppt\b|slides|演示/i, '演示文稿'],
  [/\bdocx?\b|文档|document/i, '文档处理'],
  [/schedul|cron|定时/i, '定时任务'],
  [/\bbot\b|robot|机器人/i, '机器人协作'],
  [/mobile|android|\bios\b|手机/i, '移动端'],
  [/theme|主题/i, '主题外观'],
  [/balanc|余额/i, '余额查看'],
  [/token|usage|用量/i, 'Token 统计'],
  [/\brag\b|retriev|检索/i, '检索增强'],
  [/backup|备份/i, '备份恢复'],
  [/update|更新管理/i, '更新管理'],
  [/notif|通知/i, '通知提醒'],
  [/sandbox|沙箱/i, '沙箱与隔离'],
  [/workflow|工作流/i, '工作流编排'],
]

/** Error codes that mean "the local trust store cannot verify this host". */
const CERT_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'CERT_HAS_EXPIRED',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
  'ERR_TLS_CERT_ALTNAME_INVALID',
])

/** One JSON response with a bounded body. */
function writeJson(res, status, body) {
  const text = JSON.stringify(body)
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(text),
    'cache-control': 'no-store',
    'referrer-policy': 'no-referrer',
  })
  res.end(text)
}

/**
 * One GET returning status, headers and a bounded UTF-8 body.
 * `insecure` disables certificate verification for hosts this machine cannot
 * verify through its own trust store (a local TLS-inspecting proxy), which is
 * reported as a normal deployment condition rather than a crash.
 */
function httpGet(url, insecure) {
  return new Promise((resolve, reject) => {
    const req = httpsRequest(url, {
      method: 'GET',
      timeout: 12_000,
      rejectUnauthorized: !insecure,
      headers: {
        accept: 'application/vnd.github+json',
        'accept-encoding': 'identity',
        'user-agent': `dsh-plugin-market/1.0 (+${TOPIC_URL})`,
        'x-github-api-version': '2022-11-28',
      },
    }, (res) => {
      /** @type {Buffer[]} */
      const chunks = []
      let size = 0
      res.on('data', (chunk) => {
        size += chunk.length
        if (size > MAX_BODY_BYTES) {
          req.destroy(new Error('upstream body too large'))
          return
        }
        chunks.push(chunk)
      })
      res.on('end', () => {
        resolve({
          status: res.statusCode ?? 0,
          headers: res.headers,
          text: Buffer.concat(chunks).toString('utf8'),
        })
      })
      res.on('error', reject)
    })
    req.on('timeout', () => req.destroy(new Error('upstream timeout')))
    req.on('error', reject)
    req.end()
  })
}

/** A failure the page can explain. */
class MarketError extends Error {
  constructor(code, message) {
    super(message)
    this.code = code
  }
}

/** Fetch one GitHub JSON document, retrying without trust verification only on a certificate failure. */
async function getGitHubJson(url) {
  let response
  try {
    response = await httpGet(url, false)
  } catch (error) {
    const code = error && typeof error === 'object' ? error.code : undefined
    if (typeof code === 'string' && CERT_CODES.has(code)) {
      response = await httpGet(url, true)
    } else if (code === 'ENOTFOUND' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'EAI_AGAIN') {
      throw new MarketError('network', '无法连接 GitHub（域名解析或网络被拦截），请检查网络与代理设置后重试。')
    } else {
      throw new MarketError('network', `无法连接 GitHub：${error instanceof Error ? error.message : String(error)}`)
    }
  }
  const { status, text } = response
  if (status === 403 || status === 429) {
    const remaining = response.headers['x-ratelimit-remaining']
    const hint = remaining === '0'
      ? '未登录访问 GitHub 搜索接口每小时只有 10 次额度，已经用完了。'
      : 'GitHub 暂时拒绝了这次请求。'
    throw new MarketError('rate-limit', `${hint}请稍后点「刷新」重试，或直接到 GitHub 主题页浏览。`)
  }
  if (status === 422) {
    throw new MarketError('query', 'GitHub 不接受这组搜索条件，请换一个关键词试试。')
  }
  if (status !== 200) {
    throw new MarketError('upstream', `GitHub 返回 HTTP ${status}。`)
  }
  try {
    return JSON.parse(text)
  } catch {
    throw new MarketError('upstream', 'GitHub 返回的内容不是合法 JSON。')
  }
}

/** Chinese characters present in a repository description. */
function cjkCount(value) {
  const matched = value.match(/[\u3400-\u9fff]/g)
  return matched === null ? 0 : matched.length
}

/** `439797` → `44.0万`, `6982` → `6982`. */
function formatStars(value) {
  if (!Number.isFinite(value)) return ''
  if (value >= 10_000) return `${(value / 10_000).toFixed(1)}万`
  return String(value)
}

/**
 * Capability labels matched from the repository name and its own description.
 * Topic slugs are excluded: they are identifiers such as `agent-skills` that
 * over-match and would mislabel a project.
 */
function classify(item) {
  const haystack = [item.name, item.description ?? ''].join(' ')
  const labels = []
  for (const [pattern, label] of KEYWORDS) {
    if (labels.length >= 2) break
    if (labels.includes(label)) continue
    if (pattern.test(haystack)) labels.push(label)
  }
  return labels
}

/** One Chinese introduction plus the badge that names its source. */
function introFor(item) {
  const curated = CURATED.get(String(item.full_name).toLowerCase())
  if (curated) return { text: curated, source: 'editor' }

  const description = typeof item.description === 'string' ? item.description.trim() : ''
  if (description !== '' && cjkCount(description) >= 6) {
    return { text: description, source: 'repo' }
  }

  const owner = item.owner && item.owner.login ? item.owner.login : '社区作者'
  const name = String(item.name ?? '')
  const labels = classify(item)
  const parts = [`「${name}」是 GitHub 主题 dsh-plugin 下的项目，由 ${owner} 维护`]
  if (labels.length > 0) parts.push(`，偏向${labels.join('、')}方向`)
  if (typeof item.language === 'string' && item.language !== '') parts.push(`，主要使用 ${item.language} 编写`)
  if (typeof item.stargazers_count === 'number') parts.push(`，星标约 ${formatStars(item.stargazers_count)}`)
  const updated = String(item.pushed_at ?? item.updated_at ?? '').slice(0, 10)
  if (updated !== '') parts.push(`，最近更新于 ${updated}`)
  parts.push('。仓库暂无中文简介，点开卡片可查看 README 了解具体用法。')
  return { text: parts.join(''), source: 'auto' }
}

/** The JSON shape the page consumes. */
function normalize(item) {
  const intro = introFor(item)
  const updatedAt = String(item.pushed_at ?? item.updated_at ?? '').slice(0, 10)
  return {
    fullName: String(item.full_name ?? ''),
    name: String(item.name ?? ''),
    owner: item.owner && item.owner.login ? String(item.owner.login) : '',
    url: String(item.html_url ?? ''),
    homepage: typeof item.homepage === 'string' ? item.homepage : '',
    description: typeof item.description === 'string' ? item.description : '',
    intro: intro.text,
    introSource: intro.source,
    stars: Number(item.stargazers_count ?? 0),
    starsLabel: formatStars(Number(item.stargazers_count ?? 0)),
    forks: Number(item.forks_count ?? 0),
    language: typeof item.language === 'string' ? item.language : '',
    license: item.license && typeof item.license.spdx_id === 'string' && item.license.spdx_id !== 'NOASSERTION'
      ? item.license.spdx_id
      : '',
    updatedAt,
    createdAt: String(item.created_at ?? '').slice(0, 10),
    topics: Array.isArray(item.topics) ? item.topics.slice(0, 6).map(String) : [],
    archived: item.archived === true,
  }
}

/** Cache entry shape: `{ at, payload }` keyed by the exact upstream query. */
function createCache() {
  return new Map()
}

/** Read a live page or `undefined` while the entry is still fresh. */
function readCache(cache, key) {
  const entry = cache.get(key)
  if (entry === undefined) return undefined
  if (Date.now() - entry.at > CACHE_TTL_MS) {
    cache.delete(key)
    return undefined
  }
  return entry.payload
}

/** Remember one payload, dropping the oldest entries past the cap. */
function writeCache(cache, key, payload) {
  cache.set(key, { at: Date.now(), payload })
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next()
    if (oldest.done) break
    cache.delete(oldest.value)
  }
}

/** One page of the market, cached per exact upstream query. */
async function loadPage(cache, { sort, page, query }) {
  const search = [`topic:${TOPIC}`]
  if (query !== '') search.push(query)
  const upstream = new URL('https://api.github.com/search/repositories')
  upstream.searchParams.set('q', search.join(' '))
  upstream.searchParams.set('sort', sort)
  upstream.searchParams.set('order', 'desc')
  upstream.searchParams.set('per_page', String(PAGE_SIZE))
  upstream.searchParams.set('page', String(page))

  const key = upstream.toString()
  const cached = readCache(cache, key)
  if (cached !== undefined) return cached

  const body = await getGitHubJson(key)
  const items = Array.isArray(body.items) ? body.items.map(normalize) : []
  const payload = {
    ok: true,
    items,
    total: Number(body.total_count ?? 0),
    page,
    pageSize: PAGE_SIZE,
    hasMore: items.length === PAGE_SIZE && page < MAX_PAGE,
    fetchedAt: new Date().toISOString(),
    topicUrl: TOPIC_URL,
  }
  writeCache(cache, key, payload)
  return payload
}

/** Method, parameters and error mapping for one request. */
async function handleRequest(req, res, cache) {
  if (req.method !== 'GET') {
    writeJson(res, 405, { ok: false, code: 'method', message: '只支持 GET。' })
    return
  }
  const url = new URL(req.url ?? API_PATH, 'http://localhost')
  const rawSort = url.searchParams.get('sort') ?? 'stars'
  const sort = rawSort === 'updated' || rawSort === 'forks' ? rawSort : 'stars'
  const rawPage = Number(url.searchParams.get('page') ?? '1')
  const page = Number.isFinite(rawPage) ? Math.min(Math.max(Math.trunc(rawPage), 1), MAX_PAGE) : 1
  const query = (url.searchParams.get('q') ?? '').trim().slice(0, 256)

  try {
    writeJson(res, 200, await loadPage(cache, { sort, page, query }))
  } catch (error) {
    const known = error instanceof MarketError
    const code = known ? error.code : 'unexpected'
    const message = known
      ? error.message
      : `读取 GitHub 失败：${error instanceof Error ? error.message : String(error)}`
    writeJson(res, code === 'rate-limit' ? 429 : 502, { ok: false, code, message })
  }
}

/** Host plugin entry: one read-only route for the market page. */
export function apply(ctx) {
  const cache = createCache()
  ctx.effect(() => ctx.webServer.register({
    kind: 'exact',
    path: API_PATH,
    handler: (req, res) => {
      handleRequest(req, res, cache).catch((error) => {
        if (res.headersSent) {
          res.end()
          return
        }
        writeJson(res, 500, {
          ok: false,
          code: 'unexpected',
          message: `插件市场路由异常：${error instanceof Error ? error.message : String(error)}`,
        })
      })
    },
  }), 'dsh-plugin-market items route')
}

/** Route registration is optional: a Host without the Web carrier skips the row's work. */
export const inject = ['webServer']
