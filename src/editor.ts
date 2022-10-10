import {RangeIterator} from './rangeIterator'
import {isCharacterDataNode, isTextNode} from "./domUtils";

export class Editor {
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
    let startIsText = isTextNode(range.startContainer)
    let endIsText = isTextNode(range.endContainer)
    if (startIsText && endIsText && range.startContainer == range.endContainer) {
      endOffset = range.endOffset - range.startOffset
    }
    if (startIsText) {
      let beforeText = (range.startContainer as Text).data.substring(0, range.startOffset);
      let afterText = (range.startContainer as Text).data.substring(range.startOffset);
      let parentNode = range.startContainer.parentNode;
      if (beforeText !== '' && afterText !== '') {
        let newNode = document.createElement(parentNode.nodeName)
        newNode.innerText = beforeText;
        (range.startContainer as Text).data = afterText
        parentNode.parentNode.insertBefore(newNode, parentNode)
        range.setStart(range.startContainer, 0)
      }
    }

    if (endIsText) {
      let beforeText = (range.endContainer as Text).data.substring(0, endOffset);
      let afterText = (range.endContainer as Text).data.substring(endOffset);
      let parentNode = range.endContainer.parentNode;

      if (beforeText !== '' && afterText !== '') {
        let newNode = document.createElement(parentNode.nodeName)
        newNode.innerText = afterText;
        (range.endContainer as Text).data = beforeText;
        parentNode.parentNode.insertBefore(newNode, parentNode.nextSibling)
        range.setEnd(range.endContainer, endOffset)
      }
    }
  }

  iterateSubtree(rangeIterator: RangeIterator, func: (node: Node) => void) {
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