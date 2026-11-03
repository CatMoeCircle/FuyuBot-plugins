"""FuyuBot-plugins 的公共逻辑：收录校验 + 索引构建。

契约（本仓之外）：
- `Fuyu-Bot/docs/plugin-format-v1.md`：bundle 目录与 `plugin.json`
- `Fuyu-Bot/docs/plugin-store-design.md`：索引、Release、zip 规范

这里只做「作者提交的 YAML → 校验 release 资产 → index.json」，
不实现插件运行时，也不改 bundle 契约。
"""

from __future__ import annotations

import hashlib
import io
import json
import os
import re
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path
from typing import Any

import yaml
from packaging.version import InvalidVersion, Version

# 与 TUI 商店/契约保持同一组限额。
MAX_ASSET_BYTES = 50 * 1024 * 1024
MAX_UNCOMPRESSED_BYTES = 200 * 1024 * 1024
MAX_FILES = 2000

ID_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$")
REPO_RE = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
VERSION_RE = re.compile(r"^[0-9A-Za-z.+-]+$")
PLATFORM_RE = re.compile(r"^[a-z0-9]+-[a-z0-9_]+$")
KINDS = {"native", "python", "js"}
RESERVED_NAMES = {
    "CON", "PRN", "AUX", "NUL",
    *(f"COM{i}" for i in range(1, 10)),
    *(f"LPT{i}" for i in range(1, 10)),
}
SKIP_TOP_DIRS = {"node_modules", ".venv", "target", ".git", "dist", "__pycache__"}


class RegistryError(Exception):
    """收录/构建失败；消息直接给人看。"""


