import {basicBlockConfig, BlockConfig, htitleBlockConfig, listBlockConfig} from "./block.js";
import {BlockType} from "./blockType.js";
import {HTMLStructureRule, rootSchema} from "../schema/schema.js";

export default class BlockNormalizer {
  private readonly blockRegistry = new Map<BlockType, BlockConfig>();

  constructor() {
    this.blockRegistry.set(BlockType.Basic, basicBlockConfig);
    this.blockRegistry.set(BlockType.HTitle, htitleBlockConfig);
    this.blockRegistry.set(BlockType.List, listBlockConfig);
  }

  normalize(container: HTMLElement) {
    if (!container.hasChildNodes()) {
      container.appendChild(basicBlockConfig.createElement());
    }

    // preProcess
    Array.from(container.childNodes).forEach(n => {
      if (n.nodeType == Node.ELEMENT_NODE && n.nodeName == "DIV") {
        // if div contain ul, it should only have one child which is ul
        if (n.childNodes.length > 1 && this.getBlockType(n as HTMLElement) == BlockType.List) {
          let ele = basicBlockConfig.createElement()
          n.childNodes.forEach(child => {
            if ((child as HTMLElement).tagName != 'UL' && (child as HTMLElement).tagName != 'OL') {
              ele.appendChild(child);
            }
          });
          (n as HTMLElement).insertAdjacentElement('beforebegin', ele)
        }
      }
    })

    this.processContainer(container, rootSchema);
    console.log("before postProcess", container.innerHTML)
    this.postProcess(container);
    console.log("after postProcess", container.innerHTML)
  }
  
  private processContainer(
    container: HTMLElement,
    schema: HTMLStructureRule | null
  ) {
    console.log("processContainer", container.tagName, container.innerHTML, schema)
    // 逆序处理防止索引错位
    Array.from(container.childNodes)
      .reverse()
      .forEach(node => this.processNode(node, schema)); // 对于 node 而言，是 parentSchema
  }

