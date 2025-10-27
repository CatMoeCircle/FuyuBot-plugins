const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const pluginsJsonPath = path.join(repoRoot, 'plugins.json');
const readmePath = path.join(repoRoot, 'README.md');

function loadPlugins() {
  const raw = fs.readFileSync(pluginsJsonPath, 'utf8');
  return JSON.parse(raw);
}

function generateTable(plugins) {
  const header = `### 插件索引（由 plugins.json 同步）\n\n| 插件名称 | 版本 | 描述 | 作者 | 查看源码 | 权限 | 运行环境 |\n| :--- | :---: | --- | --- | :---: | :---: | :---: |\n`;
  const rows = plugins.map(p => {
    const name = p.name || '';
    const version = p.version || '';
    const desc = p.description || '';
    const author = p.author || '';
    const github = p.github || '';

    // 权限与运行环境，缺省为 all
    const permission = p.permission || 'all';
    const scope = p.scope || p.environment || 'all';

    // 生成内嵌的查看源码链接（若无 github 字段则为空）
    const viewLink = github ? `[查看源码](${github})` : '';

    return `| ${name} | ${version} | ${desc} | ${author} | ${viewLink} | ${permission} | ${scope} |`;
  }).join('\n');

  return header + rows + '\n\n> 注：此表格由 `plugins.json` 同步生成，列出了插件名称、版本、描述、作者、查看源码链接、权限（owner/admin/all）与运行环境（all/private/group/channel）。若未在 `plugins.json` 指定权限或运行环境，默认值为 `all`。\n';
}

function replaceSection(readme, newSection) {
  // 寻找以前的同步节的开始（标题）
  const startMarker = '### 插件索引（由 plugins.json 同步）';
  if (readme.includes(startMarker)) {
    const idx = readme.indexOf(startMarker);
    // 从 idx 到文件末尾替换（简单策略：覆盖已存在的同步块）
    const before = readme.slice(0, idx);
    return before + newSection;
  }
  // 如果没有找到 marker，则尝试在文件中找到原始插件索引标题并替换整个文件开头部分
  const oldHeader = '### 插件索引';
  if (readme.includes(oldHeader)) {
    const idx = readme.indexOf(oldHeader);
    const before = readme.slice(0, idx);
    return before + newSection;
  }
  // 否则，附加到文件末尾
  return readme + '\n' + newSection;
}

function main() {
  if (!fs.existsSync(pluginsJsonPath)) {
    console.error('plugins.json not found');
    process.exit(2);
  }
  const plugins = loadPlugins();
  const newSection = generateTable(plugins);

  let readme = '';
  if (fs.existsSync(readmePath)) {
    readme = fs.readFileSync(readmePath, 'utf8');
  } else {
    readme = '# FuyuBot-plugins\n\n';
  }

  const updated = replaceSection(readme, newSection);

  if (updated !== readme) {
    fs.writeFileSync(readmePath, updated, 'utf8');
    console.log('README.md updated');
    process.exit(0);
  } else {
    console.log('No changes');
    process.exit(0);
  }
}

if (require.main === module) main();
