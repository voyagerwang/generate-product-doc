#!/usr/bin/env node

import { getTenantAccessToken, listHeadings } from './feishu_doc_ops.mjs';

function usage() {
  console.log(`Usage:
  node tools/feishu/feishu_doc_inspect.mjs --doc-id=<docx_id>
`);
}

function parseArgs(argv) {
  if (argv.includes('--help') || argv.includes('-h')) {
    usage();
    process.exit(0);
  }
  const docArg = argv.find((arg) => arg.startsWith('--doc-id='));
  if (!docArg) {
    usage();
    process.exit(1);
  }
  return {
    docId: docArg.slice('--doc-id='.length),
  };
}

async function main() {
  const { docId } = parseArgs(process.argv.slice(2));
  const token = await getTenantAccessToken();
  const headings = await listHeadings(token, docId);
  console.log(JSON.stringify({
    docId,
    url: `https://my.feishu.cn/docx/${docId}`,
    headings,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
