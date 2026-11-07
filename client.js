window.__ModuleLoader__.load({
  id: '@local/dsh-plugin-market',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'plugin-market'
    const ROUTE = '/api/dsh-plugin-market/items'
    const SIDEBAR_ID = 'plugin-market'
    const PANEL_ORDER = 15

    /** UI copy; the Chinese introductions themselves are content and stay Chinese. */
    const DICTS = {
      'zh-CN': {
        'nav.label': '插件市场',
        'page.title': '插件市场',
        'page.badge': 'topic: dsh-plugin',
        'page.subtitle': '直接读取 GitHub 主题 dsh-plugin 下的仓库，并为每个项目附一份中文导读。',
        'search.placeholder': '搜索插件，例如 memory、cli、language:TypeScript（回车搜索）',
        'search.action': '搜索',
        'sort.stars': '最热',
        'sort.updated': '最新更新',
        'refresh': '刷新',
        'openTopic': '在 GitHub 打开主题 ↗',
        'count': '共 {total} 个仓库 · 已加载 {loaded} 个',
        'countUnknown': '正在读取 GitHub…',
        'fetchedAt': '数据抓取自 GitHub · {time}',
        'loading': '正在从 GitHub 读取仓库…',
        'error.title': '读取失败',
        'retry': '重试',
        'empty': '没有找到匹配的仓库，换个关键词再试。',
        'loadMore': '加载更多',
        'loadingMore': '加载中…',
        'allLoaded': '已到已加载范围底部',
        'copy': '复制链接',
        'copied': '已复制',
        'open': '查看仓库 ↗',
        'stars': '星标',
        'updated': '更新',
        'archived': '已归档',
        'source.editor': '中文导读 · 编辑整理',
        'source.repo': '中文导读 · 仓库原文',
        'source.auto': '中文导读 · 自动整理',
        'limitNote': 'GitHub 搜索接口最多只返回前 1000 条结果，用关键词可以继续缩小范围。',
        'footNote': '导读来源标注：编辑整理为本插件人工撰写，仓库原文为仓库自带的中文简介，自动整理依据语言、星标与更新时间生成；具体内容以仓库为准。',
        'searchingFor': '搜索：{query}',
      },
      'en': {
        'nav.label': 'Plugin Market',
        'page.title': 'Plugin Market',
        'page.badge': 'topic: dsh-plugin',
        'page.subtitle': 'Reads the GitHub topic dsh-plugin directly and pairs every project with a written Chinese introduction.',
        'search.placeholder': 'Search plugins, e.g. memory, cli, language:TypeScript (press Enter)',
        'search.action': 'Search',
        'sort.stars': 'Most starred',
        'sort.updated': 'Recently updated',
        'refresh': 'Refresh',
        'openTopic': 'Open the topic on GitHub ↗',
        'count': '{total} repositories · {loaded} loaded',
        'countUnknown': 'Reading GitHub…',
        'fetchedAt': 'Fetched from GitHub · {time}',
        'loading': 'Reading repositories from GitHub…',
        'error.title': 'Could not load',
        'retry': 'Retry',
        'empty': 'No repository matched. Try another keyword.',
        'loadMore': 'Load more',
        'loadingMore': 'Loading…',
        'allLoaded': 'End of the loaded range',
        'copy': 'Copy link',
        'copied': 'Copied',
        'open': 'Open repository ↗',
        'stars': 'stars',
        'updated': 'updated',
        'archived': 'archived',
        'source.editor': 'Chinese intro · editorial',
        'source.repo': 'Chinese intro · repository text',
        'source.auto': 'Chinese intro · generated',
        'limitNote': 'GitHub search returns only the first 1000 results; narrow it with keywords.',
        'footNote': 'Intro labels: editorial is written for this plugin, repository text is the repository\'s own Chinese description, generated is assembled from language, stars and last push; the repository is always authoritative.',
        'searchingFor': 'Search: {query}',
      },
    }
    DICTS['zh'] = DICTS['zh-CN']

    /** Locale service captured in apply, used for live re-render and translation. */
    let locale = null

    /** Translate one key, substituting `{name}` placeholders. */
    function tr(key, vars) {
      let text = key
      if (locale !== null) {
        try {
          const translated = locale.bind(NS)(key)
          if (typeof translated === 'string' && translated !== key) text = translated
        } catch (error) {
          text = DICTS['zh-CN'][key] || key
        }
      } else {
        const dict = DICTS['zh-CN']
        if (dict[key] !== undefined) text = dict[key]
      }
      if (vars === undefined) return text
      return text.replace(/\{(\w+)\}/g, (match, name) => (
        vars[name] === undefined ? match : String(vars[name])
      ))
    }

    /** Re-render on locale switch or a late dictionary registration. */
    function useLocaleVersion() {
      const [version, setVersion] = React.useState(0)
      React.useEffect(() => {
        if (locale === null) return undefined
        return locale.subscribe(() => setVersion((value) => value + 1))
      }, [])
      return version
    }

    /** `438000` → `43.8万` for the Chinese page. */
    function formatStars(value) {
      const number = Number(value) || 0
      if (number >= 10000) return `${(number / 10000).toFixed(1)}万`
      return String(number)
    }

    /** Midnight-safe `HH:MM` for the fetch stamp. */
    function clockOf(iso) {
      const date = new Date(iso)
      if (Number.isNaN(date.getTime())) return ''
      const pad = (value) => String(value).padStart(2, '0')
      return `${pad(date.getHours())}:${pad(date.getMinutes())}`
    }

    /** Copy text, falling back to a transient selection on older shells. */
    function copyText(text) {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        return navigator.clipboard.writeText(text)
      }
      return new Promise((resolve, reject) => {
        const area = document.createElement('textarea')
        area.value = text
        area.setAttribute('readonly', '')
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        try {
          if (document.execCommand('copy')) resolve()
          else reject(new Error('copy unsupported'))
        } catch (error) {
          reject(error)
        } finally {
          document.body.removeChild(area)
        }
      })
    }

    /** The market page's stylesheet, mounted with the page and removed with it. */
    const CSS = `
.pm-root{height:100%;min-height:0;display:flex;flex-direction:column;background:var(--dsw-alias-bg-base);color:var(--dsw-alias-label-primary)}
.pm-scroll{flex:1;min-height:0;overflow-y:auto;padding:24px 28px 56px}
.pm-inner{max-width:1120px;margin:0 auto;display:flex;flex-direction:column;gap:18px}
.pm-head{display:flex;flex-direction:column;gap:8px}
.pm-titleRow{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
.pm-title{margin:0;font-size:22px;line-height:1.3;font-weight:600;letter-spacing:-0.01em}
.pm-badge{font-size:11px;line-height:18px;padding:1px 8px;border-radius:999px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary);border:1px solid var(--dsw-alias-border-l1)}
.pm-sub{margin:0;font-size:13px;line-height:1.6;color:var(--dsw-alias-label-secondary);max-width:64ch}
.pm-toolbar{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.pm-form{display:flex;align-items:center;gap:8px;flex:1;min-width:240px}
.pm-input{flex:1;min-width:160px;height:34px;box-sizing:border-box;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);color:var(--dsw-alias-label-primary);border-radius:9px;padding:0 12px;font:inherit;font-size:13px}
.pm-input::placeholder{color:var(--dsw-alias-label-secondary);opacity:.75}
.pm-input:focus{outline:none;border-color:var(--dsw-alias-brand-primary)}
.pm-btn{appearance:none;font:inherit;font-size:12.5px;line-height:1.5;cursor:pointer;border-radius:9px;padding:7px 13px;border:1px solid var(--dsw-alias-border-l1);background:transparent;color:var(--dsw-alias-label-secondary);white-space:nowrap}
.pm-btn:hover:not(:disabled){color:var(--dsw-alias-label-primary);border-color:var(--dsw-alias-border-l2)}
.pm-btn:disabled{opacity:.55;cursor:default}
.pm-btn:focus-visible{outline:2px solid var(--dsw-alias-brand-primary);outline-offset:1px}
.pm-btnPrimary{background:var(--dsw-alias-label-primary);border-color:transparent;color:var(--dsw-alias-bg-base)}
.pm-btnPrimary:hover:not(:disabled){color:var(--dsw-alias-bg-base);opacity:.88}
.pm-segment{display:inline-flex;border:1px solid var(--dsw-alias-border-l1);border-radius:9px;overflow:hidden}
.pm-segmentBtn{appearance:none;font:inherit;font-size:12.5px;cursor:pointer;background:transparent;border:0;color:var(--dsw-alias-label-secondary);padding:7px 12px}
.pm-segmentBtn+.pm-segmentBtn{border-left:1px solid var(--dsw-alias-border-l1)}
.pm-segmentBtn:hover{color:var(--dsw-alias-label-primary)}
.pm-segmentOn{color:var(--dsw-alias-label-primary);background:color-mix(in srgb,var(--dsw-alias-brand-primary) 10%,transparent)}
.pm-link{color:var(--dsw-alias-brand-primary);text-decoration:none;font-size:12.5px}
.pm-link:hover{text-decoration:underline}
.pm-status{display:flex;align-items:center;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--dsw-alias-label-secondary)}
.pm-dot{width:3px;height:3px;border-radius:50%;background:currentColor;opacity:.6}
.pm-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
.pm-card{display:flex;flex-direction:column;gap:10px;padding:14px 16px 12px;border:1px solid var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);transition:border-color .16s,background .16s}
.pm-card:hover{border-color:var(--dsw-alias-border-l2)}
.pm-cardHead{display:flex;align-items:center;gap:10px;min-width:0}
.pm-avatar{flex:none;width:30px;height:30px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:600;background:color-mix(in srgb,var(--dsw-alias-brand-primary) 14%,transparent);color:var(--dsw-alias-brand-primary)}
.pm-repoBlock{display:flex;flex-direction:column;min-width:0;flex:1}
.pm-repo{font-size:14px;font-weight:600;line-height:1.35;color:var(--dsw-alias-label-primary);text-decoration:none;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pm-repo:hover{text-decoration:underline}
.pm-owner{font-size:11.5px;line-height:1.4;color:var(--dsw-alias-label-secondary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pm-star{flex:none;font-size:12px;color:var(--dsw-alias-label-secondary);font-variant-numeric:tabular-nums}
.pm-intro{margin:0;font-size:13.5px;line-height:1.65;color:var(--dsw-alias-label-primary);display:-webkit-box;-webkit-line-clamp:5;-webkit-box-orient:vertical;overflow:hidden}
.pm-desc{margin:0;font-size:12px;line-height:1.55;color:var(--dsw-alias-label-secondary);display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.pm-tags{display:flex;gap:6px;flex-wrap:wrap}
.pm-tag{font-size:11px;line-height:17px;padding:0 7px;border-radius:6px;background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-secondary)}
.pm-cardFoot{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:2px;font-size:11.5px;color:var(--dsw-alias-label-secondary)}
.pm-footSpacer{flex:1}
.pm-source{font-size:10.5px;line-height:16px;padding:0 6px;border-radius:5px;border:1px solid var(--dsw-alias-border-l1);color:var(--dsw-alias-label-secondary);white-space:nowrap}
.pm-notice{padding:28px 16px;border:1px dashed var(--dsw-alias-border-l1);border-radius:14px;background:var(--dsw-alias-bg-layer-1);text-align:center;display:flex;flex-direction:column;align-items:center;gap:10px}
.pm-noticeTitle{margin:0;font-size:14px;font-weight:600}
.pm-noticeText{margin:0;font-size:12.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);max-width:52ch}
.pm-errorText{color:var(--dsw-alias-state-error-primary)}
.pm-footer{display:flex;flex-direction:column;gap:6px;align-items:center;padding-top:4px}
.pm-note{margin:0;font-size:11.5px;line-height:1.6;color:var(--dsw-alias-label-secondary);text-align:center;max-width:76ch}
.pm-skeleton{display:grid;grid-template-columns:repeat(auto-fill,minmax(310px,1fr));gap:14px}
.pm-skelCard{height:168px;border-radius:14px;border:1px solid var(--dsw-alias-border-l1);background:var(--dsw-alias-bg-layer-1);position:relative;overflow:hidden}
.pm-skelCard::after{content:"";position:absolute;inset:0;background:linear-gradient(90deg,transparent,color-mix(in srgb,var(--dsw-alias-label-secondary) 8%,transparent),transparent);transform:translateX(-100%);animation:pmShimmer 1.5s infinite}
@keyframes pmShimmer{100%{transform:translateX(100%)}}
@media (prefers-reduced-motion:reduce){.pm-skelCard::after{animation:none}}
`

    /** The sidebar glyph: a market stall drawn at the shell's requested edge. */
    function MarketIcon({ size }) {
      const edge = Number(size) > 0 ? Number(size) : 20
      return h('svg', {
        viewBox: '0 0 20 20',
        width: edge,
        height: edge,
        'aria-hidden': true,
        focusable: 'false',
        style: { display: 'block' },
      }, [
        h('path', {
          key: 'roof',
          d: 'M3 8.2 4.5 3.4h11L17 8.2',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
          strokeLinecap: 'round',
        }),
        h('path', {
          key: 'body',
          d: 'M4.6 8.9v7.4h10.8V8.9',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
        h('path', {
          key: 'door',
          d: 'M8.2 16.3v-4.1h3.6v4.1',
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.5,
          strokeLinejoin: 'round',
        }),
      ])
    }

    /** One repository card. */
    function Card({ item }) {
      const [copied, setCopied] = React.useState(false)
      React.useEffect(() => {
        if (!copied) return undefined
        const timer = setTimeout(() => setCopied(false), 1600)
        return () => clearTimeout(timer)
      }, [copied])

      const sourceLabel = item.introSource === 'editor'
        ? tr('source.editor')
        : item.introSource === 'repo' ? tr('source.repo') : tr('source.auto')
      const monogram = (item.owner || item.name || '?').slice(0, 1).toUpperCase()
      const showOriginal = item.description !== ''
        && item.introSource !== 'repo'
        && item.description !== item.intro

      return h('article', { className: 'pm-card' }, [
        h('div', { key: 'head', className: 'pm-cardHead' }, [
          h('span', { key: 'avatar', className: 'pm-avatar', 'aria-hidden': true }, monogram),
          h('div', { key: 'titles', className: 'pm-repoBlock' }, [
            h('a', {
              key: 'repo',
              className: 'pm-repo',
              href: item.url,
              target: '_blank',
              rel: 'noreferrer noopener',
              title: item.fullName,
            }, item.name),
            h('span', { key: 'owner', className: 'pm-owner' }, [
              item.owner === '' ? '' : `@${item.owner}`,
              item.archived ? ` · ${tr('archived')}` : '',
            ].join('')),
          ]),
          h('span', {
            key: 'stars',
            className: 'pm-star',
            title: `${tr('stars')}: ${item.stars}`,
          }, `★ ${item.starsLabel || formatStars(item.stars)}`),
        ]),
        h('p', { key: 'intro', className: 'pm-intro' }, item.intro),
        showOriginal
          ? h('p', { key: 'desc', className: 'pm-desc', title: item.description }, item.description)
          : null,
        item.topics.length > 0
          ? h('div', { key: 'tags', className: 'pm-tags' }, item.topics.slice(0, 4).map((topic) => (
            h('span', { key: topic, className: 'pm-tag' }, topic)
          )))
          : null,
        h('div', { key: 'foot', className: 'pm-cardFoot' }, [
          h('span', { key: 'source', className: 'pm-source' }, sourceLabel),
          h('span', { key: 'spacer', className: 'pm-footSpacer' }),
          item.language === '' ? null : h('span', { key: 'lang' }, item.language),
          item.updatedAt === '' ? null : h('span', { key: 'upd' }, `${tr('updated')} ${item.updatedAt}`),
          h('button', {
            key: 'copy',
            type: 'button',
            className: 'pm-btn',
            onClick: () => {
              copyText(item.url).then(() => setCopied(true)).catch(() => setCopied(false))
            },
          }, copied ? tr('copied') : tr('copy')),
          h('a', {
            key: 'open',
            className: 'pm-btn',
            href: item.url,
            target: '_blank',
            rel: 'noreferrer noopener',
            style: { textDecoration: 'none' },
          }, tr('open')),
        ].filter(Boolean)),
      ])
    }

    /** The market page: search, sort, page through the GitHub topic. */
    function MarketPage() {
      useLocaleVersion()
      const [sort, setSort] = React.useState('stars')
      const [input, setInput] = React.useState('')
      const [query, setQuery] = React.useState('')
      const [page, setPage] = React.useState(1)
      const [items, setItems] = React.useState([])
      const [total, setTotal] = React.useState(null)
      const [fetchedAt, setFetchedAt] = React.useState('')
      const [status, setStatus] = React.useState('loading')
      const [error, setError] = React.useState('')
      const [hasMore, setHasMore] = React.useState(false)
      const latest = React.useRef(0)

      const load = React.useCallback((nextPage, append) => {
        const requestId = latest.current + 1
        latest.current = requestId
        setStatus(append ? 'more' : 'loading')
        setError('')
        const url = `${ROUTE}?sort=${encodeURIComponent(sort)}&page=${nextPage}&q=${encodeURIComponent(query)}`
        fetch(url, { headers: { accept: 'application/json' }, credentials: 'same-origin' })
          .then((response) => response.json()
            .catch(() => ({ ok: false, message: `响应不是合法 JSON（HTTP ${response.status}）` }))
            .then((body) => ({ status: response.status, body })))
          .then(({ body }) => {
            if (latest.current !== requestId) return
            if (!body || body.ok !== true) {
              throw new Error((body && body.message) || '读取失败')
            }
            setItems((previous) => (append ? previous.concat(body.items) : body.items))
            setTotal(typeof body.total === 'number' ? body.total : null)
            setPage(nextPage)
            setFetchedAt(body.fetchedAt || '')
            setHasMore(body.hasMore === true)
            setStatus('ready')
          })
          .catch((failure) => {
            if (latest.current !== requestId) return
            setStatus('error')
            setError(failure instanceof Error ? failure.message : String(failure))
          })
      }, [sort, query])

      React.useEffect(() => {
        load(1, false)
      }, [load])

      const submit = (event) => {
        event.preventDefault()
        setQuery(input.trim())
      }
      const busy = status === 'loading' || status === 'more'

      return h('div', { className: 'pm-root' }, [
        h('style', { key: 'css' }, CSS),
        h('div', { key: 'scroll', className: 'pm-scroll' }, [
          h('div', { key: 'inner', className: 'pm-inner' }, [
            h('header', { key: 'head', className: 'pm-head' }, [
              h('div', { key: 'titleRow', className: 'pm-titleRow' }, [
                h('h1', { key: 'title', className: 'pm-title' }, tr('page.title')),
                h('span', { key: 'badge', className: 'pm-badge' }, tr('page.badge')),
              ]),
              h('p', { key: 'sub', className: 'pm-sub' }, tr('page.subtitle')),
            ]),
            h('div', { key: 'toolbar', className: 'pm-toolbar' }, [
              h('form', { key: 'form', className: 'pm-form', onSubmit: submit }, [
                h('input', {
                  key: 'input',
                  className: 'pm-input',
                  type: 'search',
                  value: input,
                  placeholder: tr('search.placeholder'),
                  'aria-label': tr('search.action'),
                  onChange: (event) => setInput(event.target.value),
                }),
                h('button', {
                  key: 'go',
                  type: 'submit',
                  className: 'pm-btn pm-btnPrimary',
                  disabled: busy,
                }, tr('search.action')),
              ]),
              h('div', { key: 'segment', className: 'pm-segment', role: 'group' }, [
                h('button', {
                  key: 'stars',
                  type: 'button',
                  className: `pm-segmentBtn${sort === 'stars' ? ' pm-segmentOn' : ''}`,
                  'aria-pressed': sort === 'stars',
                  onClick: () => setSort('stars'),
                }, tr('sort.stars')),
                h('button', {
                  key: 'updated',
                  type: 'button',
                  className: `pm-segmentBtn${sort === 'updated' ? ' pm-segmentOn' : ''}`,
                  'aria-pressed': sort === 'updated',
                  onClick: () => setSort('updated'),
                }, tr('sort.updated')),
              ]),
              h('button', {
                key: 'refresh',
                type: 'button',
                className: 'pm-btn',
                disabled: busy,
                onClick: () => load(1, false),
              }, tr('refresh')),
              h('a', {
                key: 'topic',
                className: 'pm-link',
                href: 'https://github.com/topics/dsh-plugin',
                target: '_blank',
                rel: 'noreferrer noopener',
              }, tr('openTopic')),
            ]),
            h('div', {
              key: 'status',
              className: 'pm-status',
              role: 'status',
              'aria-live': 'polite',
            }, [
              h('span', { key: 'count' }, total === null
                ? tr('countUnknown')
                : tr('count', { total: total.toLocaleString('zh-CN'), loaded: items.length })),
              query === '' ? null : h('span', { key: 'q' }, tr('searchingFor', { query })),
              fetchedAt === '' ? null : h('span', { key: 'dot1', className: 'pm-dot', 'aria-hidden': true }),
              fetchedAt === '' ? null : h('span', { key: 'stamp' }, tr('fetchedAt', { time: clockOf(fetchedAt) })),
            ].filter(Boolean)),
            status === 'loading'
              ? h('div', { key: 'skeleton', className: 'pm-skeleton' }, [0, 1, 2, 3, 4, 5].map((slot) => (
                h('div', { key: slot, className: 'pm-skelCard', 'aria-hidden': true })
              )))
              : null,
            status === 'error' && items.length === 0
              ? h('div', { key: 'error', className: 'pm-notice' }, [
                h('p', { key: 'title', className: 'pm-noticeTitle pm-errorText' }, tr('error.title')),
                h('p', { key: 'text', className: 'pm-noticeText' }, error),
                h('button', {
                  key: 'retry',
                  type: 'button',
                  className: 'pm-btn pm-btnPrimary',
                  onClick: () => load(1, false),
                }, tr('retry')),
                h('a', {
                  key: 'topic',
                  className: 'pm-link',
                  href: 'https://github.com/topics/dsh-plugin',
                  target: '_blank',
                  rel: 'noreferrer noopener',
                }, tr('openTopic')),
              ])
              : null,
            status === 'ready' && items.length === 0
              ? h('div', { key: 'empty', className: 'pm-notice' }, [
                h('p', { key: 'text', className: 'pm-noticeText' }, tr('empty')),
              ])
              : null,
            status !== 'loading' && items.length > 0
              ? h('div', { key: 'grid', className: 'pm-grid' }, items.map((item) => (
                h(Card, { key: item.fullName, item })
              )))
              : null,
            status === 'error' && items.length > 0
              ? h('div', { key: 'inlineError', className: 'pm-status pm-errorText' }, [
                h('span', { key: 'text' }, error),
                h('button', {
                  key: 'retry',
                  type: 'button',
                  className: 'pm-btn',
                  onClick: () => load(page + 1, true),
                }, tr('retry')),
              ])
              : null,
            status !== 'loading' && items.length > 0
              ? h('div', { key: 'footer', className: 'pm-footer' }, [
                hasMore
                  ? h('button', {
                    key: 'more',
                    type: 'button',
                    className: 'pm-btn',
                    disabled: busy,
                    onClick: () => load(page + 1, true),
                  }, status === 'more' ? tr('loadingMore') : tr('loadMore'))
                  : h('p', { key: 'end', className: 'pm-note' }, tr('allLoaded')),
                total !== null && total > 1000
                  ? h('p', { key: 'limit', className: 'pm-note' }, tr('limitNote'))
                  : null,
                h('p', { key: 'foot', className: 'pm-note' }, tr('footNote')),
              ])
              : null,
          ]),
        ]),
      ])
    }

    /** Locale ids this namespace answers for, so any shipped tag resolves. */
    const LOCALE_DICTS = [
      ['zh-CN', DICTS['zh-CN']],
      ['zh', DICTS['zh']],
      ['en', DICTS.en],
      ['en-US', DICTS.en],
    ]

    /** Register the locale dictionaries, the sidebar row and the page. */
    function apply(ctx) {
      locale = ctx.get('locale') || null
      if (locale !== null) {
        for (const [id, dict] of LOCALE_DICTS) {
          ctx.effect(() => locale.register(NS, id, dict), `plugin-market locale ${id}`)
        }
      }

      ctx.effect(() => {
        const releases = []
        releases.push(ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
          name: 'sidebar.panellist',
          id: SIDEBAR_ID,
          order: PANEL_ORDER,
          label: () => tr('nav.label'),
        }, MarketIcon)))
        releases.push(ctx.slots.inject('main', () => ctx.slots.register({
          name: 'main',
          key: SIDEBAR_ID,
        }, MarketPage)))
        return () => {
          for (const release of releases.splice(0)) release()
        }
      }, 'plugin-market panel')
    }

    return {
      inject: ['slots'],
      apply,
    }
  },
})
