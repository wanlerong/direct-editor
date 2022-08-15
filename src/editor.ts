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

  bold() {
    let range: Range = this.getSelectionRange()

  }

  hi(): void {
    console.log("say hi")
  }
}

export default Editor