import {isCharacterDataNode} from "./domUtils";

// range 遍历器
class RangeIterator {
  private range: Range;
  private first: Node;
  private last: Node;
  private next: Node;

  constructor(range: Range) {
    this.range = range
    if (!range.collapsed) {
      if (range.startContainer == range.endContainer && isCharacterDataNode(range.startContainer)) {
        this.first = this.last = this.next = range.startContainer
      } else {

        if (range.startContainer == range.commonAncestorContainer && !isCharacterDataNode(range.startContainer)) {
          this.first = this.next = range.startContainer.childNodes[range.startOffset]
        } else {

        }

        if (range.endContainer == range.commonAncestorContainer && !isCharacterDataNode(range.endContainer)) {
          this.last = range.endContainer.childNodes[range.endOffset - 1]
        } else {

        }
      }
    }
  }

}