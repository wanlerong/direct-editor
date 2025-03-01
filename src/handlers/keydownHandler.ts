import {getSelectionRange, iterateSubtree, setRange} from "../range.js";
import {
  getClosestAncestorByNodeName, getClosestAncestorByNodeNames,
  getLastTextNode,
  getTextPosition,
  insertAfter,
  insertBefore,
  isTextNode
} from "../domUtils.js";
import {indentLi, isNestedLi} from "../components/ul.js";
import {RangeIterator} from "../rangeIterator.js";
import {listBlockConfig} from "../block/block.js";

export function handleBackspace(e: KeyboardEvent) {
  if (e.key != 'Backspace') {
    return
  }
  let range = getSelectionRange();
  let currentLi = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement;
  if (currentLi && (isTextNode(range.startContainer) || (range.startContainer == currentLi && range.startOffset == 0))) {
    if (range.collapsed) {
      let tp = getTextPosition(currentLi, range)
      if (tp == 0) {
        e.preventDefault();
        let currentUl = getClosestAncestorByNodeNames(range.startContainer, ['UL', 'OL']) as HTMLElement;
        const previousLi = currentLi.previousElementSibling as HTMLElement;
        const nextLi = currentLi.nextElementSibling as HTMLElement;
        if (previousLi) {
          let lastTextNode = getLastTextNode(previousLi)
          Array.from(currentLi.childNodes).forEach(n => {
            if (n.nodeName == "UL" || n.nodeName == "OL") {
              previousLi.append(n)
            } else {
              if (lastTextNode) {
                insertAfter(lastTextNode, n)
              } else {
                insertBefore(previousLi.firstChild, n)
              }
            }
          })
          currentLi.remove();
          if (lastTextNode) {
            setRange(lastTextNode, lastTextNode.textContent.length, lastTextNode, lastTextNode.textContent.length)
          } else {
            setRange(previousLi, 0, previousLi, 0)
          }
        } else {
          if (nextLi) {
            if (isNestedLi(currentLi)) {
              let cnt = Array.from(currentUl.parentNode.childNodes).indexOf(currentUl)
              currentLi.childNodes.forEach(n => {
                insertBefore(currentUl, n)
              })
              currentLi.remove()
              setRange(currentUl.parentNode, cnt, currentUl.parentNode, cnt)
            } else {
              let div = listBlockConfig.createElement()
              div.append(...currentLi.childNodes)
              currentLi.remove();
              insertBefore(currentUl.parentNode, div)
              setRange(div, 0, div, 0)
            }
          } else {
            currentUl.parentNode.append(...currentLi.childNodes)
            currentUl.remove()
          }
        }
      }
    }
  }
}

export function handleTab(e: KeyboardEvent) {
  if (e.key !== 'Tab') {
    return
  }
  let range = getSelectionRange()
  const startLi = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement;
  const endLi = getClosestAncestorByNodeName(range.endContainer, 'LI') as HTMLElement;
  if (startLi) {
    const {startContainer, startOffset, endContainer, endOffset} = range.cloneRange();
    e.preventDefault();
    if (startLi === endLi) {
      indentLi(startLi, !e.shiftKey)
    } else {
      // get startLi descendants li's list
      let childs: HTMLElement[] = Array.from(startLi.querySelectorAll('li'))
      iterateSubtree(new RangeIterator(range), (node) => {
        if (isTextNode(node) && node == range.startContainer) {
          indentLi(startLi, !e.shiftKey)
          return true
        }
        if (node.nodeName != "LI") {
          return false
        }
        if (node !== startLi && node.contains(startLi)) {
          return false
        }
        // start li has been indented, ignore its child
        if (node !== startLi && childs.includes(node as HTMLElement)) {
          return true
        }
        indentLi(node as HTMLElement, !e.shiftKey)
        return true // return true, means no need to indent sub range's li
      })
    }
    setRange(startContainer, startOffset, endContainer, endOffset)
  }
}