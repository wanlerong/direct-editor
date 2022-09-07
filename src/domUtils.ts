export function isCharacterDataNode(node: Node): boolean {
  return node.nodeType == Node.TEXT_NODE || node.nodeType == Node.COMMENT_NODE || node.nodeType == Node.CDATA_SECTION_NODE
}
