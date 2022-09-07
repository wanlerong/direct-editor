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
    console.log(range)
  }

  splitRange(range: Range) {
    // 假设选中的是 text 节点，parentElement is span
    let start: HTMLElement = range.startContainer.parentElement
    let newNode = document.createElement(start.nodeName)
    let beforeText = start.innerText.substring(0, range.startOffset);
    let afterText = start.innerText.substring(range.startOffset);
    if (beforeText !== '' && afterText !== '') {
      newNode.innerText = beforeText;
      start.innerText = afterText;
      start.parentNode.insertBefore(newNode, start)
    }

    let end: HTMLElement = range.endContainer.parentElement
    newNode = document.createElement(end.nodeName)
    let endOffset = range.endOffset
    beforeText = end.innerText.substring(0, range.endOffset);
    afterText = end.innerText.substring(range.endOffset);
    if (beforeText !== '' && afterText !== '') {
      newNode.innerText = afterText;
      end.innerText = beforeText;
      end.parentNode.insertBefore(newNode, end.nextSibling)
    }

    range.setStart(start.firstChild, 0)
    range.setEnd(end.firstChild, endOffset)
  }

  hi(): void {
    console.log("say hi")
  }
}

export default Editor