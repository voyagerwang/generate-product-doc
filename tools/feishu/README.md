# Feishu Docx Partial Update Toolkit

用于飞书云文档的局部更新，不重写整篇文档。

目标：
1. 把已经验证稳定的飞书能力沉淀成通用基础设施。
2. 后续所有文档只做“定点替换/追加子章节/图片表格写入/回读校验”。
3. 多模块并行产出内容，落地阶段统一走同一条成熟链路。

## 环境变量

执行前需要设置：

```bash
export FEISHU_APP_ID=your_app_id
export FEISHU_APP_SECRET=your_app_secret
```

## 核心脚本

### 1. 检查文档标题树

```bash
node tools/feishu/feishu_doc_inspect.mjs --doc-id=<docx_id>
```

用途：
1. 列出文档内所有标题块
2. 返回 `blockId / level / text / path`
3. 后续局部更新优先复用已有 `blockId`

### 2. 执行局部更新

```bash
node tools/feishu/feishu_doc_partial_update.mjs --spec=/absolute/path/to/spec.json
```

支持的 operation：
1. `replace-children`
2. `append-subsections`

## Spec 结构

```json
{
  "docId": "docx_example_id",
  "operations": [
    {
      "type": "replace-children",
      "target": {
        "blockId": "doxcnZEffsEk5ukEEeZGCjHQaPg"
      },
      "content": [
        {
          "type": "image",
          "path": "/absolute/path/01_老师摄像头区.png"
        },
        {
          "type": "feature-table",
          "rows": []
        }
      ]
    },
    {
      "type": "append-subsections",
      "target": {
        "headingText": "5.3.7 聊天区与学员面板"
      },
      "sections": [
        {
          "title": "5.3.7.1 聊天区",
          "headingLevel": 3,
          "content": []
        }
      ]
    }
  ]
}
```

## Target 定位方式

支持三种：
1. `blockId`
2. `headingText`
3. `headingPath`

推荐顺序：
1. 已知 `blockId` 时优先用 `blockId`
2. 标题唯一时用 `headingText`
3. 标题不唯一时用 `headingPath`

`headingPath` 示例：

```json
{
  "headingPath": ["5.3 直播间", "5.3.7 聊天区与学员面板"]
}
```

## 支持的内容节点

1. `paragraph`
2. `heading`
3. `ordered-list`
4. `image`
5. `feature-table`
6. `simple-table`
7. `code`

## 当前边界

这套工具目前稳定覆盖：
1. 子块清空后重写
2. 追加子章节
3. 截图上传
4. 三列表格和普通表格
5. 回读子块摘要

暂不纳入通用能力：
1. 原地重命名标题块
2. 原位替换任意已有表格块
3. 任意已有复杂布局块的原位重排

这些属于“未知能力”，需要单独试探，不应拖慢普通局部补写任务。

补充说明：
1. 标题读写与检查已支持更深层级的飞书原生标题映射，可用于识别和写入四级及以上标题。
2. 当前不保证“已存在复杂标题树的原地升降级重排”，这类结构性调整仍建议先通过检查脚本确认后再执行。
