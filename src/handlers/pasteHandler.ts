export function handlePaste(e: ClipboardEvent): void {
  e.preventDefault();
  const clipboardData = e.clipboardData || (window as any).clipboardData;
  if (!clipboardData) return;

  const html = clipboardData.getData('text/html');
  console.log(html)
  if (!html) return;

  const rowElements = processHTML(html);
  if (rowElements.length === 0) return;

  insertElementsAtCursor(rowElements);
}

function insertElementsAtCursor(elements: HTMLElement[]): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;

  const range = selection.getRangeAt(0);
  const container = range.startContainer;
  let insertAfterNode: Element = null;

  // 确定插入位置
  if (container.nodeType === Node.TEXT_NODE) {
    const parentRow = (container.parentNode as HTMLElement).closest?.('.row');
    if (parentRow) insertAfterNode = parentRow;
  } else if (container.nodeType === Node.ELEMENT_NODE) {
    insertAfterNode = (container as HTMLElement).closest?.('.row');
  }

  const directEditor = document.querySelector('.direct-editor');
  if (!directEditor) return;

  elements.forEach(el => {
    if (insertAfterNode) {
      insertAfterNode.insertAdjacentElement('afterend', el);
      insertAfterNode = el;
    } else {
      directEditor.appendChild(el);
    }
  });
  
  // 更新光标位置
  const newRange = document.createRange();
  newRange.setStartAfter(elements[elements.length - 1]);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);
}

const BLOCK_TAGS = new Set(['div', 'p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'ul', 'ol', 'li']);

function isBlockElement(node: Node): boolean {
  return node.nodeType === Node.ELEMENT_NODE &&
    BLOCK_TAGS.has((node as HTMLElement).tagName.toLowerCase());
}

function processHTML(html: string): HTMLElement[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const rows: HTMLElement[] = [];
  let currentInlineNodes: Node[] = [];

  Array.from(doc.body.childNodes).forEach(node => {
    if (isBlockElement(node)) {
      // 处理积累的 inline 内容
      flushInlineNodes(currentInlineNodes, rows);

      // 处理块级元素及其嵌套结构
      processBlockElement(node as HTMLElement, rows);
    } else {
      // 克隆节点并积累 inline 内容
      currentInlineNodes.push(node.cloneNode(true));
    }
  });

  // 处理剩余的 inline 内容
  flushInlineNodes(currentInlineNodes, rows);

  return rows;
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
    const clonedNode = node.cloneNode(true);
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