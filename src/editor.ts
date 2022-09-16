import {RangeIterator} from './rangeIterator.js'
import {isCharacterDataNode} from "./domUtils.js";

class Editor {
  constructor(dom: HTMLElement) {
    let d = document.createElement("div")
    d.setAttribute("class", "direct-editor")
    d.setAttribute("contenteditable", "true")
    let html = dom.innerHTML;
    dom.innerHTML = '';
    d.innerHTML = html;
    dom.appendChild(d);
  }

  getSelectionRange(): Range {
    return window.getSelection().getRangeAt(0)
  }

  // 1. 确定 range
  // 2. 对 range 内的节点应用加粗
  bold() {
    let range: Range = this.getSelectionRange()
    this.splitRange(range)
    this.iterateSubtree(new RangeIterator(range), (node) => {
      if (isCharacterDataNode(node)) {
        let textContainer: HTMLElement = (node.parentNode as HTMLElement);
        if (textContainer.tagName == "SPAN") {
          textContainer.style.fontWeight = "bold";
        }
      }
    })
  }

  splitRange(range: Range) {
    let endOffset = range.endOffset
    if (range.startContainer == range.endContainer) {
      endOffset = range.endOffset - range.startOffset
    }
    // 假设选中的是 text 节点，parentElement is span
    // 在头尾边界点的创建新的 span 节点
    let start: HTMLElement = range.startContainer.parentElement
    let end: HTMLElement = range.endContainer.parentElement

    let newNode = document.createElement(start.nodeName)
    let beforeText = start.innerText.substring(0, range.startOffset);
    let afterText = start.innerText.substring(range.startOffset);
    if (beforeText !== '' && afterText !== '') {
      newNode.innerText = beforeText;
      start.innerText = afterText;
      start.parentNode.insertBefore(newNode, start)
    }
    newNode = document.createElement(end.nodeName)
    beforeText = end.innerText.substring(0, endOffset);
    afterText = end.innerText.substring(endOffset);
    if (beforeText !== '' && afterText !== '') {
      newNode.innerText = afterText;
      end.innerText = beforeText;
      end.parentNode.insertBefore(newNode, end.nextSibling)
    }

    range.setStart(start.firstChild, 0)
    range.setEnd(end.firstChild, endOffset)
  }

  iterateSubtree(rangeIterator: RangeIterator, func: (node: Node) => void) {
    console.log(rangeIterator);
    for (let node: Node; (node = rangeIterator.traverse());) {
      func(node)
      let subRangeIterator: RangeIterator = rangeIterator.getSubtreeIterator();
      if (subRangeIterator != null) {
        this.iterateSubtree(subRangeIterator, func);
      }
    }
  }

  hi(): void {
    console.log("say hi")
  }
}

export default Editor