def _request(url: str) -> urllib.request.Request:
    headers = {"User-Agent": "FuyuBot-plugins-ci"}
    token = os.environ.get("GITHUB_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    return urllib.request.Request(url, headers=headers)


def fetch(url: str, limit: int = MAX_ASSET_BYTES) -> bytes:
    try:
        with urllib.request.urlopen(_request(url), timeout=120) as response:
            data = response.read(limit + 1)
    except Exception as exc:  # noqa: BLE001 - 统一翻译成可读错误
        raise RegistryError(f"下载失败 {url}: {exc}") from exc
    if len(data) > limit:
        raise RegistryError(f"资产超过 {limit // 1024 // 1024}MB：{url}")
    return data


def asset_url(repo: str, tag: str, asset: str) -> str:
    return (
        f"https://github.com/{repo}/releases/download/"
        f"{urllib.parse.quote(tag, safe='')}/{urllib.parse.quote(asset, safe='')}"
    )


def _check_path_parts(name: str) -> list[str]:
    if "\\" in name:
        raise RegistryError(f"zip 条目含反斜杠：{name!r}")
    if name.startswith("/"):
        raise RegistryError(f"zip 条目是绝对路径：{name!r}")
    parts = [part for part in name.split("/") if part not in ("", ".")]
    for part in parts:
        if part == "..":
            raise RegistryError(f"zip 条目含 `..`：{name!r}")
        if ":" in part:
            raise RegistryError(f"zip 条目含 `:`（盘符 / NTFS 数据流）：{name!r}")
        if part != part.rstrip(". "):
            raise RegistryError(f"zip 条目以点/空格结尾（Windows 会改名）：{name!r}")
        if part.split(".")[0].upper() in RESERVED_NAMES:
            raise RegistryError(f"zip 条目是 Windows 保留名：{name!r}")
    return parts


def inspect_zip(
    data: bytes,
    *,
    expected_id: str,
    expected_version: str,
    platform: str,
    name: str = "",
) -> dict[str, Any]:
    """校验一个插件包，返回 manifest 里对索引有用的字段。"""
    try:
        archive = zipfile.ZipFile(io.BytesIO(data))
    except zipfile.BadZipFile as exc:
        raise RegistryError(f"{name or expected_id}: 不是合法 zip（{exc}）") from exc

    infos = archive.infolist()
    if len(infos) > MAX_FILES * 2:
        raise RegistryError(f"{name or expected_id}: 条目数 {len(infos)} 超过上限")

    files: dict[str, zipfile.ZipInfo] = {}
    seen: set[str] = set()
    total = 0
    for info in infos:
        parts = _check_path_parts(info.filename)
        if not parts:
            continue
        key = "/".join(part.lower() for part in parts)
        if key in seen:
            raise RegistryError(f"{name or expected_id}: 条目只差大小写/分隔符：{info.filename!r}")
        seen.add(key)

        mode = (info.external_attr >> 16) & 0o170000
        if mode == 0o120000:
            raise RegistryError(f"{name or expected_id}: 不允许符号链接：{info.filename!r}")
        if info.is_dir():
            continue
        if parts[0] in SKIP_TOP_DIRS:
            raise RegistryError(f"{name or expected_id}: 包内不允许 {parts[0]}/")
        total += info.file_size
        if total > MAX_UNCOMPRESSED_BYTES:
            raise RegistryError(f"{name or expected_id}: 解压后超过 200MB")
        if len(files) >= MAX_FILES:
            raise RegistryError(f"{name or expected_id}: 文件数超过 {MAX_FILES}")
        files["/".join(parts)] = info

    raw = files.get("plugin.json")
    if raw is None:
        raise RegistryError(f"{name or expected_id}: zip 根上没有 plugin.json")
    if raw.file_size > 1024 * 1024:
        raise RegistryError(f"{name or expected_id}: plugin.json 过大")
    try:
        manifest = json.loads(archive.read(raw))
    except (KeyError, json.JSONDecodeError) as exc:
        raise RegistryError(f"{name or expected_id}: plugin.json 不是合法 JSON（{exc}）") from exc
    if not isinstance(manifest, dict):
        raise RegistryError(f"{name or expected_id}: plugin.json 顶层必须是对象")
    if manifest.get("schema") != 1:
        raise RegistryError(f"{name or expected_id}: schema 必须是 1")
    if manifest.get("id") != expected_id:
        raise RegistryError(
            f"{name or expected_id}: plugin.json 的 id 是 {manifest.get('id')!r}，与收录条目不一致"
        )
    if manifest.get("version") != expected_version:
        raise RegistryError(
            f"{name or expected_id}: plugin.json 的 version 是 {manifest.get('version')!r}，"
            f"与版本 {expected_version} 不一致"
        )
    kind = manifest.get("kind")
    if kind not in KINDS:
        raise RegistryError(f"{name or expected_id}: kind 必须是 native/python/js")
    entry = manifest.get("entry")
    if not isinstance(entry, str) or not entry:
        raise RegistryError(f"{name or expected_id}: 缺 entry")
    entry_parts = _check_path_parts(entry)
    entry_key = "/".join(entry_parts)
    if entry_key not in files:
        raise RegistryError(f"{name or expected_id}: entry 指向的文件不在包里：{entry}")
    platforms = manifest.get("platforms") or []
    if not isinstance(platforms, list) or any(not isinstance(item, str) for item in platforms):
        raise RegistryError(f"{name or expected_id}: platforms 必须是字符串数组")
    if platform != "any" and platforms and "any" not in platforms and platform not in platforms:
        raise RegistryError(
            f"{name or expected_id}: platforms {platforms} 不包含资产平台 {platform}"
        )
    abi = manifest.get("abi")
    if abi is not None and not isinstance(abi, int):
        raise RegistryError(f"{name or expected_id}: abi 必须是整数")
    depends = manifest.get("depends") or []
    if not isinstance(depends, list) or any(not isinstance(item, str) for item in depends):
        raise RegistryError(f"{name or expected_id}: depends 必须是字符串数组")
    return {"abi": abi, "depends": depends}


def load_entry(path: Path) -> dict[str, Any]:
    try:
        raw = yaml.safe_load(path.read_text(encoding="utf-8"))
    except (OSError, yaml.YAMLError) as exc:
        raise RegistryError(f"{path}: 读不了/解析不了 YAML（{exc}）") from exc
    if not isinstance(raw, dict):
        raise RegistryError(f"{path}: 顶层必须是对象")

    entry_id = raw.get("id")
    if not isinstance(entry_id, str) or not ID_RE.match(entry_id):
        raise RegistryError(f"{path}: id 不合法（{entry_id!r}）")
    repo = raw.get("repo")
    if not isinstance(repo, str) or not REPO_RE.match(repo):
        raise RegistryError(f"{path}: repo 要写成 owner/repo（{repo!r}）")
    versions = raw.get("versions")
    if not isinstance(versions, list) or not versions:
        raise RegistryError(f"{path}: versions 不能为空")

    seen_versions: set[str] = set()
    inspected: list[dict[str, Any]] = []
    for item in versions:
        if not isinstance(item, dict):
            raise RegistryError(f"{path}: versions 里每项必须是对象")
        version = item.get("version")
        if not isinstance(version, str) or not VERSION_RE.match(version):
            raise RegistryError(f"{path}: 版本号不合法（{version!r}）")
        if version in seen_versions:
            raise RegistryError(f"{path}: 版本 {version} 重复")
        seen_versions.add(version)
        try:
            Version(version)
        except InvalidVersion as exc:
            raise RegistryError(f"{path}: 版本 {version!r} 不是 semver（{exc}）") from exc
        tag = item.get("tag")
        if tag != f"v{version}":
            raise RegistryError(f"{path}: tag 必须是 v{version}（当前 {tag!r}）")
        assets = item.get("assets")
        if not isinstance(assets, dict) or not assets:
            raise RegistryError(f"{path}: {version} 的 assets 不能为空")

        checked_assets: dict[str, dict[str, Any]] = {}
        for platform, asset_name in assets.items():
            if platform != "any" and not PLATFORM_RE.match(str(platform)):
                raise RegistryError(f"{path}: 平台键不合法（{platform!r}）")
            if not isinstance(asset_name, str) or not asset_name or "/" in asset_name:
                raise RegistryError(f"{path}: 资产名必须是文件名（{asset_name!r}）")
            url = asset_url(repo, tag, asset_name)
            data = fetch(url)
            manifest = inspect_zip(
                data,
                expected_id=entry_id,
                expected_version=version,
                platform=platform,
                name=f"{entry_id} {version} {platform}",
            )
            checked_assets[platform] = {
                "url": url,
                "sha256": hashlib.sha256(data).hexdigest(),
                "size": len(data),
                "_abi": manifest["abi"],
                "_depends": manifest["depends"],
            }
        inspected.append(
            {
                "version": version,
                "yanked": bool(item.get("yanked", False)),
                "assets": checked_assets,
            }
        )

    return {
        "id": entry_id,
        "name": str(raw.get("name") or entry_id),
        "summary": str(raw.get("summary") or ""),
        "description": str(raw.get("description") or ""),
        "repo": repo,
        "license": str(raw.get("license") or ""),
        "homepage": str(raw.get("homepage") or ""),
        "tags": [str(tag) for tag in (raw.get("tags") or [])],
        "api": raw.get("api"),
        "abi": raw.get("abi"),
        "depends": [str(dep) for dep in (raw.get("depends") or [])],
        "versions": inspected,
    }


def build_index(entries: list[dict[str, Any]]) -> dict[str, Any]:
    by_id: dict[str, dict[str, Any]] = {}
    for entry in entries:
        if entry["id"] in by_id:
            raise RegistryError(f"id 重复：{entry['id']}")
        by_id[entry["id"]] = entry

    plugins: list[dict[str, Any]] = []
    for entry_id in sorted(by_id):
        entry = by_id[entry_id]
        versions = sorted(
            entry["versions"],
            key=lambda item: Version(item["version"]),
            reverse=True,
        )
        usable = [item for item in versions if not item["yanked"]]
        if not usable:
            raise RegistryError(f"{entry_id}: 所有版本都被 yanked，至少留一个可用版本")
        latest = usable[0]["version"]

        # 版本级 abi/depends 优先用包内 manifest；没有就退回条目级。
        version_rows = []
        for item in versions:
            assets = {}
            abi = entry.get("abi")
            depends = entry.get("depends") or []
            for platform, asset in item["assets"].items():
                assets[platform] = {
                    "url": asset["url"],
                    "sha256": asset["sha256"],
                    "size": asset["size"],
                }
                if asset["_abi"] is not None:
                    abi = asset["_abi"]
                if asset["_depends"]:
                    depends = asset["_depends"]
            row = {
                "version": item["version"],
                "depends": depends,
                "yanked": item["yanked"],
                "assets": assets,
            }
            if entry.get("api"):
                row["api"] = entry["api"]
            if abi is not None:
                row["abi"] = abi
            version_rows.append(row)

        plugin: dict[str, Any] = {
            "id": entry_id,
            "name": entry["name"],
            "summary": entry["summary"],
            "repo": entry["repo"],
            "latest": latest,
            "versions": version_rows,
        }
        for key in ("description", "license", "homepage"):
            if entry[key]:
                plugin[key] = entry[key]
        if entry["tags"]:
            plugin["tags"] = entry["tags"]
        plugins.append(plugin)

    return {"schema": 1, "plugins": plugins}


def entry_paths(root: Path, explicit: list[str]) -> list[Path]:
    if explicit:
        return [Path(item) for item in explicit]
    plugins_dir = root / "plugins"
    if not plugins_dir.is_dir():
        return []
    return sorted(
        path
        for path in plugins_dir.glob("*.yml")
        if not path.name.startswith("_")
    )
