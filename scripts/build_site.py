#!/usr/bin/env python3
"""把 `index.json` 渲染成人类可看的静态目录页（GitHub Pages）。

页面只嵌入**轻索引**；每个插件的版本表 / 每平台资产在展开时按需拉
`plugins/<id>.json`——与 TUI 商店同一条契约，插件变多也不会把首屏拖慢。

用法：
    python scripts/build_site.py --index _site/index.json --output _site/index.html
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path


PAGE = """<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>FuyuBot 插件目录</title>
<style>
:root {{
  color-scheme: light dark;
  --bg: #f7f7f8; --fg: #1b1b1f; --muted: #64646e; --card: #fff;
  --line: #e3e3e8; --accent: #0b6bcb; --ok: #157347; --warn: #a15c00; --bad: #b42318;
}}
@media (prefers-color-scheme: dark) {{
  :root {{ --bg:#111214; --fg:#e8e8ee; --muted:#9a9aa6; --card:#1a1b1f; --line:#2a2b31; --accent:#6aa9ff; --ok:#4cc38a; --warn:#e0a44a; --bad:#ff7b72; }}
}}
* {{ box-sizing: border-box; }}
body {{ margin: 0; background: var(--bg); color: var(--fg);
  font: 15px/1.6 -apple-system, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif; }}
main {{ max-width: 1100px; margin: 0 auto; padding: 32px 18px 80px; }}
h1 {{ font-size: 26px; margin: 0 0 6px; }}
.sub {{ color: var(--muted); margin: 0 0 22px; }}
.controls {{ display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 18px; position: sticky; top: 0;
  padding: 10px 0; background: linear-gradient(var(--bg) 75%, transparent); z-index: 5; }}
input[type=search], select {{ font: inherit; color: inherit; background: var(--card);
  border: 1px solid var(--line); border-radius: 9px; padding: 8px 11px; }}
input[type=search] {{ flex: 1 1 260px; min-width: 180px; }}
.count {{ color: var(--muted); align-self: center; }}
.grid {{ display: grid; gap: 12px; }}
.plugin {{ background: var(--card); border: 1px solid var(--line); border-radius: 12px; overflow: hidden; }}
summary {{ cursor: pointer; padding: 14px 16px; list-style: none; display: flex; gap: 12px; align-items: baseline; }}
summary::-webkit-details-marker {{ display: none; }}
summary::after {{ content: "＋"; margin-left: auto; color: var(--muted); font-weight: 600; }}
details[open] summary::after {{ content: "－"; }}
.name {{ font-weight: 650; }}
.id {{ color: var(--muted); font-size: 12.5px; }}
.latest {{ color: var(--accent); font-variant-numeric: tabular-nums; font-size: 13px; }}
.summary {{ color: var(--muted); font-size: 13.5px; margin: 4px 0 0; }}
.badges {{ display: flex; flex-wrap: wrap; gap: 6px; padding: 0 16px 12px; }}
.badge {{ font-size: 12px; color: var(--muted); border: 1px solid var(--line); border-radius: 999px; padding: 1px 9px; }}
.body {{ border-top: 1px solid var(--line); padding: 14px 16px; }}
.desc {{ white-space: pre-wrap; margin: 0 0 12px; }}
table {{ width: 100%; border-collapse: collapse; font-size: 13.5px; }}
th, td {{ text-align: left; padding: 7px 8px; border-bottom: 1px solid var(--line); vertical-align: top; }}
th {{ color: var(--muted); font-weight: 500; }}
tr.yanked td {{ color: var(--muted); text-decoration: line-through; }}
.target {{ margin: 12px 0 0; padding: 10px 12px; border-radius: 9px; background: color-mix(in srgb, var(--accent) 10%, transparent); }}
.target.bad {{ background: color-mix(in srgb, var(--bad) 12%, transparent); color: var(--bad); }}
.ok {{ color: var(--ok); }} .bad {{ color: var(--bad); }} .warn {{ color: var(--warn); }}
.links {{ margin-top: 10px; display: flex; gap: 14px; flex-wrap: wrap; font-size: 13px; }}
a {{ color: var(--accent); }}
.hint {{ color: var(--muted); font-size: 13px; margin: 26px 0 0; }}
code {{ background: color-mix(in srgb, var(--fg) 7%, transparent); padding: 1px 5px; border-radius: 5px; }}
</style>
</head>
<body>
<main>
  <h1>FuyuBot 插件目录</h1>
  <p class="sub">索引 schema 2 · 列表是轻索引，展开才拉版本表。安装请用 TUI 商店
    （<code>[plugins] registry_url</code> 指向本页同目录的 <code>index.json</code>）。</p>
  <div class="controls">
    <input id="q" type="search" placeholder="搜索 id / 名称 / 简介 / 标签" autocomplete="off">
    <select id="abi" title="你的宿主 ABI（fuyubot 的 ABI 版本）">
      <option value="">宿主 ABI：不限</option>
    </select>
    <select id="platform" title="你的平台">
      <option value="">平台：不限</option>
    </select>
    <span class="count" id="count"></span>
  </div>
  <div class="grid" id="grid"></div>
  <p class="hint">选好宿主 ABI / 平台后，列表只留该宿主能装的插件；商店的规则是
    「未下架 + ABI ≤ 宿主 + 有本平台包」里最新的版本，没有就用 <code>v</code> 选历史版本。
    ABI 是宿主与插件之间的硬协议，插件升了 ABI 就得升级 fuyubot。</p>
</main>
<script>
const INDEX = {index_json};

const grid = document.getElementById('grid');
const q = document.getElementById('q');
const abiSelect = document.getElementById('abi');
const platformSelect = document.getElementById('platform');
const count = document.getElementById('count');
const details = new Map();   // id -> 已拉下来的分片
const pending = new Map();   // id -> Promise

function esc(text) {{
  return String(text ?? '').replace(/[&<>"']/g, ch => ({{
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }}[ch]));
}}

