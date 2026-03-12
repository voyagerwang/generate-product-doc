#!/usr/bin/env node

import fs from 'node:fs';

export const API_BASE = 'https://open.feishu.cn/open-apis';
const FETCH_TIMEOUT_MS = 30000;
const RETRYABLE_CODES = new Set([99991400, 99991401, 99991663]);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export async function feishuRequest({ method, url, token, body }) {
  const maxRetry = 10;
  for (let attempt = 1; attempt <= maxRetry; attempt += 1) {
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    if (body && !(body instanceof FormData)) {
      headers['Content-Type'] = 'application/json; charset=utf-8';
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : undefined,
        signal: controller.signal,
      });
      const text = await res.text();
      let json;
      try {
        json = JSON.parse(text);
      } catch {
        json = { code: -1, msg: text };
      }

      if (res.ok && json?.code === 0) return json;

      const retryable = res.status === 429
        || RETRYABLE_CODES.has(json?.code)
        || (res.status >= 500 && res.status < 600);
      if (retryable && attempt < maxRetry) {
        await sleep(900 * Math.min(attempt, 8) + Math.floor(Math.random() * 300));
        continue;
      }
      throw new Error(
        `Feishu API failed: ${method} ${url} => status=${res.status}, code=${json?.code}, msg=${json?.msg || 'unknown'}`,
      );
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(`Feishu API retry exhausted: ${method} ${url}`);
}

export async function getTenantAccessToken() {
  const appId = requireEnv('FEISHU_APP_ID');
  const appSecret = requireEnv('FEISHU_APP_SECRET');
  const json = await feishuRequest({
    method: 'POST',
    url: `${API_BASE}/auth/v3/tenant_access_token/internal`,
    body: { app_id: appId, app_secret: appSecret },
  });
  return json.tenant_access_token;
}

export async function getBlock(token, documentId, blockId) {
  const json = await feishuRequest({
    method: 'GET',
    url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${blockId}`,
    token,
  });
  return json?.data?.block;
}

export async function getChildren(token, documentId, parentBlockId, pageSize = 500) {
  const items = [];
  let pageToken = '';
  while (true) {
    const json = await feishuRequest({
      method: 'GET',
      url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${parentBlockId}/children?page_size=${pageSize}${pageToken ? `&page_token=${pageToken}` : ''}`,
      token,
    });
    items.push(...(json?.data?.items || []));
    if (!json?.data?.has_more) break;
    pageToken = json.data.page_token;
  }
  return items;
}

export async function createChildren(token, documentId, parentBlockId, children) {
  await sleep(150);
  const json = await feishuRequest({
    method: 'POST',
    url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${parentBlockId}/children`,
    token,
    body: { children },
  });
  return json?.data?.children || [];
}

export async function deleteRange(token, documentId, parentBlockId, startIndex, endIndex) {
  if (endIndex <= startIndex) return;
  await feishuRequest({
    method: 'DELETE',
    url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/${parentBlockId}/children/batch_delete`,
    token,
    body: { start_index: startIndex, end_index: endIndex },
  });
}

export async function clearChildren(token, documentId, parentBlockId) {
  while (true) {
    const items = await getChildren(token, documentId, parentBlockId);
    if (!items.length) return;
    await deleteRange(token, documentId, parentBlockId, 0, Math.min(items.length, 100));
    await sleep(200);
  }
}

export function textRun(content, bold = false) {
  if (!bold) return [{ text_run: { content } }];
  return [{ text_run: { content, text_element_style: { bold: true } } }];
}

export function paragraphBlock(content, bold = false) {
  return { block_type: 2, text: { elements: textRun(content, bold) } };
}

export function headingBlock(level, content) {
  if (!Number.isInteger(level) || level < 1 || level > 9) {
    throw new Error(`Unsupported heading level: ${level}`);
  }
  const blockType = level + 2;
  const key = `heading${level}`;
  return { block_type: blockType, [key]: { elements: textRun(content) } };
}

export function orderedBlock(content) {
  return { block_type: 13, ordered: { elements: textRun(content) } };
}

export function codeBlock(content) {
  return {
    block_type: 14,
    code: {
      style: { language: 1, wrap: true },
      elements: [{ text_run: { content } }],
    },
  };
}

export async function appendParagraph(token, documentId, parentBlockId, text, bold = false) {
  const [block] = await createChildren(token, documentId, parentBlockId, [paragraphBlock(text, bold)]);
  return block?.block_id;
}

export async function appendHeading(token, documentId, parentBlockId, level, text) {
  const [block] = await createChildren(token, documentId, parentBlockId, [headingBlock(level, text)]);
  return block?.block_id;
}

