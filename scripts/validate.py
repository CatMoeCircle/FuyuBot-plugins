#!/usr/bin/env python3
"""校验 `plugins/*.yml`：下载 release 资产、验 zip/plugin.json/sha256，并试构建索引。

用法：
    python scripts/validate.py --all
    python scripts/validate.py plugins/com.example.weather.yml
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from registry import RegistryError, build_index, entry_paths, load_entry  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="校验 FuyuBot-plugins 收录条目")
    parser.add_argument(
        "paths",
        nargs="*",
        help="要校验的 YAML；不写 = 和 --all 一样",
    )
    parser.add_argument("--all", action="store_true", help="校验 plugins/*.yml（跳过 _ 开头）")
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    paths = entry_paths(root, args.paths)
    if not paths:
        print("没有收录条目（plugins/*.yml 为空）——初始仓库这是正常的")
        return 0

    try:
        entries = [load_entry(path) for path in paths]
        index = build_index(entries)
    except RegistryError as exc:
        print(f"[ERR] {exc}", file=sys.stderr)
        return 1

    for plugin in index["plugins"]:
        print(f"[OK] {plugin['id']} latest={plugin['latest']}")
        for version in plugin["versions"]:
            assets = ", ".join(
                f"{platform} ({asset['size'] // 1024}KB)"
                for platform, asset in version["assets"].items()
            )
            mark = " (yanked)" if version["yanked"] else ""
            print(f"    {version['version']}{mark}: {assets}")
    print(f"\n共 {len(index['plugins'])} 个插件、{len(paths)} 个条目通过校验")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