function badge(text) {{ return `<span class="badge">${{esc(text)}}</span>`; }}

function versionBlocker(version, abi, platform) {{
  if (version.yanked) return '已下架';
  if (version.abi != null && version.abi > abi) return `需要 ABI ${{version.abi}}`;
  const assets = version.assets || {{}};
  if (platform && !assets[platform] && !assets.any) return `没有 ${{platform}} 的包`;
  return null;
}}

function pickVersion(plugin, abi, platform) {{
  if (!plugin.versions || !plugin.versions.length) return null;
  const usable = plugin.versions.filter(v => !versionBlocker(v, abi, platform));
  if (!usable.length) return null;
  const latest = plugin.versions.find(v => v.version === plugin.latest);
  if (latest && usable.includes(latest)) return latest;
  return usable[usable.length - 1];   // 索引约定：versions 升序
}}

async function loadDetail(detail) {{
  if (details.has(detail)) return details.get(detail);
  if (!pending.has(detail)) {{
    pending.set(detail, fetch(detail, {{ cache: 'no-cache' }})
      .then(response => {{
        if (!response.ok) throw new Error(`HTTP ${{response.status}}`);
        return response.json();
      }})
      .then(shard => shard.plugin));
  }}
  return pending.get(detail);
}}

function targetText(plugin, abi, platform) {{
  const target = pickVersion(plugin, abi, platform);
  const where = platform ? platform : '任意平台';
  if (target) {{
    return {{ ok: true, text: `宿主 ABI ${{abi}} · ${{where}} → 会安装 ${{target.version}}` }};
  }}
  const newer = (plugin.versions || [])
    .filter(v => !v.yanked && v.abi != null && v.abi > abi)
    .map(v => v.abi);
  if (newer.length) {{
    return {{ ok: false, text: `没有兼容 ABI ${{abi}} 的版本：最低需要 ABI ${{Math.min(...newer)}}，请先升级 fuyubot` }};
  }}
  return {{ ok: false, text: `没有 ${{where}} 的可用版本（也没有 any 回退）` }};
}}

function versionRows(plugin, abi, platform) {{
  return (plugin.versions || []).slice().reverse().map(version => {{
    const blocker = versionBlocker(version, abi, platform);
    const mark = blocker ? `<span class="bad">${{esc(blocker)}}</span>`
                         : `<span class="ok">可用</span>`;
    const platforms = Object.keys(version.assets || {{}}).join(', ');
    return `<tr class="${{version.yanked ? 'yanked' : ''}}">
      <td>${{esc(version.version)}}</td>
      <td>${{version.abi == null ? '—' : esc(version.abi)}}</td>
      <td>${{esc(platforms)}}</td>
      <td>${{mark}}</td></tr>`;
  }}).join('');
}}

function renderBody(plugin) {{
  const abi = Number(abiSelect.value || 0);
  const platform = platformSelect.value || null;
  const ready = plugin.versions && plugin.versions.length;
  const desc = plugin.description ? `<p class="desc">${{esc(plugin.description)}}</p>` : '';
  const target = targetText(plugin, abi || 9999, platform);
  const table = ready
    ? `<table><thead><tr><th>版本</th><th>ABI</th><th>平台</th><th>当前选择下的状态</th></tr></thead>
       <tbody>${{versionRows(plugin, abi || 9999, platform)}}</tbody></table>
       <p class="target ${{target.ok ? '' : 'bad'}}">${{esc(target.text)}}</p>`
    : `<p class="warn">版本表加载中…</p>`;
  const links = [
    plugin.repo ? `<a href="https://github.com/${{esc(plugin.repo)}}" rel="noopener">源码</a>` : '',
    plugin.homepage ? `<a href="${{esc(plugin.homepage)}}" rel="noopener">主页</a>` : '',
  ].filter(Boolean).join('');
  return desc + table + (links ? `<div class="links">${{links}}</div>` : '');
}}

