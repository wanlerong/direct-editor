import {Editor} from "./editor.js"
import {RangeIterator} from "./rangeIterator.js";
import {getClosestAncestorByNodeName, insertAfter, isCharacterDataNode, isElementNode, isTextNode} from "./domUtils.js";
import {
  getIntersectionBlockInfo,
  getIntersectionStyle,
  getSelectionRange,
  iterateSubtree,
  setRange,
  splitRange
} from "./range.js";
import {LineLevel} from "./const/const.js";
import {replaceListType} from "./components/ul.js";
import {Action, ActiveStatus} from "./const/activeStatus.js";
import {basicBlockConfig, listBlockConfig} from "./block/block.js";
import {BlockInfoNone} from "./block/blockType.js";
import {aSchema} from "./schema/schema";

export interface LinkOperationState {
  canInsert: boolean;
  canEdit: boolean;
  suggestedText: string;
  suggestedUrl: string;
}

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
      blockInfo: BlockInfoNone,
      disableActions: [],
      link: {
        canInsert: false,
        canEdit: false,
        suggestedText: "",
        suggestedUrl: "",
      }
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

  // set the selection range to h1/h2/h3... title or blockquote
  line(level: LineLevel) {
    if (this.activeStatus.disableActions.includes(Action.Line)) {
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
    if (level == LineLevel.LEVEL_NONE) {
      targetDivs.forEach((td: HTMLElement) => {
        td.innerHTML = td.innerText
        td.dataset.btype = "basic";
      })
    } else if (level == LineLevel.BLOCKQUOTE) {
      targetDivs.forEach((td: HTMLElement) => {
        let blockquote: HTMLElement = document.createElement('blockquote')
        blockquote.innerText = td.innerText;
        td.innerHTML = ''
        td.appendChild(blockquote)
        td.dataset.btype = "line";
      })
    } else {
      targetDivs.forEach((td: HTMLElement) => {
        let hTag: HTMLElement = document.createElement(level)
        hTag.innerText = td.innerText;
        td.innerHTML = ''
        td.appendChild(hTag)
        td.dataset.btype = "line";
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
    this.activeStatus.blockInfo = getIntersectionBlockInfo()
    this.activeStatus.disableActions = this.calculateDisableActions()
    this.activeStatus.link = this.getLinkOperationState()
    this.editor.asChange(this.activeStatus)
  }

  calculateDisableActions(): Action[] {
    let range = getSelectionRange();
    let actions: Action[] = [];
    const {hasListOverlap, hasTitleOverlap} = this.checkOverlap(range);
    if (hasListOverlap) {
      actions.push(Action.Line);
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
      targetDivs2[0].dataset.btype = "list"
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

  getLinkOperationState(): LinkOperationState {
    const range = getSelectionRange();
    const state: LinkOperationState = {
      canInsert: false,
      canEdit: false,
      suggestedText: '',
      suggestedUrl: ''
    };

    if (!range) return state;

    // 获取选区文本内容
    state.suggestedText = range.toString();

    // 验证插入条件
    state.canInsert = this._validateInsertCondition(range);

    // 验证编辑条件
    const link = this._getSingleContainingLink(range);
    if (link) {
      state.canEdit = true;
      state.suggestedUrl = link.href;
      state.suggestedText = link.textContent || '';
    }
    
    console.log(state)

    return state;
  }

  private _validateInsertCondition(range: Range): boolean {
    if (range.collapsed) return true;

    let ele = document.createElement("a")
    let fragment = range.cloneContents()
    ele.replaceChildren(...fragment.childNodes)

    return this.editor.blockNormalizer.validateElement(ele, aSchema);
  }

  private _getSingleContainingLink(range: Range): HTMLLinkElement {
    const startLink = getClosestAncestorByNodeName(range.startContainer, 'A');
    const endLink = getClosestAncestorByNodeName(range.endContainer, 'A');
    if (!startLink) {
      return null
    }
    if (startLink !== endLink) {
      return null;
    } 

    // 验证选区边界
    const linkRange = document.createRange();
    linkRange.selectNodeContents(startLink);

    return range.compareBoundaryPoints(Range.START_TO_START, linkRange) >= 0 &&
    range.compareBoundaryPoints(Range.END_TO_END, linkRange) <= 0
      ? startLink as HTMLLinkElement
      : null;
  }

  insertLink(url: string, text: string): void {
    const validatedURL = this._validateURL(url);
    if (!this.editor.restoreSelection()) {
      console.warn('无法恢复选区，插入链接失败');
      return;
    }

    const range = getSelectionRange();
    if (!range) return;

    const link = document.createElement('a');
    link.setAttribute("href", validatedURL);
    link.textContent = text;

    if (range.collapsed) {
      // 直接插入并设置光标
      range.insertNode(link);
      this._setCursorAfter(link);
    } else {
      // 替换选区内容
      range.deleteContents();
      range.insertNode(link);
      this._setCursorAfter(link);
    }

    this.editor.normalize();
  }
  
  editLink(newUrl: string, newText: string): void {
    if (!this.editor.restoreSelection()) {
      console.warn('无法恢复选区, edit 链接失败');
      return;
    }

    const range = getSelectionRange();
    if (!range) return;

    // 获取当前选区内的链接
    const link = this._getContainingLink(range);
    if (!link) return;

    link.href = this._validateURL(newUrl);
    link.textContent = newText;

    this.editor.normalize();
  }
  
  private _validateURL(url: string): string {
    try {
      new URL(url);
      return url;
    } catch {
      // 自动补全协议
      return url.startsWith('//') ? `https:${url}` : `https://${url}`;
    }
  }

  private _setCursorAfter(node: Node): void {
    const range = document.createRange();
    const parent = node.parentNode!;

    // 定位到插入节点之后
    range.setStart(parent, Array.from(parent.childNodes).indexOf(node as ChildNode) + 1);
    range.collapse(true);
    setRange(range.startContainer, range.startOffset, range.endContainer, range.endOffset);
  }

  private _getContainingLink(range: Range): HTMLAnchorElement | null {
    // 获取选区起点所在的链接
    const startLink = getClosestAncestorByNodeName(range.startContainer, 'A');
    // 获取选区终点所在的链接
    const endLink = getClosestAncestorByNodeName(range.endContainer, 'A');

    // 确保选区完全在同一个链接内
    return startLink === endLink ? startLink as HTMLAnchorElement : null;
  }
  
}