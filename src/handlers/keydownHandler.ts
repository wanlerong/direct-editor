import {getSelectionRange, iterateSubtree, setRange} from "../range";
import {getClosestAncestorByNodeName, getLastTextNode, getTextPosition, insertBefore, isTextNode} from "../domUtils";
import {indentLi, isNestedLi} from "../components/ul";
import {RangeIterator} from "../rangeIterator";

export function handleBackspace(e: KeyboardEvent) {
  if (e.key != 'Backspace') {
    return
  }
  let range = getSelectionRange();
  let currentLi = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement;
  if (currentLi && (isTextNode(range.startContainer) || (range.startContainer == currentLi && range.startOffset == 0))) {
    if (range.collapsed) {
      let tp = getTextPosition(currentLi, range)
      if (tp == 1 || tp == 0) {
        // Prevent the default backspace behavior which will remove parent div
        // and first level will be UL, which is conflict with "first level can only be DIV"
        e.preventDefault();
        if (tp == 1) {
          range.startContainer.textContent = range.startContainer.textContent.substring(1, range.startContainer.textContent.length);
          setRange(currentLi, 0, currentLi, 0)
          console.log(range.startContainer, range.startOffset, range.startContainer.textContent, range.endContainer, range.endOffset, range.endContainer.textContent)
        } else {
          let currentUl = getClosestAncestorByNodeName(range.startContainer, 'UL') as HTMLElement;
          const previousLi = currentLi.previousElementSibling as HTMLElement;
          const nextLi = currentLi.nextElementSibling as HTMLElement;
          if (previousLi) {
            let lastTextNode = getLastTextNode(previousLi)
            previousLi.append(...currentLi.childNodes)
            currentLi.remove();
            range.setStart(lastTextNode, lastTextNode.textContent.length)
            range.setEnd(lastTextNode, lastTextNode.textContent.length)
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
                let div = document.createElement("div")
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
    } else {
      let sc = range.startContainer, so = range.startOffset
      e.preventDefault();
      // todo 临时处理, 应该自己实现删除操作
      range.deleteContents()
      range.setStart(sc, so)
      range.setEnd(sc, so)
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