async function expand(card, plugin) {{
  const body = card.querySelector('.body');
  body.innerHTML = renderBody(plugin);
  if (plugin.versions && plugin.versions.length) return;
  body.innerHTML = `<p class="warn">版本表加载中…</p>`;
  try {{
    const full = await loadDetail(plugin.detail);
    const merged = Object.assign({{}}, plugin, full);
    details.set(plugin.detail, merged);
    if (card.open) body.innerHTML = renderBody(merged);
  }} catch (error) {{
    body.innerHTML = `<p class="bad">读不到版本表：${{esc(error.message)}}</p>`;
  }}
}}

function matches(plugin, query) {{
  if (!query) return true;
  const haystack = [plugin.id, plugin.name, plugin.summary, (plugin.tags || []).join(' ')]
    .join(' ').toLowerCase();
  return haystack.includes(query);
}}

// 轻索引摘要：平台 → 可用版本的最低 ABI（0 = 版本没写 ABI）。
// 没有摘要的老索引不做过滤（宁多勿漏）。
function hostCompatible(plugin, abi, platform) {{
  const map = plugin.platform_min_abi || {{}};
  if (!Object.keys(map).length) return true;
  if (platform) {{
    const min = map[platform] ?? map.any;
    return min != null && (min === 0 || min <= abi);
  }}
  return Object.values(map).some(min => min === 0 || min <= abi);
}}

function pluginNode(plugin) {{
  const card = document.createElement('details');
  card.className = 'plugin';
  card.id = 'p-' + plugin.id;
  const tags = (plugin.tags || []).map(badge).join('');
  const abis = (plugin.abis || []).map(abi => badge('ABI ' + abi)).join('');
  card.innerHTML =
    `<summary>
       <span class="name">${{esc(plugin.name)}}</span>
       <span class="id">${{esc(plugin.id)}}</span>
       <span class="latest">${{esc(plugin.latest)}}</span>
     </summary>
     <p class="summary">${{esc(plugin.summary || '')}}</p>
     <div class="badges">${{abis}}${{tags}}</div>
     <div class="body"></div>`;
  card.addEventListener('toggle', () => {{ if (card.open) expand(card, plugin); }});
  return card;
}}

function apply() {{
  const query = q.value.trim().toLowerCase();
  const abi = Number(abiSelect.value || 0);
  const platform = platformSelect.value;
  let shown = 0;
  for (const card of grid.children) {{
    const plugin = card._plugin;
    const visible = matches(plugin, query) && (!abi || hostCompatible(plugin, abi, platform));
    card.style.display = visible ? '' : 'none';
    if (visible) shown += 1;
  }}
  count.textContent = `${{shown}} / ${{INDEX.plugins.length}} 个插件`;
}}

function fillSelects() {{
  const abis = new Set(), platforms = new Set();
  for (const plugin of INDEX.plugins) {{
    (plugin.abis || []).forEach(value => abis.add(value));
    Object.keys(plugin.platform_min_abi || {{}}).forEach(value => platforms.add(value));
  }}
  for (const abi of [...abis].sort((a, b) => b - a)) {{
    abiSelect.insertAdjacentHTML('beforeend', `<option value="${{abi}}">宿主 ABI：${{abi}}</option>`);
  }}
  for (const platform of [...platforms].sort()) {{
    platformSelect.insertAdjacentHTML('beforeend', `<option>${{platform}}</option>`);
  }}
  const guessed = [...abis].sort((a, b) => b - a)[0];
  if (guessed) abiSelect.value = String(guessed);
}}

function start() {{
  const fragment = decodeURIComponent(location.hash.replace(/^#/, ''));
  for (const plugin of INDEX.plugins) {{
    const card = pluginNode(plugin);
    card._plugin = plugin;
    grid.appendChild(card);
  }}
  fillSelects();
  q.addEventListener('input', apply);
  abiSelect.addEventListener('change', apply);
  platformSelect.addEventListener('change', apply);
  apply();
  if (fragment) {{
    const card = document.getElementById('p-' + fragment);
    if (card) {{ card.open = true; card.scrollIntoView(); }}
  }}
}}

start();
</script>
</body>
</html>
"""


def main() -> int:
    parser = argparse.ArgumentParser(description="把 index.json 渲染成静态插件目录页")
    parser.add_argument("--index", default="_site/index.json", help="schema 2 轻索引")
    parser.add_argument("--output", default="_site/index.html", help="输出 HTML")
    args = parser.parse_args()

    index_path = Path(args.index)
    index = json.loads(index_path.read_text(encoding="utf-8"))
    if index.get("schema") != 2:
        raise SystemExit(f"[ERR] {index_path} 不是 schema 2 索引，先跑 scripts/build_index.py")

    embedded = json.dumps(index, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
    html = PAGE.format(index_json=embedded)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(html, encoding="utf-8")
    print(f"[OK] 写出 {output}（{len(index['plugins'])} 个插件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
