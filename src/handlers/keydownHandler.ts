import {getSelectionRange, iterateSubtree} from "../range";
import {getClosestAncestorByNodeName, isTextNode} from "../domUtils";
import {indentLi} from "../components/ul";
import {RangeIterator} from "../rangeIterator";

export function handleTab(e: KeyboardEvent) {
  if (e.key === 'Tab') {
    let range = getSelectionRange()
    const startLi = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement;
    const endLi = getClosestAncestorByNodeName(range.endContainer, 'LI') as HTMLElement;
    if (startLi) {
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
    }
  }
}