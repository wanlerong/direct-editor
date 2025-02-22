import {Editor} from "./editor"
import {RangeIterator} from "./rangeIterator";
import {getClosestAncestorByNodeName, insertAfter, isCharacterDataNode, isElementNode, isTextNode} from "./domUtils";
import {
  getIntersectionBlockType,
  getIntersectionStyle,
  getSelectionRange,
  iterateSubtree,
  setRange,
  splitRange
} from "./range";
import {BlockType, HTitleLevel} from "./const/const";
import {replaceListType} from "./components/ul";
import {Action, ActiveStatus} from "./const/activeStatus";
import {basicBlockConfig, listBlockConfig} from "./block/block";

export class Toolbar {
  private editor: Editor
  private activeStatus: ActiveStatus

  constructor(editor: Editor) {
    this.editor = editor
    this.activeStatus = {
      bold: false,
      italic: false,
      underline: false,
      strikethrough: false,
      blockType: BlockType.BLOCK_TYPE_NONE,
      disableActions: []
    }
  }

  formatText(styleKey: string, value: string | null) {
    let range = getSelectionRange();
    if (range.collapsed) {
      return;
    }
    splitRange(range);
    this.editor.normalize();
    this.applyInlineStyles({[styleKey]: value}, range);
    this.checkActiveStatus();
  }

  bold(value: boolean) {
    this.formatText('fontWeight', value ? 'bold' : null);
  }

  italic(value: boolean) {
    this.formatText('fontStyle', value ? 'italic' : null);
  }

  underline(value: boolean) {
    this.formatText('textDecoration', value ? 'underline' : null);
  }

  strikethrough(value: boolean) {
    this.formatText('textDecoration', value ? 'line-through' : null);
  }

  applyInlineStyles(styles: any, range: Range) {
    iterateSubtree(new RangeIterator(range), (node) => {
      if (isCharacterDataNode(node)) {
        if (node.parentElement.nodeName == "SPAN") {
          for (const property in styles) {
            node.parentElement.style[property] = styles[property]
          }
        } else if (node.parentElement.nodeName == "DIV" || node.parentElement.nodeName == "LI") {
          let span = document.createElement('SPAN')
          span.innerText = (node as Text).data
          for (const property in styles) {
            span.style[property] = styles[property]
          }
          node.parentElement.replaceChild(span, node)
        }
      }
      return false
    })
  }

  // set the selection range to h1/h2/h3... title
  title(level: HTitleLevel) {
    if (this.activeStatus.disableActions.includes(Action.HTITLE)) {
      return;
    }
    let range = getSelectionRange()
    let targetDivs: HTMLElement[] = []
    iterateSubtree(new RangeIterator(range), (node) => {
      while (node) {
        if (node.nodeName == "DIV") {
          if (!targetDivs.includes(node as HTMLElement)) {
            targetDivs.push(node as HTMLElement)
          }
          break
        }
        node = node.parentNode
      }
      return false
    })
    if (targetDivs.length == 0) {
      return
    }
    if (level == HTitleLevel.LEVEL_NONE) {
      targetDivs.forEach((td: HTMLElement) => {
        td.innerHTML = td.innerText
        td.dataset.btype = "basic";
      })
    } else {
      targetDivs.forEach((td: HTMLElement) => {
        let hTag: HTMLElement = document.createElement(level)
        hTag.innerText = td.innerText;
        td.innerHTML = ''
        td.appendChild(hTag)
        td.dataset.btype = "htitle";
      })
    }

    let sc = targetDivs[0].firstChild
    let ec = targetDivs[targetDivs.length - 1].firstChild
    if (!isCharacterDataNode(sc)) {
      sc = sc.firstChild
      ec = ec.firstChild
    }
    range.setStart(sc, 0)
    range.setEnd(ec, ec.textContent.length)
    this.checkActiveStatus()
    this.editor.normalize()
  }

  getActiveStatus() {
    return this.activeStatus
  }

  checkActiveStatus() {
    let is = getIntersectionStyle()
    this.activeStatus.bold = is['fontWeight'] == 'bold'
    this.activeStatus.italic = is['fontStyle'] == 'italic'
    this.activeStatus.strikethrough = is['textDecoration'] == 'line-through'
    this.activeStatus.underline = is['textDecoration'] == 'underline'
    this.activeStatus.blockType = getIntersectionBlockType()
    this.activeStatus.disableActions = this.calculateDisableActions()
    this.editor.asChange(this.activeStatus)
  }

  calculateDisableActions(): Action[] {
    let range = getSelectionRange();
    let actions: Action[] = [];
    const {hasListOverlap, hasTitleOverlap} = this.checkOverlap(range);
    if (hasListOverlap) {
      actions.push(Action.HTITLE);
    }
    if (hasTitleOverlap) {
      actions.push(Action.ORDERED_LIST);
      actions.push(Action.UN_ORDERED_LIST);
    }
    return actions;
  }

