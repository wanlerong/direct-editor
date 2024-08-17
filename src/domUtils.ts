export function isCharacterDataNode(node: Node): boolean {
  return node.nodeType == Node.TEXT_NODE || node.nodeType == Node.COMMENT_NODE || node.nodeType == Node.CDATA_SECTION_NODE
}

export function isTextNode(node: Node): boolean {
  return node.nodeType == Node.TEXT_NODE
}

// ancestor -> ancestor1 -> .... -> node
// 返回的是 ancestor1
export function getClosestAncestorIn(node: Node, ancestor: Node): Node {
  let p, n = node;
  while (n) {
    p = n.parentNode;
    if (p === ancestor) {
      return n;
    }
    n = p;
  }
  return null;
}

// div -> .... -> node
// 返回的是 div
export function getClosestAncestorByNodeName(node: Node, nodeName: string): Node {
  let n = node;
  while (n) {
    if (n.nodeName == nodeName) {
      return n
    }
    n = n.parentNode
  }
  return null;
}

export function getNodeLength(node: Node) {
  let childNodes;
  return isCharacterDataNode(node) ? (node as Text).length : ((childNodes = node.childNodes) ? childNodes.length : 0);
}

export function insertAfter(referenceNode:Node, node: Node) {
  referenceNode.parentNode.insertBefore(node, referenceNode.nextSibling)
}

export function insertBefore(referenceNode:Node, node: Node) {
  referenceNode.parentNode.insertBefore(node, referenceNode)
}

export function getLastTextNode(element: Node): Node | null {
  if (isTextNode(element)) {
    return element
  }
  let lastTextNode: Node | null = null;

  function traverse(node: Node) {
    if (lastTextNode) {
      return
    }
    for (let i = node.childNodes.length - 1; i >= 0; i--) {
      const child = node.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE && child.textContent?.trim() !== '') {
        lastTextNode = child;
        return;
      }
      traverse(child);
    }
  }
  traverse(element);
  
  return lastTextNode;
}

export function getTextPosition(element: Node, range: Range): number {
  let textPosition = 0
  let find = false

  function traverse(node: Node) {
    if (find) {
      return
    }
    for (let i = 0; i < node.childNodes.length; i++) {
      const child = node.childNodes[i];
      if (child.nodeType === Node.TEXT_NODE) {
        if (range.startContainer == child) {
          textPosition += range.startOffset
          find = true
          return;
        } else {
          textPosition += child.textContent.length
        }
      }
      traverse(child);
    }
  }
  traverse(element);
  
  if (!find) {
    return -1
  }
  return textPosition;
}


export function getInlineStyles(ele: HTMLElement) :any {
  let styles = {}
  if (ele.style.fontWeight != '') {
    styles['fontWeight'] = ele.style.fontWeight
  }
  if (ele.style.fontStyle != '') {
    styles['fontStyle'] = ele.style.fontStyle
  }
  if (ele.style.textDecoration != '') {
    styles['textDecoration'] = ele.style.textDecoration
  }
  return styles
}

export function applyInlineStylesFormNode(from:HTMLElement, to: HTMLElement) {
  let styles = getInlineStyles(from)
  for (const property in styles) {
    to.style[property] = styles[property]
  }
}