import {Editor} from "./editor"
import {RangeIterator} from "./rangeIterator";
import {getClosestAncestorByNodeName, insertAfter, isCharacterDataNode} from "./domUtils";
import {getIntersectionBlockType, getIntersectionStyle, getSelectionRange, iterateSubtree, splitRange} from "./range";
import {BlockType, HTitleLevel} from "./const/const";

export class Toolbar {
  private editor: Editor
  private activeStatus: any

  constructor(editor: Editor) {
    this.editor = editor
    this.activeStatus = {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      blockType: BlockType.BLOCK_TYPE_NONE,
    }
  }

  formatText(styleKey: string, value: string | null) {
    let range = getSelectionRange();
    if (range.collapsed) {
      return;
    }
    splitRange(range);
    this.editor.normalize();
    this.applyInlineStyles({ [styleKey]: value }, range);
    this.checkActiveStatus();
  }
  
  bold(value: boolean) {
    this.formatText('fontWeight', value ? 'bold' : null);
  }

  italic(value: boolean) {
    this.formatText('fontStyle', value ? 'italic' : null);
  }

  underline(value: boolean) {
    this.formatText('textDecoration', value ? 'underline' : null);
  }

  strikethrough(value: boolean) {
    this.formatText('textDecoration', value ? 'line-through' : null);
  }

  applyInlineStyles(styles: any, range: Range) {
    iterateSubtree(new RangeIterator(range), (node) => {
      if (isCharacterDataNode(node)) {
        if (node.parentElement.nodeName == "SPAN") {
          for (const property in styles) {
            node.parentElement.style[property] = styles[property]
          }
        } else if (node.parentElement.nodeName == "DIV" || node.parentElement.nodeName == "LI") {
          let span = document.createElement('SPAN')
          span.innerText = (node as Text).data
          for (const property in styles) {
            span.style[property] = styles[property]
          }
          node.parentElement.replaceChild(span, node)
        }
      }
      return false
    })
  }

  // set the selection range to h1/h2/h3... title
  title(level: HTitleLevel) {
    let range = getSelectionRange()
    let targetDivs: HTMLElement[] = []
    iterateSubtree(new RangeIterator(range), (node) => {
      while (node) {
        if (node.nodeName == "DIV") {
          if (!targetDivs.includes(node as HTMLElement)) {
            targetDivs.push(node as HTMLElement)
          }
          break
        }
        node = node.parentNode
      }
      return false
    })
    if (targetDivs.length == 0) {
      return
    }
    if (level == HTitleLevel.LEVEL_NONE) {
      targetDivs.forEach((td: HTMLElement) => {
        td.innerHTML = td.innerText
      })
    } else {
      targetDivs.forEach((td: HTMLElement) => {
        let hTag: HTMLElement = document.createElement(level)
        hTag.innerText = td.innerText;
        td.innerHTML = ''
        td.appendChild(hTag)
      })
    }

    let sc = targetDivs[0].firstChild
    let ec = targetDivs[targetDivs.length - 1].firstChild
    if (!isCharacterDataNode(sc)) {
      sc = sc.firstChild
      ec = ec.firstChild
    }
    range.setStart(sc, 0)
    range.setEnd(ec, ec.textContent.length)
    this.checkActiveStatus()
    this.editor.normalize()
  }

  getActiveStatus() {
    return this.activeStatus
  }

  checkActiveStatus() {
    let is = getIntersectionStyle()
    this.activeStatus.bold = is['fontWeight'] == 'bold'
    this.activeStatus.italic = is['fontStyle'] == 'italic'
    this.activeStatus.strikethrough = is['textDecoration'] == 'line-through'
    this.activeStatus.underline = is['textDecoration'] == 'underline'
    this.activeStatus.blockType = getIntersectionBlockType()

    this.editor.asChange(this.activeStatus)
  }

  unorderedList() {
    let range = getSelectionRange()
    let targetDivsArr: HTMLElement[][] = []
    let targetDivs: HTMLElement[] = []
    iterateSubtree(new RangeIterator(range), (node) => {
      while (node) {
        if (node.nodeName == "DIV") {
          const ulInCurrentDiv = (node as HTMLElement).querySelector('ul');
          if (ulInCurrentDiv) {
            targetDivsArr.push(targetDivs)
            targetDivs = []
            break
          }
          if (!targetDivs.includes(node as HTMLElement)) {
            targetDivs.push(node as HTMLElement)
          }
          break
        }
        node = node.parentNode
      }
      return false
    })
    if (targetDivs.length != 0) {
      targetDivsArr.push(targetDivs)
    }
    
    targetDivsArr.forEach((targetDivs2) => {
      if (targetDivs2.length == 0) {
        return
      }
      let ul = document.createElement("ul")
      targetDivs2.forEach((targetDiv, idx) => {
        let li = document.createElement("li")
        li.innerText = targetDiv.innerText
        ul.appendChild(li)
        if (idx != 0) {
          targetDiv.remove()
        }
      })
      targetDivs2[0].innerHTML = ''
      targetDivs2[0].appendChild(ul)
    })
    
    this.editor.normalize()
    this.checkActiveStatus()
  }
  
  unUnorderedList() {
    let range = getSelectionRange()
    let ul: HTMLElement = getClosestAncestorByNodeName(range.startContainer, 'UL') as HTMLElement
    if (!ul) {
      return
    }

    let li1: HTMLElement = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement
    let li2: HTMLElement = getClosestAncestorByNodeName(range.endContainer, 'LI') as HTMLElement
    let idx1 = Array.of(...ul.childNodes).indexOf(li1)
    let idx2 = Array.of(...ul.childNodes).indexOf(li2)

    let toRemove: HTMLElement[] = []
    let newDiv,newUl: HTMLElement = null
    let n1 = ul.parentNode
    
    Array.of(...ul.childNodes).forEach((li, idx) => {
      if (idx < idx1) {
        return
      } else if (idx >= idx1 && idx <= idx2) {
        const div = document.createElement("div");
        div.innerHTML = (li as HTMLElement).innerHTML
        insertAfter(n1, div)
        n1 = div
        toRemove.push((li as HTMLElement))
      } else {
        if (newDiv == null) {
          newDiv = document.createElement("div");
          newUl = document.createElement("ul");
          newDiv.appendChild(newUl)
        } 
        newUl.appendChild(li)
      }
    })
    toRemove.forEach(it => it.remove())
    if (newDiv) {
      insertAfter(n1, newDiv)
    }
    this.editor.normalize()
    this.checkActiveStatus()
  }
}