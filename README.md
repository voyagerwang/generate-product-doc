# generate-product-doc

通用化产品文档生成技能公开版。

目标：
1. 让 `Codex`、`Claude Code` 用户可以安装成原生 skill。
2. 让 `Trae` 用户安装一套可直接复用的 prompt / rules 适配包。
3. 保留“从样本抽风格 -> 按原型与截图写正式 PRD -> 支持飞书或本地文档交付”的核心能力。
4. 删除所有私有资料、真实密钥、私有链接和本机路径依赖。

## 支持目标

1. `Codex`
2. `Claude Code`
3. `Trae`（适配包，不承诺与原生 skill 完全同构）

## 一键安装

默认自动检测本机常见目录并安装：

```bash
curl -fsSL https://raw.githubusercontent.com/voyagerwang/generate-product-doc/main/install.sh | bash
```

说明：
1. `Codex / Claude Code` 安装为原生 skill。
2. `Trae` 安装为适配包，脚本会复制 `prompt.txt` 与 `rules/` 到适配目录；后续是否自动生效取决于 Trae 版本与本地配置，必要时仍需手动接入自定义 Agent 或 Project Rules。
3. 安装时会自动创建 `~/.generate-product-doc/.env` 与 `~/.generate-product-doc/.env.example`，用于填写飞书配置。
4. 安装时会自动创建资料目录模板：`~/.generate-product-doc/project-docs-template/`，用于放样本文档、截图、原型和规则文件。

显式指定目标：

```bash
curl -fsSL https://raw.githubusercontent.com/voyagerwang/generate-product-doc/main/install.sh | bash -s -- --target codex
curl -fsSL https://raw.githubusercontent.com/voyagerwang/generate-product-doc/main/install.sh | bash -s -- --target claude
curl -fsSL https://raw.githubusercontent.com/voyagerwang/generate-product-doc/main/install.sh | bash -s -- --target trae
```

并行安装多个目标：

```bash
bash install.sh --target all
```

侧装测试，不覆盖现有同名技能：

```bash
bash install.sh --target codex --name generate-product-doc-public
```

## 安装结果

### Codex
安装到：

```text
$CODEX_HOME/skills/<skill-name>
# 或默认
~/.codex/skills/<skill-name>
```

### Claude Code
安装到：

```text
~/.claude/skills/<skill-name>
```

### Trae
安装到：

```text
~/.trae/adapters/<skill-name>
```

说明：
1. Trae 当前按“适配包”提供，不假设固定的原生 skill 标准。
2. 安装后建议优先将 `prompt.txt` 接入自定义 Agent 主提示词，再将 `rules/` 接入 Project Rules 或长期上下文。
3. 若当前 Trae 版本未自动发现适配目录，请手动导入上述文件。

## 飞书集成

仓库内附带通用飞书局部更新工具。

安装后会自动创建：

```bash
~/.generate-product-doc/.env
~/.generate-product-doc/.env.example
```

仓库根目录也提供 `.env.example` 作为模板参考。

编辑 `.env` 填入：

```env
FEISHU_APP_ID=your_app_id
FEISHU_APP_SECRET=your_app_secret
```

工具目录：

```text
tools/feishu/
```

能力包括：
1. 按 `docId` 检查标题树
2. 按 `blockId / headingText / headingPath` 定位章节
3. 局部替换子块
4. 追加子章节
5. 写图片、表格、代码块和有序列表
6. 写入后回读校验

飞书输出前置条件：
1. 用户明确选择输出到飞书文档。
2. 已提供飞书文档链接或 `docId`。
3. `.env` 中已配置 `FEISHU_APP_ID` 与 `FEISHU_APP_SECRET`。

若缺少飞书目标或飞书配置，技能应先提示补充，不应自动降级为 `md`。

## 仓库结构

```text
generate-product-doc/
├── README.md
├── install.sh
├── uninstall.sh
├── codex/
│   └── generate-product-doc/
├── claude-code/
│   └── generate-product-doc/
├── trae/
│   ├── prompt.txt
│   ├── README.md
│   └── rules/
├── prompts/
│   └── one-shot-prompt.txt
├── tools/
│   └── feishu/
└── scripts/
    └── check-sensitive.sh
```

## 使用方式

### Codex / Claude Code
安装后先确认输出目标：

1. 输出到飞书文档
2. 输出到本地 `docx`

常见用法：

```text
[$generate-product-doc] 读取 /path/to/project-docs，按目录中的样本风格输出完整 PRD 到飞书文档。
[$generate-product-doc] 读取 /path/to/project-docs，生成本地 docx 产品文档。
[$generate-product-doc] 基于现有飞书文档补写 5.3.6 老师摄像头区、5.3.7.1 聊天区、5.3.7.3 学员列表。
```

飞书模式缺少配置时，技能应引导用户编辑：

```text
~/.generate-product-doc/.env
```

资料目录建议结构：

```text
~/.generate-product-doc/project-docs-template/
├── examples/
├── screenshots/
├── prototype/
├── rules.md
├── glossary.md
└── scope.md
```

说明：
1. 你可以直接把资料放进 `~/.generate-product-doc/project-docs-template/`。
2. 也可以自己新建任意本地目录，只要保持同样结构即可。
3. 常见放法：
   - `examples/`：历史高质量 PRD、模块说明、风格样本
   - `screenshots/`：页面截图、弹窗截图、长图
   - `prototype/`：原型源码、入口 HTML、页面链接说明
   - `rules.md`：本次文档的硬约束
   - `glossary.md`：术语表
   - `scope.md`：本次覆盖页面范围

### Trae
将以下资源接入你的自定义 Agent：
1. `trae/prompt.txt`
2. `trae/rules/`
3. `prompts/one-shot-prompt.txt`

建议提示词：

```text
读取 /path/to/project-docs，先抽取样本文档风格，再按中后台 PRD 结构输出正式产品文档。先确认输出到飞书还是本地 docx；若选择飞书且缺少文档链接或 FEISHU_APP_ID / FEISHU_APP_SECRET，则先提示补充。
```

## 示例资产

已提供脱敏示例：
1. `shared/examples/function-list-example.md`
2. `shared/examples/element-logic-example.md`
3. `shared/examples/anti-patterns.md`

用于说明：
1. 功能清单的表格风格
2. 元素和逻辑说明的颗粒度
3. 复杂字段如何写清统计口径和判定规则
4. 常见错误写法及其修正方式

## 安全说明

本仓库不包含：
1. 真实飞书密钥
2. 私有飞书文档链接
3. 本机绝对路径
4. 私有业务原型和截图
5. 内部样例文档原文

发布前请运行：

```bash
bash scripts/check-sensitive.sh
```

## 当前边界

1. `Codex / Claude Code` 提供原生 skill 安装。
2. `Trae` 提供可安装适配包，不承诺和原生 skill 一样的自动触发机制。
3. 飞书局部更新工具已抽成通用基础设施，但不包含“原地重命名任意标题块”之类仍需单独探测的能力。
