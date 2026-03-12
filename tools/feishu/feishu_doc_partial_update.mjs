#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import {
  appendHeading,
  clearChildren,
  getTenantAccessToken,
  renderContent,
  resolveTargetBlockId,
  summarizeChildren,
} from './feishu_doc_ops.mjs';

function usage() {
  console.log(`Usage:
  node tools/feishu/feishu_doc_partial_update.mjs --spec=/absolute/path/to/spec.json

Spec format:
  {
    "docId": "docx_id",
    "operations": [
      {
        "type": "replace-children",
        "target": { "blockId": "..." },
        "content": [ ... ]
      },
      {
        "type": "append-subsections",
        "target": { "headingText": "5.3.7 聊天区与学员面板" },
        "sections": [
          {
            "title": "5.3.7.1 聊天区",
            "headingLevel": 3,
            "content": [ ... ]
          }
        ]
      }
    ]
  }
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }
  const specArg = argv.find((arg) => arg.startsWith('--spec='));
  if (!specArg) {
    usage();
    process.exit(1);
  }
  return {
    specPath: specArg.slice('--spec='.length),
  };
}

function loadSpec(specPath) {
  const fullPath = path.resolve(specPath);
  if (!fs.existsSync(fullPath)) {
    throw new Error(`Spec not found: ${fullPath}`);
  }
  const raw = fs.readFileSync(fullPath, 'utf8');
  const spec = JSON.parse(raw);
  if (!spec.docId) throw new Error('Spec missing docId');
  if (!Array.isArray(spec.operations) || spec.operations.length === 0) {
    throw new Error('Spec missing operations');
  }
  return { fullPath, spec };
}

async function executeReplaceChildren(token, docId, operation) {
  const targetBlockId = await resolveTargetBlockId(token, docId, operation.target);
  await clearChildren(token, docId, targetBlockId);
  await renderContent(token, docId, targetBlockId, operation.content || []);
  return {
    type: operation.type,
    targetBlockId,
    summary: await summarizeChildren(token, docId, targetBlockId),
  };
}

async function executeAppendSubsections(token, docId, operation) {
  const targetBlockId = await resolveTargetBlockId(token, docId, operation.target);
  const sectionReports = [];
  for (const section of operation.sections || []) {
    const headingId = await appendHeading(
      token,
      docId,
      targetBlockId,
      section.headingLevel || 3,
      section.title,
    );
    await renderContent(token, docId, headingId, section.content || []);
    sectionReports.push({
      title: section.title,
      headingId,
      summary: await summarizeChildren(token, docId, headingId),
    });
  }
  return {
    type: operation.type,
    targetBlockId,
    sections: sectionReports,
    summary: await summarizeChildren(token, docId, targetBlockId),
  };
}

async function main() {
  const { specPath } = parseArgs(process.argv.slice(2));
  const { fullPath, spec } = loadSpec(specPath);
  const token = await getTenantAccessToken();
  const results = [];

  for (const operation of spec.operations) {
    if (operation.type === 'replace-children') {
      results.push(await executeReplaceChildren(token, spec.docId, operation));
      continue;
    }
    if (operation.type === 'append-subsections') {
      results.push(await executeAppendSubsections(token, spec.docId, operation));
      continue;
    }
    throw new Error(`Unsupported operation type: ${operation.type}`);
  }

  console.log(JSON.stringify({
    specPath: fullPath,
    docId: spec.docId,
    url: `https://my.feishu.cn/docx/${spec.docId}`,
    results,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
