import JsonMLHtml from "./lib/jsonml-html";
import {Toolbar} from "./toolbar";
import {getSelectionRange, setRange} from "./range";
import {getClosestAncestorByNodeName} from "./domUtils";
import {handleBackspace, handleTab} from "./handlers/keydownHandler";
import {indentLi, isNestedLi} from "./components/ul";
import {ActiveStatus} from "./const/activeStatus";
import {UndoManager} from "./undoManager";
import {Delta, Op} from "./lib/delta";
import {MutationHandler} from "./lib/mutation";
import {DeltaSource} from "./const/const";
import {domToVirtualNode, VirtualNode} from "./lib/virtualNode";
import {handlePaste} from "./handlers/pasteHandler";

export class Editor {

  public deltaSeq: number;
  public toolbar: Toolbar;
  public undoManager: UndoManager;
  public mutationHandler: MutationHandler;
  public theDom: HTMLDivElement;
  private mutationObserver: MutationObserver;
  // whole deltas for the editor content
  public deltas: Delta[]
  
  public virtualNode: VirtualNode
  private mutationsBuffer: MutationRecord[];
  private debounceTimeout: NodeJS.Timeout;

  private customCallback: (ops: Op[]) => void;
  public asChange: (as: ActiveStatus) => void;

  private mutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
    this.mutationsBuffer.push(...mutations);
    
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    // Set a buffer for mutations and process them every 200ms.
    // 1. Improves overall performance.
    // 2. Since normalization usually follows immediately, undoing a batch will return the state to the normalized one, 
    // avoiding undoing to a non-normalized state, which would be immediately normalized back and make the undo ineffective.
    this.debounceTimeout = setTimeout(() => {
      this.processMutations();
    }, 200);
  };

  processMutations = () => {
    const mutationsToProcess = [...this.mutationsBuffer];
    this.mutationsBuffer = [];
    if (mutationsToProcess.length === 0) {
      return;
    }
    console.log("Processing mutations", mutationsToProcess.length);
    let ops = this.mutationHandler.transformMutationsToOps(mutationsToProcess)
    // todo 增量更新
    this.virtualNode = domToVirtualNode(this.theDom)
    if (ops.length == 0) {
      return;
    }
    let delta = new Delta(ops)
    this.undoManager.push({
      delta: delta
    })
    this.appendDelta(delta)
    if (this.customCallback) {
      console.log("send ops", JSON.stringify(ops))
      this.customCallback(ops)
    }
  };
  
  appendDelta(delta: Delta) {
    this.deltaSeq++
    delta.seq = this.deltaSeq
    this.deltas.push(delta)
    console.log("deltas", JSON.stringify(this.deltas))
  }
  
  getNextDeltas(delta: Delta) {
    return this.deltas.filter(it => it.seq > delta.seq)
  }
  
  constructor(dom: HTMLElement, callback: (ops: Op[]) => void, asChangeFunc: (as: ActiveStatus) => void) {
    let d = document.createElement("div")
    d.setAttribute("class", "direct-editor")
    d.setAttribute("contenteditable", "true")
    d.innerHTML = dom.innerHTML;
    dom.replaceChildren(d)
    this.theDom = d
    this.normalize()
    this.toolbar = new Toolbar(this)
    this.undoManager = new UndoManager(this)
    this.mutationHandler = new MutationHandler(this)
    this.deltas = []
    this.deltaSeq = 0
    this.asChange = asChangeFunc

    this.customCallback = callback
    this.mutationObserver = new MutationObserver(this.mutationCallback)
    this.mutationsBuffer = [];
    this.debounceTimeout = null;
    this.observe()
    
    this.virtualNode = domToVirtualNode(this.theDom)
    console.log(this.virtualNode)

    // 监听变化
    let _this = this
    d.addEventListener("keydown", function (e: KeyboardEvent) {
      handleBackspace(e)
      handleTab(e)

      if (e.key === 'Enter') {
        let range = getSelectionRange()
        const startLi = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement;
        if (startLi && range.collapsed && (startLi.innerText == '' || startLi.innerText == '\n')) {
          e.preventDefault();
          if (isNestedLi(startLi)) {
            const {startContainer, startOffset, endContainer, endOffset} = range.cloneRange();
            indentLi(startLi, false)
            setRange(startContainer, startOffset, endContainer, endOffset)
          } else {
            _this.toolbar.unToggleList(startLi.parentElement.nodeName == "UL" ? 'ul' : 'ol')
          }
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          _this.undoManager.redo();
        } else {
          _this.undoManager.undo();
        }
      }
      
      setTimeout(() => {
        _this.normalize()
      }, 1)
    })

    // selection change
    d.addEventListener('mouseup', function (e: MouseEvent) {
      setTimeout(() => {
        _this.toolbar.checkActiveStatus()
      }, 2)
    });

    d.addEventListener('keyup', function () {
      setTimeout(() => {
        _this.toolbar.checkActiveStatus()
      }, 2)
    });

    d.addEventListener("paste", function (e: ClipboardEvent) {
      handlePaste(e)
      _this.normalize()
    });
  }

  normalize() {
    this.theDom.childNodes.forEach(n => {
      if (n.nodeType == Node.TEXT_NODE) {
        n.parentNode.removeChild(n);
      } else if (n.nodeType == Node.ELEMENT_NODE) {
        // first level can only be DIV
        if (n.nodeName != "DIV") {
          n.parentNode.removeChild(n);
        }
      }
    });
    
    ['ul', 'ol'].forEach(listtype => {
      let i = 0;
      // merge sibling ul nodes
      while (i < this.theDom.childNodes.length) {
        const currentDiv: HTMLElement = this.theDom.childNodes[i] as HTMLElement;
        const ulInCurrentDiv = currentDiv.querySelector(listtype);
        i++;
        if (ulInCurrentDiv) {
          // Merge with subsequent divs containing ul elements
          while (i < this.theDom.childNodes.length) {
            const nextDiv = this.theDom.childNodes[i] as HTMLElement;
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
 

    // remove all empty span
    const spanItems = this.theDom.querySelectorAll('span');
    spanItems.forEach((span) => {
      if (span.textContent == "") {
        span.remove()
      }
    });

    let toRemove = [];

    Array.from(this.theDom.childNodes).forEach(n => {
      if (n.nodeType == Node.TEXT_NODE) {
        n.parentNode.removeChild(n);
      } else if (n.nodeType == Node.ELEMENT_NODE) {
        // first level can only be DIV
        if (n.nodeName != "DIV") {
          n.parentNode.removeChild(n);
        } else {
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

          // if div contain ul, it should only have one child which is ul
          let firstLevelUl = Array.from(n.childNodes).find(node => node.nodeType === Node.ELEMENT_NODE && ((node as HTMLElement).tagName === 'UL' || (node as HTMLElement).tagName === 'OL'))
          if (firstLevelUl && n.childNodes.length > 1) {
            let newDiv = document.createElement("div")
            newDiv.appendChild(firstLevelUl);
            (n as HTMLElement).insertAdjacentElement('afterend', newDiv)
          }

        }
      }
    })

    toRemove.forEach(it => it.remove())

    if (!this.theDom.hasChildNodes()) {
      const div = document.createElement("div")
      div.appendChild(document.createElement("br"))
      this.theDom.appendChild(div);
    }

    // br is like a "placeholder" for text
    const listItems = this.theDom.querySelectorAll('li');
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

    Array.from(this.theDom.childNodes).forEach(n => {
      if ((n as HTMLElement).className !== 'row') {
        (n as HTMLElement).className = 'row'
      }
      this.processNode(n);
    })
    
    // 获取所有span元素并按逆序处理，确保从最内层开始处理
    const spans = this.theDom.getElementsByTagName('span');
    const spansArray = Array.from(spans).reverse();

    spansArray.forEach(span => {
      this.processSpan(span);
    });
  }
  
  // unwrap 所有不支持的 html 标签
  private processNode(node: Node) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const element = node as HTMLElement;
      
      // 后序遍历：先递归处理子节点
      for (let i = element.childNodes.length - 1; i >= 0; i--) {
        this.processNode(element.childNodes[i]);
      }

      if (!this.isAllowed(element)) {
        this.unwrap(element);
      }
    }
  }
  
  private isAllowed(element: HTMLElement): boolean {
    const allowedTags = new Set([
      'span', 'a', 'br',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li', 'div'
    ]);
    return allowedTags.has(element.tagName.toLowerCase());
  }

  // 将元素的子节点提升到父级
  private unwrap(element: HTMLElement) {
    const parent = element.parentNode;
    if (!parent) return;

    const fragment = document.createDocumentFragment();
    while (element.firstChild) {
      fragment.appendChild(element.firstChild);
    }

    parent.replaceChild(fragment, element);
  }
  
  // normalize nested spans to plain
  private processSpan(span: HTMLSpanElement) {
    const parent = span.parentElement;
    if (!parent) return;
    const fragment = document.createDocumentFragment();
    if (span.childNodes.length == 1 && span.firstChild.nodeType == Node.TEXT_NODE) {
      return;
    }

    Array.from(span.childNodes).forEach(child => {
      if (child.nodeType === Node.TEXT_NODE) {
        const textContent = child.textContent?.trim();
        if (textContent) {
          const newSpan = document.createElement('span');
          newSpan.textContent = textContent;
          fragment.appendChild(newSpan);
        }
      } else if (child.nodeType === Node.ELEMENT_NODE) {
        if (child instanceof HTMLSpanElement) {
          // 子span已经被处理过，直接添加
          fragment.appendChild(child);
        } else {
          // 非span元素保留原结构
          fragment.appendChild(child);
        }
      }
    });

    parent.replaceChild(fragment, span);
  }

  observe() {
    this.mutationObserver.observe(this.theDom, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    })
  }
  
  // undo redo
  // op from other client
  applyDelta(delta: Delta, source ?: DeltaSource) {
    this.mutationObserver.disconnect()
    console.log("apply delta")
    delta.ops.forEach(op => {
      let hasLd = op.ld !== undefined
      let hasLi = op.li !== undefined
      let hasSi = op.si !== undefined
      let hasSd = op.sd !== undefined
      let hasOi = op.oi !== undefined
      let hasOd = op.od !== undefined
      let path = [...op.p];
      
      let ele: any = this.theDom
      let target: any = this.theDom

      if (hasSi || hasSd) {
        let strIdx = path.pop();
        let idx = path.pop() as number - 2;
        path.forEach(p => {
          target = ele.childNodes[p as number - 2]
          ele = target
        })
        let targetTextNode: any = target.childNodes[idx]
        if (hasSd) {
          targetTextNode.deleteData(strIdx, op.sd.length)
        } else {
          targetTextNode.insertData(strIdx, op.si)
        }
        // todo set selection if in one line
      }

      if (hasLd || hasLi) {
        let idx = path.pop() as number - 2;
        path.forEach(p => {
          target = ele.childNodes[p as number - 2]
          ele = target
        })
        var childLi
        if (typeof op.li === "string") {
          childLi = document.createTextNode(op.li)
        } else if (Array.isArray(op.li)) {
          childLi = JsonMLHtml.toHTML(op.li, null)
        }
        if (hasLd && hasLi) {
          target.replaceChild(childLi, target.childNodes[idx])
        } else if (hasLi && !hasLd) {
          target.insertBefore(childLi, target.childNodes[idx])
        } else {
          target.removeChild(target.childNodes[idx])
        }
      }

      if (hasOi || hasOd) {
        let attrName = path.pop();
        path.pop();

        path.forEach(p => {
          target = ele.childNodes[p as number - 2]
          ele = target
        })
        if (hasOi) {
          target.setAttribute(attrName, op.oi)
        } else {
          target.removeAttribute(attrName)
        }
      }
    })
    
    this.observe()
    if (source === DeltaSource.UndoRedo) {
      if (this.customCallback) {
        console.log("send ops", JSON.stringify(delta.ops))
        this.customCallback(delta.ops)
      }
    }
    
    this.appendDelta(delta)
    // todo 增量更新
    this.virtualNode = domToVirtualNode(this.theDom)
  }

  applyOps(ops: Op[]) {
    this.applyDelta(new Delta(ops), DeltaSource.OUT)
  }
}