  // ul/ol 和 h 互斥，计算当前选区是否存在重叠
  checkOverlap(range: Range): { hasListOverlap: boolean, hasTitleOverlap: boolean } {
    let hasListOverlap = false;
    let hasTitleOverlap = false;

    // 判断节点是否在 ul、ol 或 h 标题中
    const isNodeInListOrTitle = (node: Node): { inList: boolean, inTitle: boolean } => {
      while (node) {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const tagName = (node as HTMLElement).tagName.toLowerCase();
          if (tagName === 'ul' || tagName === 'ol') {
            return {inList: true, inTitle: false};
          } else if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName)) {
            return {inList: false, inTitle: true};
          }
        }
        node = node.parentNode;
      }
      return {inList: false, inTitle: false};
    };

    let startResult = isNodeInListOrTitle(range.startContainer);
    let endResult = isNodeInListOrTitle(range.endContainer);

    hasListOverlap = startResult.inList || endResult.inList;
    hasTitleOverlap = startResult.inTitle || endResult.inTitle;

    if (hasListOverlap && hasTitleOverlap) {
      return {hasListOverlap, hasTitleOverlap};
    }

    iterateSubtree(new RangeIterator(range), (node) => {
      if (isCharacterDataNode(node) || isElementNode(node)) {
        let result = isNodeInListOrTitle(node);
        if (result.inList) {
          hasListOverlap = true;
          return true;
        }
        if (result.inTitle) {
          hasTitleOverlap = true;
          return true;
        }
      }
      return false;
    });

    return {hasListOverlap, hasTitleOverlap};
  }

  toggleList(listType: 'ul' | 'ol') {
    if (this.activeStatus.disableActions.includes(Action.UN_ORDERED_LIST) || this.activeStatus.disableActions.includes(Action.ORDERED_LIST)) {
      return;
    }
    let range = getSelectionRange()
    const {startContainer, startOffset, endContainer, endOffset} = range.cloneRange();
    let targetDivsArr: HTMLElement[][] = []
    let targetDivs: HTMLElement[] = []
    let diffLists: HTMLElement[] = []
    iterateSubtree(new RangeIterator(range), (node) => {
      while (node) {
        if (node.nodeName == "DIV") {
          let firstLevelNodeName = (node as HTMLElement).firstChild.nodeName
          const listInCurrentDiv = firstLevelNodeName == 'UL' || firstLevelNodeName == 'OL'
          if (listInCurrentDiv) {
            targetDivsArr.push(targetDivs)
            targetDivs = []
            if (firstLevelNodeName != listType.toUpperCase()) {
              diffLists.push((node.firstChild as HTMLElement))
            }
          } else if (!targetDivs.includes(node as HTMLElement)) {
            targetDivs.push(node as HTMLElement)
          }
          return true
        }
        node = node.parentNode
      }
      return false
    })
    if (targetDivs.length != 0) {
      targetDivsArr.push(targetDivs)
    }

    targetDivsArr.forEach((targetDivs2) => {
      if (targetDivs2.length == 0) {
        return
      }
      let ul = document.createElement(listType)
      targetDivs2.forEach((targetDiv, idx) => {
        let li = document.createElement("li")
        li.replaceChildren(...targetDiv.childNodes)
        ul.appendChild(li)
        if (idx != 0) {
          targetDiv.remove()
        }
      })
      targetDivs2[0].replaceChildren(ul)
      targetDivs2[0].dataset.btype="list"
    })

    diffLists.forEach((node) => {
      replaceListType(node, listType)
    })

    this.editor.normalize()
    setRange(startContainer, startOffset, endContainer, endOffset)
    this.checkActiveStatus()
  }

  unToggleList(listType: 'ul' | 'ol') {
    let range = getSelectionRange()
    let ul: HTMLElement = getClosestAncestorByNodeName(range.startContainer, listType.toUpperCase()) as HTMLElement
    if (!ul) {
      return
    }
    const {startContainer, startOffset, endContainer, endOffset} = range.cloneRange();
    let startContainerChild, endContainerChild
    // if unToggleList on an 'empty' li, which contains <br> only, the range.startContainer will be li, start offset will be 0
    // store the child, and then use startContainerChild.parentNode to restore the range
    if (!isTextNode(range.startContainer)) {
      startContainerChild = range.startContainer.firstChild
    }
    if (!isTextNode(range.endContainer)) {
      endContainerChild = range.endContainer.firstChild
    }

    let li1: HTMLElement = getClosestAncestorByNodeName(range.startContainer, 'LI') as HTMLElement
    let li2: HTMLElement = getClosestAncestorByNodeName(range.endContainer, 'LI') as HTMLElement
    let idx1 = Array.of(...ul.childNodes).indexOf(li1)
    let idx2 = Array.of(...ul.childNodes).indexOf(li2)

    let toRemove: HTMLElement[] = []
    let newDiv, newList: HTMLElement = null
    let n1 = ul.parentNode

    Array.of(...ul.childNodes).forEach((li, idx) => {
      if (idx < idx1) {
        return
      } else if (idx >= idx1 && idx <= idx2) {
        const div = basicBlockConfig.createElement();
        div.replaceChildren(...li.childNodes)
        insertAfter(n1, div)
        n1 = div
        toRemove.push((li as HTMLElement))
      } else {
        if (newDiv == null) {
          newDiv = listBlockConfig.createElement();
          newList = document.createElement(listType);
          newDiv.appendChild(newList)
        }
        newList.appendChild(li)
      }
    })
    toRemove.forEach(it => it.remove())
    if (newDiv) {
      insertAfter(n1, newDiv)
    }
    this.editor.normalize()

    setRange(startContainerChild ? startContainerChild.parentNode : startContainer, startOffset,
      endContainerChild ? endContainerChild.parentNode : endContainer, endOffset)
    this.checkActiveStatus()
  }
}