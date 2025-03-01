// 块类型映射配置
import {basicBlockConfig} from "../block/block.js";
import {BlockType} from "../block/blockType.js";

const BLOCK_TYPE_MAP: Record<string, string> = {
  'ul': 'list',
  'ol': 'list',
  'h1': 'htitle',
  'h2': 'htitle',
  'h3': 'htitle',
  'h4': 'htitle',
  'h5': 'htitle',
  'h6': 'htitle'
};

interface ProcessResult {
  inlineContent: DocumentFragment | null;
  blockElements: HTMLElement[];
}

export function handlePaste(e: ClipboardEvent): void {
  e.preventDefault();
  const clipboardData = e.clipboardData || (window as any).clipboardData;
  if (!clipboardData) return;

  let result: ProcessResult = { inlineContent: null, blockElements: [] };

  const html = clipboardData.getData('text/html');
  if (html) {
    console.log(html)
    result = processHTML(html);
  } else {
    const text = clipboardData.getData('text/plain');
    if (text) {
      console.log(text)
      result = processPlainText(text);
    }
  }

  if (result.inlineContent || result.blockElements.length > 0) {
    insertContentAtCursor(result);
  }
}

function insertContentAtCursor(result: ProcessResult): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const currentRow = getCurrentRow(selection);

  // 优先处理 inline 内容插入
  if (result.inlineContent && currentRow) {
    insertInlineContent(currentRow, range, result.inlineContent);
  }

  const directEditor = document.querySelector('.direct-editor');

  // 插入块级元素
  if (result.blockElements.length > 0) {
    insertBlockElementsAfter(currentRow || directEditor.lastChild as HTMLElement, result.blockElements);
  }

  // 更新光标位置
  const newRange = document.createRange();
  if (result.blockElements.length > 0) {
    const lastBlock = result.blockElements[result.blockElements.length - 1];
    newRange.setStartAfter(lastBlock);
  } else if (currentRow) {
    newRange.setStart(currentRow, currentRow.childNodes.length);
  }
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

const BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li']);

function isBlockElement(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE &&
    BLOCK_TAGS.has((node as HTMLElement).tagName.toLowerCase());
}

function processHTML(html: string): ProcessResult {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const result: ProcessResult = {
    inlineContent: null,
    blockElements: []
  };

  // 分离 inline 内容和块级元素
  const fragment = document.createDocumentFragment();
  let hasBlock = false;

  Array.from(doc.body.childNodes).forEach(node => {
    if (isBlockElement(node)) {
      if (!hasBlock) {
        result.inlineContent = fragment.cloneNode(true) as DocumentFragment;
        hasBlock = true;
      }
      processBlockElement(node as HTMLElement, result.blockElements);
    } else if (!hasBlock) {
      fragment.appendChild(node.cloneNode(true));
    } else {
      const tempFragment = document.createDocumentFragment();
      tempFragment.appendChild(node.cloneNode(true));
      const row = createBlockElement('basic', tempFragment);
      if (row) result.blockElements.unshift(row);
    }
  });

  if (!hasBlock) {
    result.inlineContent = fragment;
  }

  return result;
}

function processBlockElement(element: HTMLElement, rows: HTMLElement[]) {
  let currentInlineNodes: Node[] = [];
  const tagName = element.tagName.toLowerCase();

  const blockType = BLOCK_TYPE_MAP[tagName] || 'basic';
  if (blockType == BlockType.HTitle || blockType == BlockType.List) {
    flushInlineNodes([element], blockType, rows)
    return
  }

  // 处理子节点
  Array.from(element.childNodes).forEach(node => {
    if (isBlockElement(node)) {
      flushInlineNodes(currentInlineNodes, blockType, rows);
      processBlockElement(node as HTMLElement, rows);
    } else {
      currentInlineNodes.push(node.cloneNode(true));
    }
  });

  // 处理末尾inline内容
  flushInlineNodes(currentInlineNodes, blockType, rows);
}

function createBlockElement(btype: string, content?: DocumentFragment): HTMLElement {
  const block = document.createElement('div');
  block.dataset.btype = btype;

  if (content) {
    block.appendChild(content);
  }
  return block;
}

function flushInlineNodes(nodes: Node[], blockType: string, rows: HTMLElement[]) {
  if (nodes.length === 0) return;

  let df = new DocumentFragment()
  nodes.forEach(n => df.appendChild(n))

  const row = createBlockElement(blockType, df);
  if (row) {
    rows.push(row);
    nodes.length = 0; // 清空数组
  }
}

// 获取当前光标所在的行
function getCurrentRow(selection: Selection): HTMLElement | null {
  const node = selection.anchorNode;
  return node ? (node.nodeType === Node.TEXT_NODE ?
    node.parentElement : node as HTMLElement).closest("[data-btype]") : null;
}

// 在现有 row 中插入 inline 内容
function insertInlineContent(row: HTMLElement, range: Range, fragment: DocumentFragment): void {
  // 创建临时包裹元素用于保留 HTML 结构
  const tempDiv = document.createElement('div');
  tempDiv.appendChild(fragment.cloneNode(true));

  // 提取文本内容用于光标定位
  const textContent = tempDiv.textContent || '';
  const hasOnlyText = tempDiv.children.length === 0;

  // 执行插入操作
  if (hasOnlyText) {
    range.insertNode(document.createTextNode(textContent));
  } else {
    range.insertNode(fragment.cloneNode(true));
  }

  // 合并相邻文本节点
  row.normalize();
}

// 插入块级元素到指定位置
function insertBlockElementsAfter(afterElement: HTMLElement | null, elements: HTMLElement[]): void {
  const container = document.querySelector('.direct-editor');
  if (!container) return;

  let currentInsertionPoint = afterElement;
  elements.forEach(el => {
    if (currentInsertionPoint) {
      currentInsertionPoint.insertAdjacentElement('afterend', el);
      currentInsertionPoint = el;
    } else {
      container.insertBefore(el, container.firstChild);
    }
  });
}

function processPlainText(text: string): ProcessResult {
  const result: ProcessResult = {
    inlineContent: null,
    blockElements: []
  };

  // 按换行符分割并过滤空内容
  const paragraphs = text.split(/\r?\n/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  if (paragraphs.length === 0) return result;

  // 创建行内内容片段
  const firstPara = paragraphs[0];
  result.inlineContent = document.createDocumentFragment();
  result.inlineContent.appendChild(document.createTextNode(firstPara));

  // 剩余段落创建块级元素
  result.blockElements = paragraphs.slice(1)
    .map(p => {
      const row = basicBlockConfig.createElement()
      row.textContent = p;
      return row;
    });

  return result;
}
