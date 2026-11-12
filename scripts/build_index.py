#!/usr/bin/env python3
"""从 `plugins/*.yml` 构建商店索引（schema 2：轻索引 + 每插件明细分片）。

用法：
    python scripts/build_index.py --output _site/index.json --shards _site/plugins
    python scripts/build_index.py --check --output index.json

`index.json` 只放列表字段（id / name / summary / tags / latest / detail），
描述与版本表写到 `plugins/<id>.json`——主文件不再随版本数膨胀。
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from registry import (  # noqa: E402
    RegistryError,
    build_index,
    build_shards,
    entry_paths,
    load_entry,
)


def dumps(value: object) -> str:
    return json.dumps(value, ensure_ascii=False, indent=2) + "\n"


def main() -> int:
    parser = argparse.ArgumentParser(description="构建 FuyuBot-plugins 的 index.json 与明细分片")
    parser.add_argument("--output", default="index.json", help="索引输出路径（默认 index.json）")
    parser.add_argument(
        "--shards",
        default=None,
        help="明细分片目录（默认：索引同目录下的 plugins/）",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="不写文件，只和现有索引比对（CI 用）",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    paths = entry_paths(root, [])
    try:
        entries = [load_entry(path) for path in paths]
        index = build_index(entries)
        shards = build_shards(entries)
    except RegistryError as exc:
        print(f"[ERR] {exc}", file=sys.stderr)
        return 1

    output = Path(args.output)
    shards_dir = Path(args.shards) if args.shards else output.parent / "plugins"

    if args.check:
        expected = dumps(index)
        if not output.is_file():
            print(f"[ERR] {output} 不存在", file=sys.stderr)
            return 1
        if output.read_text(encoding="utf-8") != expected:
            print(
                f"[ERR] {output} 与插件条目不一致：跑 `python scripts/build_index.py` 重新生成",
                file=sys.stderr,
            )
            return 1
        if not shards_dir.is_dir():
            print(
                f"[WARN] {shards_dir} 不存在：只校验了索引（分片只出现在发布产物里）",
                file=sys.stderr,
            )
            print(f"[OK] {output} 是最新的（{len(index['plugins'])} 个插件）")
            return 0
        for entry_id, shard in shards.items():
            path = shards_dir / f"{entry_id}.json"
            if not path.is_file() or path.read_text(encoding="utf-8") != dumps(shard):
                print(
                    f"[ERR] {path} 与插件条目不一致：重新生成",
                    file=sys.stderr,
                )
                return 1
        print(f"[OK] {output} 与 {len(shards)} 个分片都是最新的（{len(index['plugins'])} 个插件）")
        return 0
    output.parent.mkdir(parents=True, exist_ok=True)
    # 默认分片目录是 `output.parent/plugins`；如果那正是源码目录（有 *.yml），
    # 就别把生成的 JSON 混进收录条目里，逼调用方显式指定 `_site/plugins`。
    if args.shards is None and any(shards_dir.glob("*.yml")):
        print(
            f"[ERR] {shards_dir} 是源码目录：请显式传 --shards（例如 _site/plugins）",
            file=sys.stderr,
        )
        return 1
    output.write_text(dumps(index), encoding="utf-8")
    shards_dir.mkdir(parents=True, exist_ok=True)
    for entry_id, shard in shards.items():
        (shards_dir / f"{entry_id}.json").write_text(dumps(shard), encoding="utf-8")
    print(
        f"[OK] 写出 {output}（{len(index['plugins'])} 个插件）"
        f" + {shards_dir}（{len(shards)} 个分片）"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
