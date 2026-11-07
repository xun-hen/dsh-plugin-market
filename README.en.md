# Plugin Market for DeepSeek Harness

A sidebar panel for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) (DSH) that reads the GitHub topic [`dsh-plugin`](https://github.com/topics/dsh-plugin) live and pairs **every project with a written Chinese introduction**.

Nothing is snapshotted: each load queries the topic. Introductions are labelled per card so you can judge them:

- `Chinese intro · editorial` — hand-written for well-known projects (bundled table of ~30)
- `Chinese intro · repository text` — the repository's own description, when it is already Chinese
- `Chinese intro · generated` — assembled from owner, language, stars, last push and capability keywords, and says so explicitly

The introduction is a filtering aid; the repository README is always authoritative.

## Features

- Live `topic:dsh-plugin` search, stars first by default
- Card: repo, owner, language, stars, last push, topic chips, repository link
- Search through the GitHub search API, including `language:TypeScript` and other qualifiers
- Sort by stars or last update; refresh; "load more" paging
- Copy repository link; open repository or the GitHub topic in a new tab
- Skeleton, empty, rate-limit and network states with retry — all explained in Chinese
- Styled only with host theme tokens, so it follows light and dark themes

## Install

In the DSH Plugins page, add one of these specs:

| Source | Spec |
| --- | --- |
| GitHub repository | `github:<owner>/<repo>` or `https://github.com/<owner>/<repo>` |
| Local directory (development) | `link:F:\path\to\dsh-plugin-market` |
| Local tarball | `file:F:\path\to\dsh-plugin-market-1.0.0.tgz` |
| npm (after publishing) | `@yourscope/dsh-plugin-market` |

The 「插件市场」 row appears between Plugins and Schedules in the sidebar; refresh the page once if it is not there yet.

## How the Chinese text is produced

The Host half computes one introduction per repository: the curated table first, then a repository description that is already Chinese, then a sentence generated from verified metadata (marked `auto`). Add an entry to `CURATED` in `index.js` to improve a specific project; keys are lower-case `owner/repo`.

## Data, quota, privacy

- Only the public GitHub search endpoint (`/search/repositories`), no token;
- Anonymous search allows roughly 10 requests a minute and the first 1000 results, so the Host caches responses for five minutes and the page explains throttling instead of showing a bare status code;
- Behind a TLS-inspecting proxy whose root CA Node does not trust, the Host retries **only on certificate errors**; other network failures are reported as they are;
- The plugin collects nothing and writes nothing outside its own package.

## Publish it

1. Rename to a name you can publish (DSH requires the package name, the patch row name and the Client module id to match):

   ```bash
   node scripts/set-name.mjs @yourscope/dsh-plugin-market
   ```

2. Push to GitHub and add the `dsh-plugin` topic so this market lists it too.
3. Optionally publish: `npm publish --access public`; `.github/workflows/publish.yml` publishes on a `v*` tag once `NPM_TOKEN` is set.

## Compatibility

Uses the host `webServer` service, the `sidebar.panellist` and `main` slots, and the Client `locale` service. Verified installed on the current DSH Desktop build (desktop profile): the route returns live data and both slots are active. Without `webServer` the Host half stays inactive and the page reports the failure — a degraded state, not a crash.

## License

[MIT](LICENSE). The icon is original artwork and ships with the package.
