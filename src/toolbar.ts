import {Editor} from "./editor"
import {RangeIterator} from "./rangeIterator";
import {isCharacterDataNode, supportStyles} from "./domUtils";
import {getIntersectionStyle, getSelectionRange, iterateSubtree, splitRange} from "./range";

export class Toolbar{
  private editor: Editor
  private activeStatus: any
  
  constructor(editor: Editor) {
    this.editor = editor
    this.activeStatus = {
      bold:false,
      italic:false,
      underline:false,
      strikethrough:false,
    }
  }
  
  bold(value:boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({fontWeight: value ? "bold" : null}, range)
    this.checkActiveStatus()
  }
  italic(value:boolean){
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({fontStyle: value ? "italic" : null}, range)
    this.checkActiveStatus()
  }
  underline(value:boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({textDecoration: value ? "underline" : null}, range)
    this.checkActiveStatus()
  }
  strikethrough(value:boolean) {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({textDecoration: value ? "line-through" : null}, range)
    this.checkActiveStatus()
  }
  
  applyInlineStyles(styles:any, range: Range) {
    console.log(range)
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
  
  getActiveStatus() {
    return this.activeStatus
  }
  checkActiveStatus() {
    let is = getIntersectionStyle()
    console.log(is)
    this.activeStatus.bold = is['fontWeight'] == 'bold'
    this.activeStatus.italic = is['fontStyle'] == 'italic'
    this.activeStatus.strikethrough = is['textDecoration'] == 'line-through'
    this.activeStatus.underline = is['textDecoration'] == 'underline'
    this.editor.asChange(this.activeStatus)
  }
}