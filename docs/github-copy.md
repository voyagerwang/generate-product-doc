# GitHub 发布文案

## 仓库简介（About）

通用化产品文档生成技能，支持从样本抽风格、按原型与截图生成正式 PRD，并可写入飞书或本地 docx。适配 Codex、Claude Code 与 Trae。

## 仓库描述（Description）

Generate implementation-ready PRDs from examples, screenshots, and prototypes. Supports Codex, Claude Code, Trae, Feishu docs, and local docx output.

## Topics 建议

```text
prd
product-doc
product-management
codex
claude-code
trae
feishu
lark
prompt-engineering
skill
```

## 首发说明（Release Notes）

### v0.1.0

公开版首发，包含：
1. `Codex / Claude Code` 原生 skill 安装。
2. `Trae` 适配包安装。
3. 通用化 PRD 生成规则，支持从资料目录抽取写作风格。
4. 默认输出正式文档，可写飞书或本地 `docx`。
5. 飞书局部更新工具，支持章节定位、子块替换、图片/表格写入和回读校验。

适用场景：
1. 从空白目录起稿 PRD。
2. 基于原型图和截图补写功能详细说明。
3. 对现有飞书文档做局部补写或结构化更新。

当前边界：
1. `Trae` 通过 adapter 接入，不承诺与原生 skill 完全同构。
2. 飞书工具以稳定的局部更新链路为主，不覆盖所有复杂块原位重排场景。

## 对外发布短文案

一个面向中后台场景的 PRD 生成技能。它不是简单复述页面，而是按“元素定义 + 业务逻辑 + 异常规则 + 状态流转”的方式输出可直接给研发落地的产品文档。支持 Codex、Claude Code、Trae，支持飞书云文档和本地 docx。
