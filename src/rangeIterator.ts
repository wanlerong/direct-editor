import {isCharacterDataNode, getClosestAncestorIn, getNodeLength} from "./domUtils";

// range 遍历器
// 参考自 https://github.com/timdown/rangy
export class RangeIterator {
  private range: Range;
  private first: Node;
  private last: Node;
  private next: Node;
  private current: Node;

  constructor(range: Range) {
    this.range = range
    if (!range.collapsed) {
      if (range.startContainer == range.endContainer && isCharacterDataNode(range.startContainer)) {
        this.first = this.last = this.next = range.startContainer
      } else {
        if (range.startContainer == range.commonAncestorContainer && !isCharacterDataNode(range.startContainer)) {
          this.first = this.next = range.startContainer.childNodes[range.startOffset]
        } else {
          this.first = this.next = getClosestAncestorIn(range.startContainer, range.commonAncestorContainer)
        }
        if (range.endContainer == range.commonAncestorContainer && !isCharacterDataNode(range.endContainer)) {
          this.last = range.endContainer.childNodes[range.endOffset - 1]
        } else {
          this.last = getClosestAncestorIn(range.endContainer, range.commonAncestorContainer)
        }
      }
    }
  }

  traverse(): Node {
    let current = this.current = this.next
    if (current) {
      this.next = current !== this.last ? current.nextSibling : null
    }
    return current
  }

  // 在 current 节点内，根据边界点切分出新的 sub range
  getSubtreeIterator(): RangeIterator {
    let current: Node = this.current;
    if (isCharacterDataNode(current)) {
      return null
    }

    let startContainer = current, startOffset = 0, endContainer = current, endOffset = getNodeLength(current);

    if (current.contains(this.range.startContainer)) {
      startContainer = this.range.startContainer;
      startOffset = this.range.startOffset;
    }
    if (current.contains(this.range.endContainer)) {
      endContainer = this.range.endContainer;
      endOffset = this.range.endOffset;
    }

    let subRange: Range = new Range();
    subRange.setStart(startContainer, startOffset)
    subRange.setEnd(endContainer, endOffset)

    return new RangeIterator(subRange);
  }

}