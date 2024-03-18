import {getInlineStyles, insertAfter, isTextNode} from "./domUtils";

export function getSelectionRange(): Range {
  return window.getSelection().getRangeAt(0)
}

// 1. 确定 range
// 2. 对 range 内的节点应用加粗
export function splitRange(range: Range) {
  console.log(range)
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
  // 选择了 span 的全部
  if (sameNode && isSpan && range.startOffset == 0 && range.endOffset == sc.data.length) {
    return;
  }
  
  let theSpan:HTMLElement;
  if (text2!='') {
    sc.data = text1
    theSpan = document.createElement('SPAN')
    if (isSpan){
      let styles = getInlineStyles(sc.parentElement)
      for (const property in styles) {
        theSpan.style[property] = styles[property]
      }
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
        insertAfter(sc.nextSibling, span)
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

      if (isSpan){
        let styles = getInlineStyles(ec.parentElement)
        for (const property in styles) {
          span.style[property] = styles[property]
        }
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