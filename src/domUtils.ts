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

export function getNodeLength(node: Node) {
  let childNodes;
  return isCharacterDataNode(node) ? (node as Text).length : ((childNodes = node.childNodes) ? childNodes.length : 0);
}

export function insertAfter(referenceNode:Node, node: Node) {
  referenceNode.parentNode.insertBefore(node, referenceNode.nextSibling)
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