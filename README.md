# FuyuBot-plugins

FuyuBot 的**插件商城索引**：收录条目在这里以 PR 提交，CI 下载对应 GitHub Release
资产、按 bundle 契约校验，然后生成 **schema 2 索引**（轻列表 + 每插件明细分片）
和一个人类可读的目录页，一起发布到 GitHub Pages。

- 索引：<https://catmoecircle.github.io/FuyuBot-plugins/index.json>
- 目录页：<https://catmoecircle.github.io/FuyuBot-plugins/>
- 索引 schema：[`schema.json`](schema.json)
- 插件格式契约（文档站）：
  - [插件分发格式 v1](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/bundle/)
  - [插件商店与分发](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/store/)
  - [插件迁移](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/migration/)

本仓**不是**运行时，也不实现商店客户端；商店客户端在 `Fuyu-Bot` 内，
只读这里的 `index.json` 与按需拉取的分片。

## 用起来

在 `fuyubot.toml` 里：

```toml
[plugins]
registry_url = "https://catmoecircle.github.io/FuyuBot-plugins/index.json"
```

然后打开机器人的插件商店页：搜索、看详情、装**当前宿主 ABI 能跑的最新版本**、
按 `v` 选历史版本、按 `b` 回滚上一次换版本。

## 索引长什么样（schema 2）

主文件只放列表需要的字段，几百字节一条；描述、版本表、每平台资产在
`plugins/<id>.json`，选中时才拉：

```json
{
  "schema": 2,
  "plugins": [
    {
      "id": "fuyubot.help",
      "name": "Help (Image)",
      "summary": "命令表按插件分组渲染成图片",
      "latest": "0.1.1",
      "detail": "plugins/fuyubot.help.json",
      "repo": "xiaoqvan/fuyubot-plugins",
      "tags": ["help", "image"],
      "abis": [6],
      "platform_min_abi": {
        "windows-x86_64": 5,
        "linux-x86_64": 5,
        "any": 5
      }
    }
  ]
}
```

分片：

```json
{
  "schema": 2,
  "plugin": {
    "id": "fuyubot.help",
    "name": "Help (Image)",
    "latest": "0.1.1",
    "versions": [
      {
        "version": "0.1.1",
        "abi": 6,
        "depends": [],
        "yanked": false,
        "assets": {
          "windows-x86_64": { "url": "https://…", "sha256": "…", "size": 123456 }
        }
      }
    ]
  }
}
```

约定：

- `versions` **按版本号升序**。商店从后往前找「最新的可用版本」；
- `detail` 相对索引地址解析，协议固定为 `plugins/<id>.json`；
- `abis` 是给目录页筛选用摘要（非 yanked 版本出现过的 ABI）；
- `platform_min_abi` 是「平台 → 该平台可用版本里最低的 ABI」（`0` = 版本没声明 ABI）：
  商店拿它和本机 ABI / 平台比，**不兼容的插件直接不显示**；客户端拉不到摘要时宁多勿漏；
- 旧客户端只认 schema 1；schema 2 需要带分片支持的宿主（本次改动之后的版本）。

## 收录一个插件

1. 在插件仓库打 tag（单插件仓用 `v<版本>`，例如 `v1.2.0`；一个仓库多个插件时用
   `<id>-v<版本>`，例如 `whois-v0.1.0`），上传按契约打的 zip：
   - 资产名：`<id>-<version>-<os>-<arch>.zip`，纯脚本用 `-any.zip`；
   - **zip 根就是插件目录内容**（`plugin.json` 在根，不套一层）；
   - `plugin.json` 的 `id` / `version` 必须和收录条目 / tag 一致；
   - 不带 `node_modules/`、`.venv/`、`target/`、`.git/`，不带符号链接。
2. 复制 [`plugins/_template.yml`](plugins/_template.yml) 为 `plugins/<id>.yml`，填：
   - `id`、`name`、`summary`、`repo`（`owner/repo`）、`versions`；
   - 每个版本写 `version`、`tag`（与上一步的 tag 一致）、`assets: {平台: 资产文件名}`。
3. 开 PR。CI 会下载资产、验 zip / `plugin.json` / sha256 / 平台 / 入口，并试构建索引。
4. 合并到 `main` 后，`publish-index` 重新生成 `index.json` + 分片 + 目录页并部署 Pages。

平台键用 `windows-x86_64` / `linux-x86_64` / `macos-aarch64` 这些（与发布资产命名一致）；
纯脚本包用 `any`。

### 多版本与 ABI

每个版本都可以带自己的 `abi`（真值来自包内 `plugin.json`，CI 会覆盖条目级的值）。
商店选版本的规则是：

1. `latest` 未下架、ABI ≤ 宿主、且有本平台包 → 用它；
2. 否则按 `versions` 倒序找第一个满足同样条件的版本；
3. 都不满足就给原因：需要升级宿主 / 没有本平台包 / 全被下架。

所以**低版本宿主不会被迫装高 ABI 的新版本**，而是自动回退到仍兼容的最新小版本；
用户也可以在商店里按 `v` 明确选一个历史版本。

## 本地校验

```bash
pip install -r scripts/requirements.txt
python scripts/validate.py --all          # 下载 + 校验所有条目
python scripts/build_index.py --output _site/index.json --shards _site/plugins
python scripts/build_site.py --index _site/index.json --output _site/index.html
cp _site/index.json index.json            # 想让仓库里的索引也更新时
```

> 下载走 GitHub Release 公共资产；如果触发限流，设置 `GITHUB_TOKEN` 环境变量。

## 下架 / 撤版

- 撤某个版本：在该版本加 `yanked: true`（保留审计痕迹），商店不会再选它。
- 整个插件下架：删掉 `plugins/<id>.yml`，PR 合并后索引重建。

## 信任边界

- CI 只做**契约校验 + sha256**，不做代码审计，也不代表背书；
- `index.json` 与分片由本仓 CI 生成、Pages 发布，商店只信这一份索引；
- 签名（minisign / 索引签名）属于 P1，目前没有。

## 目录

```text
plugins/             # 收录条目（一个插件一个 YAML；_ 开头不参与构建）
scripts/             # 校验、索引构建、目录页生成（Python）
schema.json          # index.json / 分片 的 JSON Schema
index.json           # 本地构建产物；Pages 上是 CI 生成的版本
.github/workflows/   # PR 校验 / main 发布
```
