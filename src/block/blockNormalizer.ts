import {
  basicBlockConfig,
  BlockConfig,
  createBlockElement,
  getBlockType,
  imgBlockConfig,
  lineBlockConfig,
  listBlockConfig,
  todoBlockConfig
} from "./block.js";
import {BlockType} from "./blockType.js";
import {HTMLStructureRule, listSchema, rootSchema} from "../schema/schema.js";
import {setRange} from "../range";
import {isElementNode} from "../domUtils";

export default class BlockNormalizer {
  private readonly blockRegistry = new Map<BlockType, BlockConfig>();

  constructor() {
    this.blockRegistry.set(BlockType.Basic, basicBlockConfig);
    this.blockRegistry.set(BlockType.Line, lineBlockConfig);
    this.blockRegistry.set(BlockType.List, listBlockConfig);
    this.blockRegistry.set(BlockType.Image, imgBlockConfig);
    this.blockRegistry.set(BlockType.Todo, todoBlockConfig);
  }

  normalize(container: HTMLElement) {
    if (!container.hasChildNodes()) {
      container.appendChild(basicBlockConfig.createElement());
    }

    // preProcess
    Array.from(container.childNodes).forEach(n => {
      if (n.nodeType == Node.ELEMENT_NODE && n.nodeName == "DIV") {
        // if div contain ul, it should only have one child which is ul
        if (n.childNodes.length > 1 && getBlockType(n as HTMLElement) == BlockType.List) {
          let ele = basicBlockConfig.createElement()
          n.childNodes.forEach(child => {
            if ((child as HTMLElement).tagName != 'UL' && (child as HTMLElement).tagName != 'OL') {
              ele.appendChild(child);
            }
          });
          (n as HTMLElement).insertAdjacentElement('beforebegin', ele)
        }
        
        if (n.childNodes.length > 1 && (getBlockType(n as HTMLElement) == BlockType.Line || getBlockType(n as HTMLElement) == BlockType.Image)) {
          this.splitLineBlock(n as HTMLElement)
        }
        
        // 验证img block是否满足schema要求，不满足则转为basic block
        const blockType = getBlockType(n as HTMLElement);
        if (blockType === BlockType.Image) {
          // 检查是否只有一个子元素且为img标签
          const isValid = n.childNodes.length === 1 && 
                         n.firstChild.nodeType === Node.ELEMENT_NODE && 
                         (n.firstChild as HTMLElement).tagName === 'IMG';
          
          if (!isValid) {
            (n as HTMLElement).setAttribute('data-btype', 'basic')
          }
        } else if (blockType === BlockType.List) {
          if (!this.validateElement(n as HTMLElement, listSchema)) {
            (n as HTMLElement).setAttribute('data-btype', 'basic')
          }
        }
      }
    })

    this.processContainer(container, rootSchema);
    // console.log("before postProcess", container.innerHTML)
    this.postProcess(container);
    // console.log("after postProcess", container.innerHTML)
  }
  
