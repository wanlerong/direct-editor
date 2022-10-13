const validNodeTypes = [
  Node.ELEMENT_NODE,
  Node.TEXT_NODE,
  Node.COMMENT_NODE,
];

export const getJson0Path = (element: Node | null): any[] => {
  const parts: any[] = [];
  while (element && validNodeTypes.includes(element.nodeType)) {

    if (element.nodeType == Node.ELEMENT_NODE) {
      let classStr = (element as HTMLElement).getAttribute("class")
      if (classStr && classStr.includes("direct-editor")) {
        break;
      }
    }

    let numberOfPreviousSiblings = 0;
    let hasNextSiblings = false;
    let sibling = element.previousSibling;
    while (sibling) {
      if (sibling.nodeType !== Node.DOCUMENT_TYPE_NODE) {
        numberOfPreviousSiblings++;
      }

      sibling = sibling.previousSibling;
    }

    sibling = element.nextSibling;
    while (sibling) {
      if (sibling.nodeName === element.nodeName) {
        hasNextSiblings = true;
        break;
      }

      sibling = sibling.nextSibling;
    }

    const nth = numberOfPreviousSiblings || hasNextSiblings
      ? (numberOfPreviousSiblings + 2)
      : 2;

    parts.push(nth);
    element = element.parentNode;
  }

  return parts.reverse();
};
