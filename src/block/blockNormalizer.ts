import {basicBlockConfig, BlockConfig, htitleBlockConfig, listBlockConfig} from "./block";
import {BlockType} from "./blockType";
import {HTMLStructureRule, rootSchema} from "../schema/schema";

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
    element: HTMLElement,
    blockType: BlockType,
    parentSchema: HTMLStructureRule | null,
  ) {
    const config = this.blockRegistry.get(blockType);
    if (!config || !parentSchema.allowedBlocks.includes(blockType)) {
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
          if (!schema.allowedTags.includes(childTag)) {
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
    if (!parentSchema.allowedTags.includes(tagName)) {
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
    if (!parentSchema?.allowText) {
      node.parentNode?.removeChild(node);
    } else {
      // 合并相邻文本节点
      node.nodeValue = node.nodeValue?.trim() || '';
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
}