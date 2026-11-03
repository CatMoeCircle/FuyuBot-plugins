# 收录条目

一个插件一个 `<id>.yml`。`_` 开头的文件不参与构建（模板 / 草稿）。

字段说明看仓库根 README 的「收录一个插件」；最小形状：

```yaml
id: com.example.weather
name: Weather
repo: owner/repo
versions:
  - version: 1.2.0
    tag: v1.2.0
    assets:
      windows-x86_64: com.example.weather-1.2.0-windows-x86_64.zip
```