  private processNode(
    node: Node,
    parentSchema: HTMLStructureRule
  ) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const blockType = this.getBlockType(element);
      console.log("processNode", blockType, element.tagName, element.innerHTML)
      if (blockType) {
        this.processBlockElement(element, blockType, parentSchema);
      } else {
        this.processRegularElement(element, parentSchema);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      console.log("processNode text", (node as Text).data)
      this.processTextNode(node, parentSchema);
    }
  }

  private processBlockElement(
    element: HTMLElement, // is a block, <div data-btype="xxx">
    blockType: BlockType,
    parentSchema: HTMLStructureRule | null,
  ) {
    const config = this.blockRegistry.get(blockType);
    if (!config || !parentSchema.childAllowedBlocks.includes(blockType)) {
      this.unwrapElement(element);
      return;
    }

    // 应用 schema 规则
    this.applySchema(element, config.schema);

    // 递归处理子元素
    this.processContainer(element, config.schema);
  }

  private applySchema(element: HTMLElement, schema: HTMLStructureRule) {
    console.log("applySchema", element.tagName, element.innerHTML, schema)
    // 清理非法属性
    this.cleanAttributes(element, schema);

    Array.from(element.childNodes)
      .reverse()
      .forEach(child => {
        if (child.nodeType === Node.ELEMENT_NODE) {
          const childElement = child as HTMLElement;
          const childTag = childElement.tagName.toLowerCase();

          // 检查子标签是否允许
          if (!schema.childAllowedTags.includes(childTag)) {
            this.unwrapElement(childElement);
            return;
          }

          // 应用子规则
          const childRule = schema.children?.[childTag];
          if (childRule) {
            this.applySchema(childElement, childRule);
          } else {
            this.unwrapElement(childElement);
          }
        }
      });
  }

  private processRegularElement(
    element: HTMLElement,
    parentSchema: HTMLStructureRule | null
  ) {
    if (!parentSchema) {
      element.remove();
      return;
    }

    // 校验是否允许当前标签
    const tagName = element.tagName.toLowerCase();
    if (!parentSchema.childAllowedTags.includes(tagName)) {
      this.unwrapElement(element);
      return;
    }

    // 应用子元素规则
    const childRule = parentSchema.children?.[tagName];
    if (childRule) {
      this.applySchema(element, childRule);
    }
  }

  private processTextNode(node: Node, parentSchema: HTMLStructureRule | null) {
    if (!parentSchema?.childAllowText) {
      node.parentNode?.removeChild(node);
    }
  }

  private cleanAttributes(element: HTMLElement, schema: HTMLStructureRule) {
    Array.from(element.attributes).forEach(attr => {
      if (!schema.attributes?.includes(attr.name)) {
        element.removeAttribute(attr.name);
      }
    });
  }

  private unwrapElement(element: HTMLElement) {
    const parent = element.parentNode;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    while (element.firstChild) {
      fragment.appendChild(element.firstChild);
    }
    parent.replaceChild(fragment, element);
  }

  private getBlockType(element: HTMLElement): BlockType | null {
    const typeStr = element.dataset.btype;
    return typeStr && Object.values(BlockType).includes(typeStr as BlockType)
      ? (typeStr as BlockType)
      : null;
  }

  // 保留原有后处理逻辑
  private postProcess(container: HTMLElement) {
    this.mergeAdjacentLists(container);
    this.handleEmptyElements(container);
    sanitizeNode(container)
  }

  private mergeAdjacentLists(container: HTMLElement) {
    ['ul', 'ol'].forEach(listtype => {
      let i = 0;
      // merge sibling ul nodes
      while (i < container.childNodes.length) {
        const currentDiv: HTMLElement = container.childNodes[i] as HTMLElement;
        const ulInCurrentDiv = currentDiv.querySelector(listtype);
        i++;
        if (ulInCurrentDiv) {
          // Merge with subsequent divs containing ul elements
          while (i < container.childNodes.length) {
            const nextDiv = container.childNodes[i] as HTMLElement;
            const ulInNextDiv = nextDiv.querySelector(listtype);
            if (ulInNextDiv) {
              Array.from(ulInNextDiv.children).forEach(li => ulInCurrentDiv.appendChild(li));
              i++;
            } else {
              break;
            }
          }
        }
      }

    });

    let toRemove = [];
    Array.from(container.childNodes).forEach(n => {
      if (n.nodeType == Node.ELEMENT_NODE && n.nodeName == "DIV") {
        // remove the empty UL/OL
        if ((n.firstChild?.nodeName == "UL" || n.firstChild?.nodeName == "OL") && n.firstChild.childNodes.length == 0) {
          toRemove.push(n)
          return
        }
        // add <br> for empty <div> 
        if ((n as HTMLElement).innerHTML == "" || (n as HTMLElement).innerHTML == "\n") {
          (n as HTMLElement).innerHTML = ""
          n.appendChild(document.createElement("br"))
        }
      }
    })
    toRemove.forEach(it => it.remove())

    // br is like a "placeholder" for text
    const listItems = container.querySelectorAll('li');
    listItems.forEach((li) => {
      const childNodes = Array.from(li.childNodes);
      let hasText = false;
      let ulCollection: HTMLElement[] = [];

      childNodes.forEach((node) => {
        if (
          (node.nodeType === Node.TEXT_NODE && node.textContent?.trim() !== '') ||
          (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'SPAN' && node.textContent?.trim() !== '')
        ) {
          hasText = true;
        }

        if (node.nodeType === Node.ELEMENT_NODE && ((node as HTMLElement).tagName === 'UL' || (node as HTMLElement).tagName === 'OL')) {
          ulCollection.push(node as HTMLElement);
        }
      });

      if (hasText) {
        childNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR') {
            li.removeChild(node);
          }
        });
      } else {
        if (!childNodes.some(node => node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).tagName === 'BR')) {
          li.insertBefore(document.createElement('br'), li.firstChild);
        }
      }

      // merge nested ul/ol elements
      if (ulCollection.length > 1) {
        const firstUl = ulCollection[0];
        // 将其他 <ul> 的 <li> 移入第一个 <ul>
        ulCollection.slice(1).forEach((nextUl) => {
          nextUl.childNodes.forEach(item => firstUl.appendChild(item));
          nextUl.remove();
        });
      }
    });
  }

  private handleEmptyElements(container: HTMLElement) {
    // 处理空 div
    container.querySelectorAll('div[data-btype]').forEach(div => {
      if (!div.textContent?.trim() && div.children.length === 0) {
        div.innerHTML = '';
        div.appendChild(document.createElement('br'));
      }
    });

    // remove all empty span
    const spanItems = container.querySelectorAll('span');
    spanItems.forEach((span) => {
      if (span.textContent == "") {
        span.remove()
      }
    });
  }
  
  validateElement(element: HTMLElement, schema: HTMLStructureRule | null): boolean {
    if (!schema) {
      return true; // No schema, always valid
    }

    if (element.attributes) {
      for (const attr of Array.from(element.attributes)) {
        if (!schema.attributes?.includes(attr.name)) {
          return false;
        }
      }
    }

    for (const node of Array.from(element.childNodes)) {
      if (!this.validateChildNode(node, schema)) {
        return false;
      }
    }
    return true;
  }

  private validateChildNode(node: Node, parentSchema: HTMLStructureRule): boolean {
    if (node.nodeType === Node.TEXT_NODE) {
      return parentSchema.childAllowText === true;
    }

    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      const tagName = element.tagName.toLowerCase();

      if (!parentSchema.childAllowedTags.includes(tagName)) {
        return false;
      }

      // Validate children using child schema
      const childSchema = parentSchema.children?.[tagName];
      if (childSchema) {
        for (const childNode of Array.from(element.childNodes)) {
          if (!this.validateElement(childNode as HTMLElement, childSchema)) {
            return false;
          }
        }
      }
      return true;
    }

    return true;
  }
  
}

// 允许的样式属性及对应值
const ALLOWED_STYLES: Record<string, RegExp> = {
  'font-weight': /^bold$/,
  'font-style': /^italic$/,
  'text-decoration': /^(underline|line-through)$/,
};

// only preset style collections are allowed to be retained
function sanitizeNode(node: Node) {
  if (node.nodeType !== Node.ELEMENT_NODE) {
    return node
  }
  let element = node as HTMLElement

  // 处理样式
  const style = element.getAttribute('style');
  if (style) {
    const sanitized = sanitizeStyles(style);
    if (sanitized) {
      element.setAttribute('style', sanitized);
    } else {
      element.removeAttribute('style')
    }
  }
  
  // 递归处理子节点
  Array.from(element.childNodes).forEach(child => {
    sanitizeNode(child)
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