export async function appendCode(token, documentId, parentBlockId, text) {
  const [block] = await createChildren(token, documentId, parentBlockId, [codeBlock(text)]);
  return block?.block_id;
}

export async function appendOrdered(token, documentId, parentBlockId, lines) {
  if (!lines.length) return [];
  const blocks = await createChildren(token, documentId, parentBlockId, lines.map((line) => orderedBlock(line)));
  return blocks.map((block) => block.block_id);
}

function normalizeOrderedEntry(entry) {
  if (typeof entry === 'string') return { title: entry, subs: [] };
  return { title: entry.title, subs: entry.subs || [] };
}

export async function appendNestedOrdered(token, documentId, parentBlockId, items) {
  const normalized = items.map(normalizeOrderedEntry);
  const ids = await appendOrdered(token, documentId, parentBlockId, normalized.map((item) => item.title));
  for (let i = 0; i < normalized.length; i += 1) {
    if (!ids[i] || !normalized[i].subs.length) continue;
    await appendNestedOrdered(token, documentId, ids[i], normalized[i].subs);
  }
}

async function deleteFirstChild(token, documentId, parentBlockId) {
  try {
    await deleteRange(token, documentId, parentBlockId, 0, 1);
  } catch {
    // noop
  }
}

async function fillTextCell(token, documentId, cellId, text, bold = false) {
  await appendParagraph(token, documentId, cellId, text, bold);
  await deleteFirstChild(token, documentId, cellId);
}

async function fillOrderedCell(token, documentId, cellId, items) {
  await appendNestedOrdered(token, documentId, cellId, items);
  await deleteFirstChild(token, documentId, cellId);
}

export async function appendSimpleTable(token, documentId, parentBlockId, headers, rows, widths) {
  const columnSize = headers.length;
  const rowSize = rows.length + 1;
  const [table] = await createChildren(token, documentId, parentBlockId, [{
    block_type: 31,
    table: {
      property: {
        row_size: rowSize,
        column_size: columnSize,
        column_width: widths,
      },
    },
  }]);

  let cellIds = table?.children || [];
  if (cellIds.length !== rowSize * columnSize) {
    const cells = await getChildren(token, documentId, table.block_id, rowSize * columnSize + 10);
    cellIds = cells.map((item) => item.block_id);
  }

  for (let column = 0; column < columnSize; column += 1) {
    await fillTextCell(token, documentId, cellIds[column], headers[column], true);
  }

  for (let row = 0; row < rows.length; row += 1) {
    for (let column = 0; column < columnSize; column += 1) {
      await fillTextCell(token, documentId, cellIds[(row + 1) * columnSize + column], rows[row][column] || '');
    }
  }

  return table?.block_id;
}

export async function appendFeatureTable(token, documentId, parentBlockId, rows, widths = [180, 500, 500]) {
  const columnSize = 3;
  const rowSize = rows.length + 1;
  const [table] = await createChildren(token, documentId, parentBlockId, [{
    block_type: 31,
    table: {
      property: {
        row_size: rowSize,
        column_size: columnSize,
        column_width: widths,
      },
    },
  }]);

  let cellIds = table?.children || [];
  if (cellIds.length !== rowSize * columnSize) {
    const cells = await getChildren(token, documentId, table.block_id, rowSize * columnSize + 10);
    cellIds = cells.map((item) => item.block_id);
  }

  await fillTextCell(token, documentId, cellIds[0], '功能模块', true);
  await fillTextCell(token, documentId, cellIds[1], '元素', true);
  await fillTextCell(token, documentId, cellIds[2], '逻辑说明', true);

  for (let row = 0; row < rows.length; row += 1) {
    const offset = (row + 1) * columnSize;
    await fillTextCell(token, documentId, cellIds[offset], rows[row].module);
    await fillOrderedCell(token, documentId, cellIds[offset + 1], rows[row].elements);
    await fillOrderedCell(token, documentId, cellIds[offset + 2], rows[row].logic);
  }

  return table?.block_id;
}

