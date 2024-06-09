import {Editor} from "./editor"
import {RangeIterator} from "./rangeIterator";
import {isCharacterDataNode} from "./domUtils";
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

  bold(value: boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.editor.normalize()
    this.applyInlineStyles({fontWeight: value ? "bold" : null}, range)
    this.checkActiveStatus()
  }

  italic(value: boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.editor.normalize()
    this.applyInlineStyles({fontStyle: value ? "italic" : null}, range)
    this.checkActiveStatus()
  }

  underline(value: boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.editor.normalize()
    this.applyInlineStyles({textDecoration: value ? "underline" : null}, range)
    this.checkActiveStatus()
  }

  strikethrough(value: boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.editor.normalize()
    this.applyInlineStyles({textDecoration: value ? "line-through" : null}, range)
    this.checkActiveStatus()
  }

  applyInlineStyles(styles: any, range: Range) {
    iterateSubtree(new RangeIterator(range), (node) => {
      if (isCharacterDataNode(node)) {
        if (node.parentElement.nodeName == "SPAN") {
          for (const property in styles) {
            node.parentElement.style[property] = styles[property]
          }
        } else if (node.parentElement.nodeName == "DIV") {
          let span = document.createElement('SPAN')
          span.innerText = (node as Text).data
          for (const property in styles) {
            span.style[property] = styles[property]
          }
          node.parentElement.replaceChild(span, node)
        }
      }
    })
  }
  
  // set the selection range to h1/h2/h3... title
  title(level: HTitleLevel) {
    let range = getSelectionRange()
    let targetDivs : HTMLElement[] = []
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
    if (!isCharacterDataNode(sc)){
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
}