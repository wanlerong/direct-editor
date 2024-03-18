import {Editor} from "./editor"
import {RangeIterator} from "./rangeIterator";
import {isCharacterDataNode} from "./domUtils";
import {getSelectionRange, splitRange} from "./range";

export class Toolbar{
  private editor: Editor
  
  constructor(editor: Editor) {
    this.editor = editor
  }
  
  bold() {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({fontWeight:"bold"}, range)
  }
  italic(){
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({fontStyle:"italic"}, range)
  }
  underline() {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({textDecoration:"underline"}, range)
  }
  strikethrough() {
    let range: Range = getSelectionRange()
    splitRange(range)
    this.applyInlineStyles({textDecoration:"line-through"}, range)
  }
  
  applyInlineStyles(styles:any, range: Range) {
    console.log(range)
    this.editor.iterateSubtree(new RangeIterator(range), (node) => {
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
}