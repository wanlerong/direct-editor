import {RangeIterator} from './rangeIterator'
import {isCharacterDataNode, isTextNode} from "./domUtils";
import {getJson0Path} from "./path";
import JsonML from "./lib/jsonml-dom";
import JsonMLHtml from "./lib/jsonml-html";
import {Toolbar} from "./toolbar";
import {getIntersectionStyle, getSelectionRange} from "./range";

export class Editor {

  public toolbar: Toolbar;

  private idMap = {};

  private theDom: HTMLDivElement;

  private customCallback: Function;
  public asChange: Function;

  private mutationCallback: MutationCallback = (mutations: MutationRecord[], observer: MutationObserver) => {
    // 来自外部的dom变更不需要再向外发送 op
    if (mutations.length >= 1) {
      if (mutations[0].addedNodes.length == 1 && mutations[0].addedNodes[0].nodeName == "SPAN"
        && (mutations[0].addedNodes[0] as Element).getAttribute("class") === "out-op"
      ) {
        return;
      }
    }
    if (this.customCallback) {
      let ops = this.transformMutationsToOps(mutations)
      ops.forEach(op => {
        console.log("send op", JSON.stringify(op))
        this.customCallback(op)
      })
    }
  }

  constructor(dom: HTMLElement, callback: (jsonOp: any) => void, asChangeFunc:Function) {
    let d = document.createElement("div")
    d.setAttribute("class", "direct-editor")
    d.setAttribute("contenteditable", "true")
    let html = dom.innerHTML;
    dom.innerHTML = '';
    d.innerHTML = html;
    dom.appendChild(d);
    this.theDom = d
    this.normalize()
    this.toolbar = new Toolbar(this)
    this.asChange = asChangeFunc

    if (callback) {
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
    }

    // 监听变化
    let _this = this
    d.addEventListener("keydown", function () {
      console.log("keydown")
      setTimeout(() => {
        _this.normalize()
      }, 1)
    })

    // selection change
    d.addEventListener('mouseup', function (){
      setTimeout(()=>{
        _this.toolbar.checkActiveStatus()
      },2)
    });
    
    d.addEventListener('keyup', function (){
      setTimeout(()=>{
        _this.toolbar.checkActiveStatus()
      },2)
    });
  }

  normalize() {
    this.theDom.childNodes.forEach(n => {
      if (n.nodeType == Node.TEXT_NODE) {
        n.parentNode.removeChild(n);
      } else if (n.nodeType == Node.ELEMENT_NODE) {
        if (n.nodeName != "DIV") {
          n.parentNode.removeChild(n);
        }
      }
    })
    if (!this.theDom.hasChildNodes()) {
      const div = document.createElement("div")
      div.appendChild(document.createElement("br"))
      this.theDom.appendChild(div);
    }
  }

  hi(): void {
    console.log("say hi")
  }

