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
      h1: false,
      h2: false,
      h3: false,
      h4: false,
      h5: false,
      h6: false,
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
    let targetDivs = []
    iterateSubtree(new RangeIterator(range), (node) => {
      while (true) {
        if (node.nodeName == "DIV") {
          if (!targetDivs.includes(node)) {
            targetDivs.push(node)
          }
          break
        }
        node = node.parentNode
      }
    })

    targetDivs.forEach((td: HTMLElement) => {
      let hTag: HTMLElement = document.createElement(level)
      hTag.innerText = td.innerText;
      td.innerHTML = ''
      td.appendChild(hTag)
    })
    this.checkActiveStatus()
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

    let blockType = getIntersectionBlockType()
    this.activeStatus.h1 = false
    this.activeStatus.h2 = false
    this.activeStatus.h3 = false
    this.activeStatus.h4 = false
    this.activeStatus.h5 = false
    this.activeStatus.h6 = false
    if (blockType == BlockType.BLOCK_TYPE_H1) {
      this.activeStatus.h1 = true
    } else if (blockType == BlockType.BLOCK_TYPE_H2) {
      this.activeStatus.h2 = true
    } else if (blockType == BlockType.BLOCK_TYPE_H3) {
      this.activeStatus.h3 = true
    } else if (blockType == BlockType.BLOCK_TYPE_H4) {
      this.activeStatus.h4 = true
    } else if (blockType == BlockType.BLOCK_TYPE_H5) {
      this.activeStatus.h5 = true
    } else if (blockType == BlockType.BLOCK_TYPE_H6) {
      this.activeStatus.h6 = true
    }
    
    this.editor.asChange(this.activeStatus)
  }
}