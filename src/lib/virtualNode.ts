export interface VirtualNode {
  type: string; // 'element' | 'text'
  tagName?: string;
  attributes?: { [key: string]: any };
  children?: VirtualNode[];
  text?: string; // For text nodes
}

/**
 * Converts a DOM node into a VirtualNode recursively.
 * @param domNode - The DOM node to convert.
 * @returns A VirtualNode representation of the DOM node.
 */
export function domToVirtualNode(domNode: Node): VirtualNode {
  if (domNode.nodeType === Node.TEXT_NODE) {
    return {
      type: "text",
      text: domNode.textContent || "",
    };
  }
  
  if (domNode.nodeType === Node.ELEMENT_NODE) {
    const element = domNode as HTMLElement;
    const attributes: { [key: string]: any } = {};

    Array.from(element.attributes).forEach((attr) => {
      attributes[attr.name] = attr.value;
    });

    const children = Array.from(element.childNodes).map(domToVirtualNode);

    return {
      type: "element",
      tagName: element.tagName.toLowerCase(),
      attributes,
      children,
    };
  }

  throw new Error("Unsupported node type");
}
