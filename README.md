# FuyuBot-plugins

FuyuBot 的**插件商城索引**：收录条目在这里以 PR 提交，CI 下载对应 GitHub Release
资产、按 bundle 契约校验，然后生成 `index.json` 发布到 GitHub Pages。

- 索引地址：<https://catmoecircle.github.io/FuyuBot-plugins/index.json>
- 索引 schema：[`schema.json`](schema.json)
- 插件格式契约（文档站）：
  - [插件分发格式 v1](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/bundle/)
  - [插件商店与分发](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/store/)
  - [插件迁移](https://catmoecircle.github.io/FuyuBot-docs/docs/plugin/migration/)

本仓**不是**运行时，也不实现商店客户端；商店客户端在 `Fuyu-Bot` 内，
只读这里的 `index.json`。

## 用起来

在 `fuyubot.toml` 里：

```toml
[plugins]
registry_url = "https://catmoecircle.github.io/FuyuBot-plugins/index.json"
```

然后打开机器人的插件商店页：搜索、看详情、安装、卸载。

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
4. 合并到 `main` 后，`publish-index` 重新生成 `index.json` 并部署 Pages。

平台键用 `windows-x86_64` / `linux-x86_64` / `macos-aarch64` 这些（与发布资产命名一致）；
纯脚本包用 `any`。

## 本地校验

```bash
pip install -r scripts/requirements.txt
python scripts/validate.py --all          # 下载 + 校验所有条目
python scripts/build_index.py --output /tmp/index.json
```

> 下载走 GitHub Release 公共资产；如果触发限流，设置 `GITHUB_TOKEN` 环境变量。

## 下架 / 撤版

- 撤某个版本：在该版本加 `yanked: true`（保留审计痕迹），商店不会再选它。
- 整个插件下架：删掉 `plugins/<id>.yml`，PR 合并后索引重建。

## 信任边界

- CI 只做**契约校验 + sha256**，不做代码审计，也不代表背书；
- `index.json` 由本仓 CI 生成、Pages 发布，商店只信这一份索引；
- 签名（minisign / 索引签名）属于 P1，目前没有。

## 目录

```text
plugins/             # 收录条目（一个插件一个 YAML；_ 开头不参与构建）
scripts/             # 校验与索引构建（Python）
schema.json          # index.json 的 JSON Schema
index.json           # 本地构建产物；Pages 上是 CI 生成的版本
.github/workflows/   # PR 校验 / main 发布
```
