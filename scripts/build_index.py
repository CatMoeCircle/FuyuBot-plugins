#!/usr/bin/env python3
"""从 `plugins/*.yml` 构建 `index.json`（TUI 商店消费的静态索引）。

用法：
    python scripts/build_index.py --output _site/index.json
    python scripts/build_index.py --check        # 与仓库里的 index.json 比对
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from registry import RegistryError, build_index, entry_paths, load_entry  # noqa: E402


def main() -> int:
    parser = argparse.ArgumentParser(description="构建 FuyuBot-plugins 的 index.json")
    parser.add_argument("--output", default="index.json", help="输出路径（默认 index.json）")
    parser.add_argument(
        "--check",
        action="store_true",
        help="不写文件，只和 --output 现有内容比对（CI 用）",
    )
    args = parser.parse_args()

    root = Path(__file__).resolve().parent.parent
    paths = entry_paths(root, [])
    try:
        entries = [load_entry(path) for path in paths]
        index = build_index(entries)
    except RegistryError as exc:
        print(f"[ERR] {exc}", file=sys.stderr)
        return 1

    text = json.dumps(index, ensure_ascii=False, indent=2) + "\n"
    output = Path(args.output)
    if args.check:
        if not output.is_file():
            print(f"[ERR] {output} 不存在", file=sys.stderr)
            return 1
        if output.read_text(encoding="utf-8") != text:
            print(
                f"[ERR] {output} 与插件条目不一致：跑 `python scripts/build_index.py` 重新生成",
                file=sys.stderr,
            )
            return 1
        print(f"[OK] {output} 是最新的（{len(index['plugins'])} 个插件）")
        return 0

    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(text, encoding="utf-8")
    print(f"[OK] 写出 {output}（{len(index['plugins'])} 个插件）")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