export async function uploadImageToDocxBlock(token, imageBlockId, filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Image not found: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = filePath.split('/').pop();
  const formData = new FormData();
  formData.append('file_name', fileName);
  formData.append('parent_type', 'docx_image');
  formData.append('parent_node', imageBlockId);
  formData.append('size', String(fileBuffer.length));
  formData.append('file', new Blob([fileBuffer], { type: 'image/png' }), fileName);

  const res = await fetch(`${API_BASE}/drive/v1/medias/upload_all`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  const json = await res.json();
  if (!res.ok || json?.code !== 0 || !json?.data?.file_token) {
    throw new Error(`Feishu image upload failed: ${filePath}`);
  }
  return json.data.file_token;
}

export async function replaceDocxImageBlock(token, documentId, imageBlockId, fileToken) {
  await feishuRequest({
    method: 'PATCH',
    url: `${API_BASE}/docx/v1/documents/${documentId}/blocks/batch_update`,
    token,
    body: {
      requests: [{ block_id: imageBlockId, replace_image: { token: fileToken } }],
    },
  });
}

export async function appendImage(token, documentId, parentBlockId, filePath) {
  const [imageBlock] = await createChildren(token, documentId, parentBlockId, [{
    block_type: 27,
    image: { align: 1, scale: 1 },
  }]);
  const fileToken = await uploadImageToDocxBlock(token, imageBlock.block_id, filePath);
  await replaceDocxImageBlock(token, documentId, imageBlock.block_id, fileToken);
  return imageBlock.block_id;
}

export function extractBlockText(block) {
  for (let level = 1; level <= 9; level += 1) {
    const key = `heading${level}`;
    const headingText = block[key]?.elements?.map((item) => item.text_run?.content || '').join('') || '';
    if (headingText) return headingText;
  }
  const text = block.text?.elements?.map((item) => item.text_run?.content || '').join('') || '';
  const ordered = block.ordered?.elements?.map((item) => item.text_run?.content || '').join('') || '';
  return text || ordered || '';
}

function headingLevelForBlockType(blockType) {
  if (blockType >= 3 && blockType <= 11) return blockType - 2;
  return null;
}

export async function listHeadings(token, documentId, rootBlockId = documentId) {
  const results = [];

  async function walk(parentBlockId, path = []) {
    const children = await getChildren(token, documentId, parentBlockId);
    for (const child of children) {
      const level = headingLevelForBlockType(child.block_type);
      if (!level) continue;
      const text = extractBlockText(child);
      const currentPath = [...path, text];
      results.push({
        blockId: child.block_id,
        parentId: child.parent_id,
        level,
        text,
        path: currentPath,
      });
      await walk(child.block_id, currentPath);
    }
  }

  await walk(rootBlockId, []);
  return results;
}

export async function resolveTargetBlockId(token, documentId, target) {
  if (target?.blockId) return target.blockId;

  const headings = await listHeadings(token, documentId);
  if (target?.headingPath?.length) {
    const pathKey = target.headingPath.join(' > ');
    const match = headings.find((heading) => heading.path.join(' > ') === pathKey);
    if (!match) throw new Error(`Heading path not found: ${pathKey}`);
    return match.blockId;
  }

  if (target?.headingText) {
    const matches = headings.filter((heading) => heading.text === target.headingText);
    if (matches.length === 0) throw new Error(`Heading not found: ${target.headingText}`);
    if (matches.length > 1) {
      throw new Error(`Heading not unique: ${target.headingText}. Use headingPath or blockId instead.`);
    }
    return matches[0].blockId;
  }

  throw new Error('Target must include blockId, headingText, or headingPath');
}

async function renderNode(token, documentId, parentBlockId, node) {
  if (typeof node === 'string') {
    await appendParagraph(token, documentId, parentBlockId, node);
    return;
  }

  switch (node.type) {
    case 'paragraph':
      await appendParagraph(token, documentId, parentBlockId, node.text, Boolean(node.bold));
      break;
    case 'heading':
      await appendHeading(token, documentId, parentBlockId, node.level || 3, node.text);
      break;
    case 'ordered-list':
      await appendNestedOrdered(token, documentId, parentBlockId, node.items || []);
      break;
    case 'code':
      await appendCode(token, documentId, parentBlockId, node.text);
      break;
    case 'image':
      await appendImage(token, documentId, parentBlockId, node.path);
      break;
    case 'feature-table':
      await appendFeatureTable(token, documentId, parentBlockId, node.rows || [], node.widths || [180, 500, 500]);
      break;
    case 'simple-table':
      await appendSimpleTable(token, documentId, parentBlockId, node.headers || [], node.rows || [], node.widths || []);
      break;
    default:
      throw new Error(`Unsupported content node type: ${node.type}`);
  }
}

export async function renderContent(token, documentId, parentBlockId, content = []) {
  for (const node of content) {
    await renderNode(token, documentId, parentBlockId, node);
  }
}

export async function summarizeChildren(token, documentId, parentBlockId) {
  const children = await getChildren(token, documentId, parentBlockId, 200);
  return children.map((child) => ({
    blockId: child.block_id,
    blockType: child.block_type,
    text: extractBlockText(child),
  }));
}
