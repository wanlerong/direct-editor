interface ProcessResult {
  inlineContent: DocumentFragment | null;
  blockElements: HTMLElement[];
}

export function handlePaste(e: ClipboardEvent): void {
  e.preventDefault();
  const clipboardData = e.clipboardData || (window as any).clipboardData;
  if (!clipboardData) return;

  const html = clipboardData.getData('text/html');
  console.log(html)
  if (!html) return;

  const result = processHTML(html);
  insertContentAtCursor(result);
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
      // 遇到第一个块级元素时冻结前面的 inline 内容
      if (!hasBlock) {
        result.inlineContent = fragment.cloneNode(true) as DocumentFragment;
        hasBlock = true;
      }
      processBlockElement(node as HTMLElement, result.blockElements);
    } else if (!hasBlock) {
      // 在遇到块级元素前持续收集 inline 内容
      fragment.appendChild(sanitizeNode(node));
    } else {
      // 块级元素之后的 inline 内容需要生成独立 row
      const tempFragment = document.createDocumentFragment();
      tempFragment.appendChild(sanitizeNode(node));
      const row = createRowFromNodes(Array.from(tempFragment.childNodes));
      if (row) result.blockElements.unshift(row);
    }
  });

  // 处理纯 inline 内容的情况
  if (!hasBlock) {
    result.inlineContent = fragment;
  }

  return result;
}

function processBlockElement(element: HTMLElement, rows: HTMLElement[]) {
  let currentInlineNodes: Node[] = [];

  Array.from(element.childNodes).forEach(node => {
    if (isBlockElement(node)) {
      // 遇到块级元素时先处理已积累的 inline 内容
      flushInlineNodes(currentInlineNodes, rows);

      // 递归处理嵌套块级元素
      processBlockElement(node as HTMLElement, rows);
    } else {
      // 收集 inline 内容（自动深度克隆）
      currentInlineNodes.push(node.cloneNode(true));
    }
  });

  // 处理元素末尾的 inline 内容
  flushInlineNodes(currentInlineNodes, rows);
}

function flushInlineNodes(nodes: Node[], rows: HTMLElement[]) {
  if (nodes.length === 0) return;

  const row = createRowFromNodes(nodes);
  if (row) {
    rows.push(row);
    nodes.length = 0; // 清空数组
  }
}

function createRowFromNodes(nodes: Node[]): HTMLElement | null {
  const row = document.createElement('div');
  row.className = 'row';

  // 处理每个节点并保留结构
  nodes.forEach(node => {
    const clonedNode = sanitizeNode(node);
    if (clonedNode.nodeType === Node.TEXT_NODE) {
      const text = clonedNode.textContent || '';
      if (text) {
        row.appendChild(document.createTextNode(text));
      }
    } else {
      row.appendChild(clonedNode);
    }
  });

  return row.textContent ? row : null;
}

// 获取当前光标所在的 .row 元素
function getCurrentRow(selection: Selection): HTMLElement | null {
  const node = selection.anchorNode;
  return node ? (node.nodeType === Node.TEXT_NODE ?
    node.parentElement : node as HTMLElement).closest('.row') : null;
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


// 允许的样式属性及对应值
const ALLOWED_STYLES: Record<string, RegExp> = {
  'font-weight': /^bold$/,
  'font-style': /^italic$/,
  'text-decoration': /^(underline|line-through)$/,
};

// only preset style collections are allowed to be retained
function sanitizeNode(node: Node): Node {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node.cloneNode(true);
  }

  const element = node.cloneNode(false) as HTMLElement;
  const original = node as HTMLElement;

  // 处理样式
  const style = original.getAttribute('style');
  if (style) {
    const sanitized = sanitizeStyles(style);
    if (sanitized) {
      element.setAttribute('style', sanitized);
    } else {
      element.removeAttribute('style')
    }
  }
  
  // 递归处理子节点
  Array.from(original.childNodes).forEach(child => {
    element.appendChild(sanitizeNode(child));
  });

  return element;
}

// sanitizeStyles 使用正则表达式严格过滤样式
function sanitizeStyles(rawStyle: string): string {
  const styles = rawStyle.split(';').reduce((acc, rule) => {
    const [prop, value] = rule.split(':').map(s => s.trim().toLowerCase());
    if (!prop || !value) return acc;

    // 处理其他允许属性
    if (ALLOWED_STYLES[prop]?.test(value)) {
      acc.push(`${prop}: ${value}`);
    }
    return acc;
  }, [] as string[]);

  return styles.join('; ');
}
