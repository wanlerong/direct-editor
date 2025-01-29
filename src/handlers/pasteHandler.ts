import {getSelectionRange} from "../range";
import {
  getClosestAncestorByNodeName,
  insertAfter,
} from "../domUtils";

export function handlePaste(event: ClipboardEvent) {
  event.preventDefault();
  const clipboardData = event.clipboardData;
  const htmlText = clipboardData?.getData("text/html");
  console.log(htmlText)
  if (!htmlText) {
    return
  }
  const container = document.createElement("div");
  container.innerHTML = htmlText;
  const fragment = document.createDocumentFragment();

  let currentRow:HTMLElement
  let rows : HTMLElement[] = []

  let newRow = () => {
    let row = document.createElement('div');
    row.classList.add('row');
    currentRow = row
    rows.push(currentRow)
  }

  function flattenNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      if (element.tagName.toLowerCase() === 'div') {
        newRow()
        Array.from(element.childNodes).forEach((child) => {
          if (child.nodeType === Node.ELEMENT_NODE && (child as HTMLElement).tagName.toLowerCase() === 'div') {
            flattenNode(child);
          } else {
            currentRow.appendChild(child.cloneNode(true));
          }
        });
        newRow()
      } else {
        // 忽略非 div 的根级元素
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      if (!currentRow) {
        newRow()
      }
      const textContent = node.textContent?.trim();
      if (textContent) {
        currentRow.appendChild(document.createTextNode(textContent))
      }
    }
  }
  Array.from(container.childNodes).forEach(flattenNode);

  rows.forEach(row => {
    if (row.childNodes.length > 0) {
      fragment.appendChild(row)
    }
  })

  let range = getSelectionRange()
  const startRow = getClosestAncestorByNodeName(range.startContainer, 'DIV') as HTMLElement;
  insertAfter(startRow, fragment)
}