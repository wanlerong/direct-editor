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
import BlockNormalizer from "./block/blockNormalizer";

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
  
  private blockNormalizer: BlockNormalizer;

  private customCallback: (ops: Op[]) => void;
  public asChange: (as: ActiveStatus) => void;

  private mutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
    this.mutationsBuffer.push(...mutations);
    if (this.debounceTimeout) {
      clearTimeout(this.debounceTimeout);
    }
    // Set a buffer for mutations and process them every 200ms.
    // 1. Improves overall performance.
    this.debounceTimeout = setTimeout(() => {
      // dom 变更触发 normalize，避免从控制台直接修改 html 导致 non-normalized state
      // 2. avoiding undoing to a non-normalized state, which would be immediately normalized back and make the undo ineffective.
      // avoiding send a non-normalized state to other real time Collaborative-editing client
      this.normalize()
      // 强制同步处理 MutationObserver 的队列, 立刻获取到 normalize 产生的 Mutations.
      const syncMutations = observer.takeRecords();
      this.processMutations([...this.mutationsBuffer, ...syncMutations]);
    }, 200);
  };

  processMutations = (mutationsToProcess: MutationRecord[]) => {
    this.mutationsBuffer = [];
    if (mutationsToProcess.length === 0) {
      return;
    }
    console.log("Processing mutations", mutationsToProcess.length);
    let ops = this.mutationHandler.transformMutationsToOps(mutationsToProcess)
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
    this.blockNormalizer = new BlockNormalizer()
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
    this.blockNormalizer.normalize(this.theDom)
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