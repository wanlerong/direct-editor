import JsonMLHtml from "./lib/jsonml-html";
import {Toolbar} from "./toolbar";
import {getSelectionRange, setRange} from "./range";
import {
  getClosestAncestorByNodeName,
} from "./domUtils";
import {isChromeBrowser} from "./lib/util";
import {handleBackspace, handleTab} from "./handlers/keydownHandler";
import {indentLi, isNestedLi} from "./components/ul";
import {ActiveStatus} from "./const/activeStatus";
import {UndoManager} from "./undoManager";
import {Delta, DeltaItem, Op} from "./lib/delta";
import {MutationHandler} from "./lib/mutation";

export class Editor {

  public toolbar: Toolbar;
  public undoManager: UndoManager;
  public mutationHandler: MutationHandler;
  public theDom: HTMLDivElement;
  
  // whole deltas for the editor content
  public deltas: Delta[]

  private customCallback: (ops: Op[]) => void;
  public asChange: (as: ActiveStatus) => void;

  private mutationCallback: MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
    // applyDelta 所产生的 mutation，直接 return。因为已经知道 op 了，无需通过 mutation 再转 op。
    // 来自外部的 dom 变更不需要再向外发送 op
    if (mutations.length >= 1) {
      if (mutations[0].addedNodes.length == 1 && mutations[0].addedNodes[0].nodeName == "SPAN"
        && (mutations[0].addedNodes[0] as Element).getAttribute("class") === "out-op"
      ) {
        return;
      }
    }
    let ops = this.mutationHandler.transformMutationsToOps(mutations)
    if (ops.length == 0) {
      return;
    }
    let delta = new Delta(ops)
    this.undoManager.push({
      delta: delta
    })
    this.deltas.push(delta)
    if (this.customCallback) {
      console.log("send ops", JSON.stringify(ops))
      this.customCallback(ops)
    }
  }

  constructor(dom: HTMLElement, callback: (ops: Op[]) => void, asChangeFunc: (as: ActiveStatus) => void) {
    if (!isChromeBrowser() && process.env.NODE_ENV !== 'test') {
      dom.innerHTML = `
            <div style="text-align: center; padding: 50px;">
                <h1>仅支持在 Chrome 浏览器中使用</h1>
                <p>请使用 Chrome 浏览器以继续使用该编辑器。</p>
            </div>
        `;
      return;
    }
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
    this.asChange = asChangeFunc

    this.customCallback = callback
    const observer = new MutationObserver(this.mutationCallback);
    observer.observe(d, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeOldValue: true,
      characterDataOldValue: true,
    });

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

    // let debounceTimer
    // The input event fires when the value of a contenteditable element has been changed 
    // as a direct result of a user action such as typing in it.
    // d.addEventListener('input', () => {
    //   if (debounceTimer) {
    //     clearTimeout(debounceTimer);
    //   }
    //   debounceTimer = setTimeout(() => {
    //     this.saveState()
    //   }, 300);
    // });
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
    })

  }
  
  // undo redo
  // op from other client
  applyDelta(delta: Delta, source ?: string) {
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
        let outOp = document.createElement("span")
        outOp.setAttribute("class", "out-op")
        let targetTextNode: any = target.childNodes[idx]
        target.insertBefore(outOp, targetTextNode)
        outOp.appendChild(targetTextNode)
        if (hasSd) {
          targetTextNode.deleteData(strIdx, op.sd.length)
        } else {
          targetTextNode.insertData(strIdx, op.si)
        }
        target.replaceChild(outOp.childNodes[0], outOp)
        // todo set selection if in one line
      }

      if (hasLd || hasLi) {
        let idx = path.pop() as number - 2;
        path.forEach(p => {
          target = ele.childNodes[p as number - 2]
          ele = target
        })
        let outOp = document.createElement("span")
        outOp.setAttribute("class", "out-op")
        if (typeof op.li === "string") {
          outOp.appendChild(document.createTextNode(op.li))
        } else if (Array.isArray(op.li)) {
          outOp.appendChild(JsonMLHtml.toHTML(op.li, null))
        }

        if (hasLd && hasLi) {
          target.replaceChild(outOp, target.childNodes[idx])
          target.replaceChild(outOp.childNodes[0], outOp)
        } else if (hasLi && !hasLd) {
          target.insertBefore(outOp, target.childNodes[idx])
          target.replaceChild(outOp.childNodes[0], outOp)
        } else {
          target.replaceChild(outOp, target.childNodes[idx])
          target.removeChild(outOp)
        }
      }

      if (hasOi || hasOd) {
        let attrName = path.pop();
        path.pop();

        path.forEach(p => {
          target = ele.childNodes[p as number - 2]
          ele = target
        })
        let outOp = document.createElement("span");
        outOp.setAttribute("class", "out-op");
        let parentNode = (target as Element).parentNode;
        parentNode.insertBefore(outOp, target)

        outOp.appendChild(target)
        if (hasOi) {
          target.setAttribute(attrName, op.oi)
        } else {
          target.removeAttribute(attrName)
        }
        parentNode.replaceChild(outOp.childNodes[0], outOp)
      }
    })
    
    if (source === 'undoRedo') {
      if (this.customCallback) {
        console.log("send ops", JSON.stringify(delta.ops))
        this.customCallback(delta.ops)
      }
    }
    
    this.deltas.push(delta)
  }
}