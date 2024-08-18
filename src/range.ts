import {applyInlineStylesFormNode, getInlineStyles, insertAfter, isCharacterDataNode, isTextNode,} from "./domUtils";
import {RangeIterator} from "./rangeIterator";
import {BlockType, NodeToBlockType} from "./const/const";

export function getSelectionRange(): Range {
  return window.getSelection().getRangeAt(0)
}

export function splitRange(range: Range) {
  console.log('splitRange:', range, range.startContainer, range.startOffset, range.endContainer, range.endOffset)
  let startIsText = isTextNode(range.startContainer)
  let endIsText = isTextNode(range.endContainer)
  if (!startIsText || !endIsText) {
    return
  }
  let sc = (range.startContainer as Text)
  let ec = (range.endContainer as Text)
  let sameNode = sc == ec

  // solve start container
  let text1 = sc.data.substring(0, range.startOffset);
  let text2 = sc.data.substring(range.startOffset);
  let text3 = '';
  if (sameNode) {
    text2 = sc.data.substring(range.startOffset, range.endOffset);
    text3 = sc.data.substring(range.endOffset);
  }
  let isSpan = sc.parentElement.nodeName == 'SPAN'
  // select all the span
  if (sameNode && isSpan && range.startOffset == 0 && range.endOffset == sc.data.length) {
    return;
  }
  let theSpan: HTMLElement;
  if (text2 != '') {
    sc.data = text1
    theSpan = document.createElement('SPAN')
    if (isSpan) {
      applyInlineStylesFormNode(sc.parentElement, theSpan)
    }
    theSpan.innerText = text2
    insertAfter(isSpan ? sc.parentElement : sc, theSpan)
    range.setStart(theSpan.childNodes[0], 0)
  }

  // solve end container
  text1 = ec.data.substring(0, range.endOffset);
  text2 = ec.data.substring(range.endOffset);
  if (sameNode) {
    if (text3 != '') {
      let tn = document.createTextNode(text3)
      if (isSpan) {
        let span = document.createElement('SPAN')
        span.appendChild(tn)
        applyInlineStylesFormNode(ec.parentElement, span)
        insertAfter(sc.parentElement.nextSibling, span)
      } else {
        insertAfter(sc.nextSibling, tn)
      }
    }
    range.setEnd(theSpan.childNodes[0], (theSpan.childNodes[0] as Text).data.length)
  } else {
    isSpan = ec.parentElement.nodeName == 'SPAN'
    if (text1 != '') {
      let span = document.createElement('SPAN')
      span.innerText = text1
      ec.data = text2
      if (isSpan) {
        applyInlineStylesFormNode(ec.parentElement, span)
      }
      if (isSpan) {
        ec.parentNode.parentNode.insertBefore(span, ec.parentNode)
      } else {
        ec.parentNode.insertBefore(span, ec)
      }
      range.setEnd(span.childNodes[0], text1.length)
    }
  }
}

export function getIntersectionStyle(): any {
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
  })

  if (range.collapsed) {
    if (isCharacterDataNode(range.startContainer)) {
      if (range.startContainer.parentElement.nodeName == "SPAN") {
        spans.push(range.startContainer.parentElement)
      }
    }
  }

  let is = {}
  for (const i in spans) {
    if (spans[i] == null) {
      return {}
    }
    let styles = getInlineStyles(spans[i]);
    if (i == '0') {
      is = styles
    } else {
      for (const k in is) {
        if (styles[k] != is[k]) {
          delete is[k]
        }
      }
    }
  }
  return is
}

export function getIntersectionBlockType(): BlockType {
  let range = getSelectionRange()
  let targetBlocks = []
  
  let blockTypeNodeNames = ["H1","H2","H3","H4","H5","H6","UL"]

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
  })

  let blockType = BlockType.BLOCK_TYPE_NONE
  for (const i in targetBlocks) {
    if (targetBlocks[i] == null) {
      return BlockType.BLOCK_TYPE_NONE
    }
    let nodeBlockType = NodeToBlockType(targetBlocks[i]);
    if (i == '0') {
      blockType = nodeBlockType
    } else {
      if (nodeBlockType != blockType) {
        return BlockType.BLOCK_TYPE_NONE
      }
    }
  }
  return blockType
}



export function iterateSubtree(rangeIterator: RangeIterator, func: (node: Node) => void) {
  for (let node: Node; (node = rangeIterator.traverse());) {
    console.log('traverse node', node, node.nodeName, node.nodeType)
    func(node)
    let subRangeIterator: RangeIterator = rangeIterator.getSubtreeIterator();
    console.log('subRangeIterator', subRangeIterator)
    if (subRangeIterator != null) {
      iterateSubtree(subRangeIterator, func);
    }
  }
}