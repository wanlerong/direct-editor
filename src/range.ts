import {
  applyInlineStylesFormNode,
  createSpanWithText, getInlineStyles,
  insertAfter,
  isCharacterDataNode,
  isTextNode,
} from "./domUtils";
import {RangeIterator} from "./rangeIterator";
import {BlockType, NodeToBlockType} from "./const/const";

export function getSelectionRange(): Range {
  const selection = window.getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0);
  }
  return null;
}

export function splitRange(range: Range) {
  console.log('splitRange:', range, range.startContainer, range.startOffset, range.endContainer, range.endOffset)
  if (!isTextNode(range.startContainer) || !isTextNode(range.endContainer) || range.collapsed) {
    return
  }
  let sc = (range.startContainer as Text)
  let ec = (range.endContainer as Text)
  let sameNode = sc == ec
  // solve start container
  let startText = splitTextNode(sc, range.startOffset, sameNode ? range.endOffset : undefined);
  let isSpan = sc.parentElement.nodeName == 'SPAN'
  // select all the span
  if (sameNode && isSpan && range.startOffset == 0 && range.endOffset == sc.data.length) {
    return;
  }
  let theSpan = createSpanWithText(startText.mid);
  sc.data = startText.before
  if (isSpan) {
    applyInlineStylesFormNode(sc.parentElement, theSpan)
  }
  insertAfter(isSpan ? sc.parentElement : sc, theSpan)
  range.setStart(theSpan.firstChild, 0)

  // solve end container
  if (sameNode) {
    if (startText.after != '') {
      if (isSpan) {
        let span = createSpanWithText(startText.after)
        applyInlineStylesFormNode(ec.parentElement, span)
        insertAfter(sc.parentElement.nextSibling, span)
      } else {
        insertAfter(sc.nextSibling, document.createTextNode(startText.after))
      }
    }
    range.setEnd(theSpan.firstChild, (theSpan.firstChild as Text).data.length)
  } else {
    let endText = splitTextNode(ec, range.endOffset);
    isSpan = ec.parentElement.nodeName == 'SPAN'
    if (endText.before != '') {
      let span = createSpanWithText(endText.before)
      ec.data = endText.mid
      if (isSpan) {
        applyInlineStylesFormNode(ec.parentElement, span)
        ec.parentNode.parentNode.insertBefore(span, ec.parentNode)
      } else {
        ec.parentNode.insertBefore(span, ec)
      }
      range.setEnd(span.firstChild, endText.before.length)
    }
  }
}

export function splitTextNode(node: Text, startOffset: number, endOffset?: number) {
  let textBefore = node.data.substring(0, startOffset);
  let textMid = endOffset !== undefined ? node.data.substring(startOffset, endOffset) : node.data.substring(startOffset);
  let textAfter = endOffset !== undefined ? node.data.substring(endOffset) : '';

  return {before: textBefore, mid: textMid, after: textAfter};
}

export function getIntersectionStyle(): Record<string, string> {
  let range = getSelectionRange()
  let spans = []
  iterateSubtree(new RangeIterator(range), (node) => {
    if (isCharacterDataNode(node)) {
      if (node.textContent == '') {
        return
      }
      if (node.parentElement.nodeName == "SPAN") {
        spans.push(node.parentElement)
      } else {
        spans.push(null)
      }
    }
    return false
  })

  if (range.collapsed && isCharacterDataNode(range.startContainer) && range.startContainer.parentElement.nodeName == "SPAN") {
    spans.push(range.startContainer.parentElement)
  }

  return spans.reduce((commonStyles, span, index) => {
    if (span === null) {
      return {};
    }
    const styles = getInlineStyles(span);
    if (index === 0) {
      return styles;
    }
    return intersectStyles(commonStyles, styles);
  }, {});
}

function intersectStyles(stylesA: Record<string, string>, stylesB: Record<string, string>): Record<string, string> {
  const intersectedStyles: Record<string, string> = {};
  for (const key in stylesA) {
    if (stylesA[key] === stylesB[key]) {
      intersectedStyles[key] = stylesA[key];
    }
  }
  return intersectedStyles;
}

export function getIntersectionBlockType(): BlockType {
  let range = getSelectionRange()
  let targetBlocks = []
  let blockTypeNodeNames = ["H1", "H2", "H3", "H4", "H5", "H6", "UL", "OL"]

  iterateSubtree(new RangeIterator(range), (node) => {
    if (isCharacterDataNode(node) || node.nodeName == "BR") {
      while (node) {
        if (blockTypeNodeNames.includes(node.nodeName)) {
          if (!targetBlocks.includes(node)) {
            targetBlocks.push(node)
          }
          break
        }
        node = node.parentNode
        if (node == null) {
          targetBlocks.push(null)
        }
      }
    }
    return false
  })
  
  return targetBlocks.reduce((commonType, block, index) => {
    if (block === null) {
      return BlockType.BLOCK_TYPE_NONE;
    }
    const nodeBlockType = NodeToBlockType(block);
    if (index === 0) {
      return nodeBlockType;
    }
    return commonType == nodeBlockType ? commonType : BlockType.BLOCK_TYPE_NONE  
  }, BlockType.BLOCK_TYPE_NONE);
}



export function iterateSubtree(rangeIterator: RangeIterator, func: (node: Node) => boolean) {
  for (let node: Node; (node = rangeIterator.traverse());) {
    console.log('traverse node', node, node.nodeName, node.nodeType)
    let stopSub = func(node)
    if (stopSub) {
      continue
    }
    let subRangeIterator: RangeIterator = rangeIterator.getSubtreeIterator();
    console.log('subRangeIterator', subRangeIterator)
    if (subRangeIterator != null) {
      iterateSubtree(subRangeIterator, func);
    }
  }
}

export function setRange(start: Node, startOffset: number, end: Node, endOffset: number) {
  const range = document.createRange();
  range.setStart(start, startOffset)
  range.setEnd(end, endOffset)
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}