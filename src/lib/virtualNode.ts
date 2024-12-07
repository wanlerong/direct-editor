export interface VirtualNode {
  dom: Node;
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
      dom: domNode,
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
      dom: domNode,
      type: "element",
      tagName: element.tagName.toLowerCase(),
      attributes,
      children,
    };
  }

  throw new Error("Unsupported node type");
}

/**
 * Finds the corresponding VirtualNode in the VirtualNode tree based on the provided DOM node.
 * @param virtualNode - The root VirtualNode to start searching from.
 * @param targetDom - The DOM node to find in the VirtualNode tree.
 * @returns The corresponding VirtualNode, or null if not found.
 */
export function findVirtualNodeByDom(virtualNode: VirtualNode, targetDom: Node): VirtualNode | null {
  if (virtualNode.dom === targetDom) {
    return virtualNode;
  }

  if (virtualNode.children) {
    for (let child of virtualNode.children) {
      const foundNode = findVirtualNodeByDom(child, targetDom);
      if (foundNode) {
        return foundNode;
      }
    }
  }

  return null;
}

/**
 * Converts a VirtualNode to JSONML.
 * @param virtualNode - The VirtualNode to convert.
 * @returns The JSONML representation of the VirtualNode.
 */
export function virtualNodeToJsonML(virtualNode: VirtualNode): any {
  if (!virtualNode) {
    return null
  }
  if (virtualNode.type === "text") {
    return virtualNode.text;
  }

  const jsonML: any[] = [virtualNode.tagName!.toUpperCase()]; // Tag name in uppercase

  if (virtualNode.attributes) {
    jsonML.push(virtualNode.attributes);
  } else {
    jsonML.push({});
  }
  
  if (virtualNode.children && virtualNode.children.length > 0) {
    jsonML.push(
      ...virtualNode.children.map((child) => virtualNodeToJsonML(child))
    );
  }

  return jsonML;
}