  transformMutationsToOps(mutations: MutationRecord[]): any[] {
    let submitOps = []
    // 曾经添加过的nodes
    let everAddedNodes = []
    // 最终新增的nodes
    let theAddedNodes = []
    // 新增的nodes, 但最终被remove的
    let tmpNodes = []
    mutations.forEach((mutation: MutationRecord) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((n) => {
          // 新增的节点，最终被remove了，无需处理
          if (!this.theDom.contains(n)) {
            tmpNodes.push(n)
          } else {
            theAddedNodes.push(n)
            if (n.nodeType == Node.ELEMENT_NODE) {
              // 保证存在 id，可以使得新增的节点一定具有属性，jsonml的path固定从2开始。
              this.generateIdForNode((n as Element))
              let descendents = (n as Element).getElementsByTagName('*');
              for (let i = 0; i < descendents.length; ++i) {
                this.generateIdForNode(descendents[i])
              }
            }
          }
        })
      }
    })
    console.log(mutations.length, "===================")
    // console.log("addedNodes", theAddedNodes, tmpNodes)
    mutations = this.filterMutations(mutations, theAddedNodes)

    let childListMutations = mutations.filter(m => m.type == "childList")
    // 对 mutations 进行排序，先处理父级，可以使得最终观测到的 path 就是需要发送的 op 的 path
    childListMutations.sort((m1, m2) => {
      return getJson0Path(m1.target).length - getJson0Path(m2.target).length
    })
    childListMutations.forEach(mutation => {
      // 删，增，删时，第一个删要处理
      mutation.addedNodes.forEach(addedNode => {
        everAddedNodes.push(addedNode)
      })
      let pathRelatedMutations = mutations.filter(m => m.type === "childList"
        && m.target === mutation.target).reverse()
      let ops = this.getChildListOp(mutation, everAddedNodes, pathRelatedMutations, tmpNodes);
      submitOps.push(...ops)
    });

    mutations.filter(m => m.type == "attributes").forEach(mutation => {
      let ops = this.getAttributeOp(mutation);
      submitOps.push(...ops)
    });

    // 文本的变更放在最后做，可以使得最终观测到的 path 就是需要发送的 op 的 path
    // 只是改文本，不会影响 path 计算
    mutations.filter(m => m.type == "characterData").forEach(mutation => {
      if (mutation.target.nodeType == Node.TEXT_NODE) {
        let ops = this.getTextOp(mutation);
        submitOps.push(...ops)
      }
    });

    return submitOps
  }

  makeId(length) {
    let result = '';
    let characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() *
        charactersLength));
    }
    return result;
  }

  generateIdForNode(n: Element) {
    let id = (n as Element).getAttribute("id")
    if (!id || this.idMap[id]) {
      let newId = this.makeId(10);
      (n as Element).setAttribute("id", newId);
      this.idMap[newId] = 1;
    }
  }


  // 移除掉可以忽略的 mutations
  // 对于可能影响到 path 重放的，不在此处过滤
  filterMutations(mutations: MutationRecord[], theAddedNodes): MutationRecord[] {
    let hasResolvedCharacterDataNodes = []
    mutations.forEach((mutation: MutationRecord, index) => {
      if (mutation.type === "characterData") {
        // 文本节点只用处理一次，因为观测到的就是最终状态的文本
        if (hasResolvedCharacterDataNodes.includes(mutation.target)) {
          delete mutations[index]
          return
        } else {
          hasResolvedCharacterDataNodes.push(mutation.target)
        }
        // 交给新增节点处理
        theAddedNodes.forEach(n => {
          if (n.contains(mutation.target)) {
            delete mutations[index]
            return
          }
        })
        // 已经不存在该文本节点了，改 characterData 无意义，本身 characterData 也不影响 path
        if (!this.theDom.contains(mutation.target)) {
          delete mutations[index]
          return
        }
      } else if (mutation.type === "childList") {
        // 父级被删除/添加了，在子级添加或删除都没有意义，也不会影响别的mutation计算path
        // 交给父级处理
        if (!this.theDom.contains(mutation.target)) {
          delete mutations[index]
          return
        }
        theAddedNodes.forEach(n => {
          if (n.contains(mutation.target)) {
            delete mutations[index]
            return
          }
        })
      } else if (mutation.type === "attributes") {
        // 已经不存在该element节点了，改 attributes 无意义
        if (!this.theDom.contains(mutation.target)) {
          delete mutations[index]
          return
        }
        // 由 added node 自动生成的 id，交给 added node op 处理，无需再发送 attribute 变更
        if (mutation.attributeName === "id") {
          let id = (mutation.target as Element).getAttribute("id")
          if (id && this.idMap[id]) {
            delete mutations[index]
            return
          }
        }
        // 交给新增节点处理
        theAddedNodes.forEach(n => {
          if (n.contains(mutation.target)) {
            delete mutations[index]
            return
          }
        })
      }
    })

    return mutations.filter(m => m)
  }

  getChildListOp(mutation, everAddedNodes, mutations, tmpNodes) {
    tmpNodes = everAddedNodes.filter(n => tmpNodes.includes(n))
    let ops = [];
    mutation.addedNodes.forEach(addedNode => {
      // 新增的节点，最终被remove了，无需处理
      if (!this.theDom.contains(addedNode)) {
        return;
      }
      if (addedNode.nodeType == Node.TEXT_NODE) {
        ops.push({
          p: this.getPath(mutation, mutations, tmpNodes),
          li: (addedNode as Text).data
        })
      } else if (addedNode.nodeType == Node.ELEMENT_NODE) {
        ops.push({
          p: this.getPath(mutation, mutations, tmpNodes),
          li: JsonML.fromHTML(addedNode, null)
        })
      }
    })

    mutation.removedNodes.forEach(removedNode => {
      // 曾经add过这个节点，但最终被remove了。在 add 和 remove 时都不用处理
      if (everAddedNodes.includes(removedNode) && !this.theDom.contains(removedNode)) {
        return;
      }
      if (removedNode.nodeType == Node.TEXT_NODE) {
        ops.push({
          p: this.getPath(mutation, mutations, tmpNodes),
          ld: (removedNode as Text).data
        })
      } else if (removedNode.nodeType == Node.ELEMENT_NODE) {
        ops.push({
          p: this.getPath(mutation, mutations, tmpNodes),
          ld: JsonML.fromHTML(removedNode, null) // ld 的内容实际不是特别重要，因为是把idx直接删掉
        })
      }
    })

    return ops
  }

  // 逆向重放 mutations 以获取当时在 childNode list 中的 idx
  getPath(mutation: MutationRecord, mutations: MutationRecord[], tmpNodes) {
    if (!tmpNodes) {
      tmpNodes = []
    }
    // 重放每一层比较难实现
    // 如果优先处理父级的 mutations，那后面子级的就可以通过父级定位。因为父级的位置就是最终的位置.
    // 所以之前就对 mutation 进行了排序, 优先处理父级
    // 只需要回溯当前层即可，就像把字符变更放在最后处理一样
    let path = getJson0Path(mutation.target)
    let nodes: Node[] = []
    mutation.target.childNodes.forEach(n => {
      nodes.push(n)
    })
    for (let i = 0; i < mutations.length; i++) {
      let m = mutations[i]
      m.addedNodes.forEach(a => {
        nodes.splice(nodes.indexOf(a), 1)
      })
      m.removedNodes.forEach(r => {
        if (nodes.length === 0) {
          nodes.push(r)
          return
        }
        if (m.previousSibling) {
          nodes.splice(nodes.indexOf(m.previousSibling) + 1, 0, r)
          return;
        } else {
          nodes.unshift(r)
          return;
        }
      })
      if (m === mutation) {
        break;
      }
    }
    if (mutation.previousSibling) {
      let idx = 0
      for (let i = 0; i < nodes.length; i++) {
        // 有临时新增的 node，不会发送给别人，导致对于对方而言 index 过大了
        if (!tmpNodes.includes(nodes[i])) {
          idx++
        }
        if (mutation.previousSibling === nodes[i]) {
          break
        }
      }
      path.push(idx + 2)
    } else {
      path.push(2)
    }

    return path
  }

  getAttributeOp(mutation) {
    let ops = [];
    let oldValue = mutation.oldValue
    let value = (mutation.target as Element).getAttribute(mutation.attributeName)

    let p = getJson0Path(mutation.target)
    p.push(1, mutation.attributeName)
    console.log(mutation.attributeName, oldValue, value)

    if (oldValue == null && value) {
      ops.push({
        p: p,
        oi: value
      })
    } else if (oldValue && value == null) {
      ops.push({
        p: p,
        od: oldValue
      })
    } else if (oldValue && value) {
      ops.push({
        p: p,
        oi: value,
        od: oldValue
      })
    }
    return ops
  }

  getTextOp(mutation) {
    let ops = [];
    let oldValue = mutation.oldValue
    let value = mutation.target.data
    let range = getSelectionRange()
    let unModifiedRightString = value.substring(range.endOffset, value.length);
    let idx = 0;
    for (let i = 0; i < Math.min(value.length, oldValue.length) - unModifiedRightString.length; i++) {
      if (value.charAt(i) === oldValue.charAt(i)) {
        idx++;
        continue;
      }
      break;
    }

    let del, insert;
    if (oldValue.substring(oldValue.length - unModifiedRightString.length) ===
      value.substring(value.length - unModifiedRightString.length)) {
      del = oldValue.substring(idx, oldValue.length - unModifiedRightString.length)
      insert = value.substring(idx, value.length - unModifiedRightString.length)
    } else {
      idx = 0
      del = oldValue
      insert = value
    }

    let p = getJson0Path(mutation.target)
    p.push(idx)
    // console.log(oldValue, value, idx, del, insert)
    if (del.length) {
      ops.push({
        p: p,
        sd: del
      })
    }
    if (insert.length) {
      ops.push({
        p: p,
        si: insert
      })
    }
    return ops
  }

  applyOpToDom(ops) {
    ops.forEach(op => {
      console.log("apply received op")
      let hasLd = op.ld !== undefined
      let hasLi = op.li !== undefined
      let hasSi = op.si !== undefined
      let hasSd = op.sd !== undefined
      let hasOi = op.oi !== undefined
      let hasOd = op.od !== undefined
      let path = op.p;
      let ele: any = this.theDom
      let target: any = this.theDom

      if (hasSi || hasSd) {
        let strIdx = path.pop();
        let idx = path.pop() - 2;
        path.forEach(p => {
          target = ele.childNodes[p - 2]
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
        let idx = path.pop() - 2;
        path.forEach(p => {
          target = ele.childNodes[p - 2]
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
          target = ele.childNodes[p - 2]
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
  }
}