  private processContainer(
    container: HTMLElement,
    schema: HTMLStructureRule | null
  ) {
    // console.log("processContainer", container.tagName, container.innerHTML, schema)
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
      const blockType = getBlockType(element);
      // console.log("processNode", blockType, element.tagName, element.innerHTML)
      if (blockType) {
        this.processBlockElement(element, blockType, parentSchema);
      } else {
        this.processRegularElement(element, parentSchema);
      }
    } else if (node.nodeType === Node.TEXT_NODE) {
      // console.log("processNode text", (node as Text).data)
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
  
  private splitLineBlock(container: HTMLElement) {
    if (container.childNodes.length <= 1) {
      return
    }
    
    const fragments: {
      type: BlockType;
      nodes: Node[];
    }[] = [];

    let currentFragment: Node[] = [];
    let currentType: BlockType | null = null;

    Array.from(container.childNodes).forEach(node => {
      if (this.isHeadingElement(node) ||
        (isElementNode(node) && (node as HTMLElement).tagName.toLowerCase() == 'blockquote')
      ) {
        if (currentFragment.length > 0) {
          fragments.push({ type: currentType!, nodes: currentFragment });
          currentFragment = [];
        }
        currentType = BlockType.Line;
        currentFragment.push(node);
      } else if (node.nodeName.toLowerCase() === 'img') {
        if (currentFragment.length > 0) {
          fragments.push({ type: currentType!, nodes: currentFragment });
          currentFragment = [];
        }
        currentType = BlockType.Image;
        currentFragment.push(node);
      } else {
        if (currentType !== BlockType.Basic) {
          if (currentFragment.length > 0) {
            fragments.push({ type: currentType!, nodes: currentFragment });
          }
          currentType = BlockType.Basic;
          currentFragment = [];
        }
        currentFragment.push(node);
      }
    });

    if (currentFragment.length > 0) {
      fragments.push({ type: currentType!, nodes: currentFragment });
    }
    
    // 重新组织 DOM 结构
    if (fragments.length > 1) {
      const newElements = fragments.map(({ type, nodes }) => {
        const newBlock = createBlockElement(type);
        nodes.forEach(n => newBlock.appendChild(n))
        return newBlock;
      });
      
      container.replaceWith(...newElements);
      setRange(newElements[1],0,newElements[1], 0)
    }
  }

  private isHeadingElement(node: Node): boolean {
    return node.nodeType === Node.ELEMENT_NODE &&
      /^H[1-6]$/.test((node as HTMLElement).tagName);
  }

  private applySchema(element: HTMLElement, schema: HTMLStructureRule) {
    // console.log("applySchema", element.tagName, element.innerHTML, schema)
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

  // 保留原有后处理逻辑
  private postProcess(container: HTMLElement) {
    this.mergeAdjacentLists(container);
    this.mergeAdjacentTodos(container);
    this.ensureTodoZeroWidthSpace(container);
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

  private mergeAdjacentTodos(container: HTMLElement) {
    let i = 0;
    while (i < container.childNodes.length) {
      const currentDiv = container.childNodes[i] as HTMLElement;
      if (currentDiv.dataset.btype === BlockType.Todo) {
        i++;
        // 查找后续的 Todo 块并合并
        while (i < container.childNodes.length) {
          const nextDiv = container.childNodes[i] as HTMLElement;
          if (nextDiv.dataset.btype === BlockType.Todo) {
            while (nextDiv.firstChild) {
              currentDiv.appendChild(nextDiv.firstChild);
            }
            nextDiv.remove();
          } else {
            break;
          }
        }
      } else {
        i++;
      }
    }
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
          if (!this.validateChildNode(childNode as HTMLElement, childSchema)) {
            return false;
          }
        }
      }
      return true;
    }

    return true;
  }
  
  /**
   * 确保所有todo 列表项的 checkbox 后有零宽空格字符
   */
  private ensureTodoZeroWidthSpace(container: HTMLElement) {
    let todoBlocks = container.querySelectorAll(`div[data-btype="${BlockType.Todo}"]`);
    todoBlocks.forEach(todoBlock => this.normalizeTodoBlock(todoBlock as HTMLElement))
    
    todoBlocks = container.querySelectorAll(`div[data-btype="${BlockType.Todo}"]`);
    todoBlocks.forEach(todoBlock => {
      const todoItems = todoBlock.children;
      Array.from(todoItems).forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox) {
          const nextNode = checkbox.nextSibling;
          if (!nextNode || 
              nextNode.nodeType !== Node.TEXT_NODE || 
              !nextNode.textContent.startsWith('\u200B')) {
            const zeroWidthSpace = document.createTextNode('\u200B');
            if (nextNode && nextNode.nodeType === Node.TEXT_NODE) {
              nextNode.textContent = '\u200B' + nextNode.textContent;
            } else {
              checkbox.parentNode.insertBefore(zeroWidthSpace, checkbox.nextSibling);
            }
          }
        }
      });
    });
  }

  private normalizeTodoBlock(todoBlock: HTMLElement) {
    const todoItems = Array.from(todoBlock.children).filter((item): item is HTMLElement => item instanceof HTMLElement);
    let hasInvalidItems = false;
    let invalidItems: HTMLElement[] = [];
    
    todoItems.forEach(item => {
      if (!item.querySelector('input[type="checkbox"]')) {
        hasInvalidItems = true;
        invalidItems.push(item);
      }
    });
    
    if (!hasInvalidItems) return;
    
    // 如果有无效项，需要分割todo块
    let currentTodoBlock = todoBlock;
    let nextTodoBlock: HTMLElement | null = null;

    for (let i = 0; i < todoItems.length; i++) {
      const item = todoItems[i];
      if (invalidItems.includes(item)) {
        const basicBlock = basicBlockConfig.createElement();
        basicBlock.replaceChildren(...item.childNodes);
        nextTodoBlock = todoBlockConfig.createElement();
        currentTodoBlock.after(basicBlock, nextTodoBlock);
        item.remove()
        if (currentTodoBlock.children.length == 0) {
          currentTodoBlock.remove()
        }
        currentTodoBlock = nextTodoBlock;
      } else {
        if (currentTodoBlock !== todoBlock) {
          currentTodoBlock.appendChild(item);
        }
      }
    }
    
    if (nextTodoBlock && nextTodoBlock.children.length === 0) {
      nextTodoBlock.remove();
    }
    if (todoBlock.children.length === 0) {
      todoBlock.remove();
    }
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