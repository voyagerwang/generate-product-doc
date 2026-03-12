# Trae Adapter

这是 `generate-product-doc-2` 的 Trae 适配包。

说明：
1. Trae 当前未按本仓库假设原生支持 `SKILL.md`。
2. 因此这里提供的是一套可直接复用的 prompt / rules 资源。
3. 安装脚本会把它复制到 `~/.trae/adapters/<skill-name>`。
4. 是否可被 Trae 自动识别，取决于具体版本与本地配置；若未自动生效，需要手动导入。

建议接入方式：
1. 将 `prompt.txt` 作为自定义 Agent 的主提示词。
2. 将 `rules/` 下的内容作为项目规则或长期上下文。
3. 若 Trae 未自动发现适配目录，手动复制 `prompt.txt` 与 `rules/` 到你正在使用的 Agent / Project Rules 配置入口。
4. 需要写飞书文档时，额外配置环境变量：
   - `FEISHU_APP_ID`
   - `FEISHU_APP_SECRET`
