import { setRange } from "../range.js";
import {tableBlockConfig, basicBlockConfig, createTableRow, createTableCell} from "../block/block.js";
import { Editor } from "../editor.js";
import { getSelectionRange } from "../range.js";
import {getClosestBlock} from "../domUtils";

export function getCellColumnIndex(cell: HTMLTableCellElement): number {
  const row = cell.closest('tr');
  if (!row) return -1;
  return Array.from(row.cells).indexOf(cell);
}

export function addRow(tableElement: HTMLTableElement, rowIdx: number): void {
  if (rowIdx < 0 || !tableElement) {
    return;
  }
  
  const rows = tableElement.rows;
  if (rowIdx >= rows.length) {
    return;
  }
  
  const colCount = rows[0].cells.length;
  
  const newRow = createTableRow(colCount);
  
  if (rowIdx < rows.length - 1) {
    rows[rowIdx].insertAdjacentElement('afterend', newRow);
  } else {
    tableElement.appendChild(newRow);
  }
  
  // 更新选区到新行的第一个单元格
  try {
    const newRange = document.createRange();
    const firstCell = (newRow as HTMLTableRowElement).cells[0];
    newRange.selectNodeContents(firstCell.firstChild.firstChild);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
  } catch (e) {
  }
}

export function addColumn(tableElement: HTMLTableElement, columnIdx: number): void {
  if (columnIdx < 0 || !tableElement) return;
  
  const rows = tableElement.rows;
  if (rows.length === 0) return;
  
  // 遍历每一行，在指定的列索引后添加新的单元格
  Array.from(rows).forEach(row => {
    if (columnIdx >= row.cells.length) return;
    
    const newCell = createTableCell()
    const refCell = row.cells[columnIdx];
    refCell.insertAdjacentElement('afterend', newCell);
  });
  
  // 更新选区到第一行的新单元格
  const firstRowNewCell = rows[0].cells[columnIdx + 1];
  const newRange = document.createRange();
  newRange.selectNodeContents(firstRowNewCell.firstChild.firstChild);
  newRange.collapse(true);
  setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
}

export function deleteRow(tableElement: HTMLTableElement, rowIdx: number): void {
  if (!tableElement || rowIdx < 0 || rowIdx >= tableElement.rows.length) return;
  
  // 至少保留一行
  if (tableElement.rows.length <= 1) return;
  
  // 删除行
  tableElement.deleteRow(rowIdx);
  
  // 更新选区到第一行第一列（如果存在）
  if (tableElement.rows.length > 0 && tableElement.rows[0].cells.length > 0) {
    const firstCell = tableElement.rows[0].cells[0];
    const newRange = document.createRange();
    newRange.selectNodeContents(firstCell.firstChild.firstChild);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
  }
}

export function deleteColumn(tableElement: HTMLTableElement, columnIdx: number): void {
  if (!tableElement || columnIdx < 0) return;
  
  // 确保列索引有效
  if (tableElement.rows.length === 0 || columnIdx >= tableElement.rows[0].cells.length) return;
  
  // 至少保留一列
  if (tableElement.rows[0].cells.length <= 1) return;
  
  // 删除每一行中的对应列
  Array.from(tableElement.rows).forEach(row => {
    if (row.cells[columnIdx]) {
      row.deleteCell(columnIdx);
    }
  });
  
  // 更新选区到第一行第一列（如果存在）
  if (tableElement.rows.length > 0 && tableElement.rows[0].cells.length > 0) {
    const firstCell = tableElement.rows[0].cells[0];
    const newRange = document.createRange();
    newRange.selectNodeContents(firstCell.firstChild.firstChild);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
  }
}



export function createTable(rows: number, cols: number): HTMLElement {
  if (rows < 1 || cols < 1) {
    return null;
  }
  
  const tableBlock = tableBlockConfig.createElement();
  const table = document.createElement('table');
  
  for (let i = 0; i < rows; i++) {
    table.appendChild(createTableRow(cols));
  }
  
  tableBlock.appendChild(table);
  return tableBlock;
}

export class TableManager {
  private editor: Editor;
  private cellOptionsMenu: HTMLElement | null = null;
  private currentCellElement: HTMLTableCellElement | null = null;
  
  constructor(editor: Editor) {
    this.editor = editor;
    this.initCellOptionsMenu();
    
    // 监听选择变化显示/隐藏菜单
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    this.editor.theDom.addEventListener('blur', () => {
      // 使用延迟，避免点击菜单时立即隐藏
      setTimeout(() => {
        if (!this.cellOptionsMenu?.contains(document.activeElement as Node)) {
          this.hideCellOptionsMenu();
        }
      }, 200);
    });
    
    // 监听窗口滚动和调整大小，更新菜单位置
    window.addEventListener('scroll', this.updateCellOptionsMenuPosition.bind(this));
    window.addEventListener('resize', this.updateCellOptionsMenuPosition.bind(this));
  }
  
  insertTable(rows: number, cols: number): void {
    if (!rows || !cols || rows < 1 || cols < 1) {
      return;
    }
    
    let range = getSelectionRange();
    if (!range) return;

    let block = getClosestBlock(range.endContainer)
    
    const tableBlock = createTable(rows, cols);
    
    if (block) {
      block.insertAdjacentElement('afterend', tableBlock);
    } else {
      this.editor.theDom.appendChild(tableBlock);
    }
    
    const newRange = document.createRange();
    const firstCell = tableBlock.querySelector('td');
    const basicBlock = firstCell.querySelector('div[data-btype="basic"]');
    newRange.selectNodeContents(basicBlock || firstCell);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
    
    this.editor.normalize();
  }
  
  updateCellOptionsMenu(): void {
    const range = getSelectionRange();
    if (!range) {
      this.hideCellOptionsMenu();
      return;
    }
    
    // 查找选区是否在表格单元格内
    let node = range.startContainer;
    let cellElement: HTMLTableCellElement | null = null;
    
    while (node && node.nodeName !== 'TD') {
      node = node.parentNode;
    }
    
    cellElement = node as HTMLTableCellElement;
    
    if (cellElement) {
      this.currentCellElement = cellElement;
      this.showCellOptionsMenu(cellElement);
    } else {
      this.hideCellOptionsMenu();
    }
  }
  
  private initCellOptionsMenu(): void {
    // 如果已存在，则删除旧的菜单
    if (this.cellOptionsMenu) {
      document.body.removeChild(this.cellOptionsMenu);
    }
    
    // 创建新的菜单元素
    this.cellOptionsMenu = document.createElement('div');
    this.cellOptionsMenu.className = 'table-cell-options';
    this.cellOptionsMenu.style.position = 'absolute';
    this.cellOptionsMenu.style.zIndex = '1000';
    this.cellOptionsMenu.style.display = 'none';
    this.cellOptionsMenu.style.pointerEvents = 'auto'; // 确保菜单可以接收事件
    
    // 创建箭头按钮
    const arrowButton = document.createElement('button');
    arrowButton.className = 'cell-options-arrow';
    arrowButton.innerHTML = '▼';
    arrowButton.style.cursor = 'pointer';
    arrowButton.style.background = 'white';
    arrowButton.style.border = '1px solid #ccc';
    arrowButton.style.borderRadius = '4px';
    arrowButton.style.padding = '4px 8px'; // 增加点击区域
    arrowButton.style.width = '30px'; // 固定宽度
    arrowButton.style.height = '30px'; // 固定高度
    arrowButton.style.fontSize = '14px'; // 适当的字体大小
    arrowButton.style.lineHeight = '1'; // 改进垂直对齐
    arrowButton.style.userSelect = 'none'; // 防止文本选择
    arrowButton.style.outline = 'none'; // 移除焦点轮廓
    arrowButton.addEventListener('click', this.toggleCellOptionsDropdown.bind(this));
    this.cellOptionsMenu.appendChild(arrowButton);
    
    // 创建下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'cell-options-dropdown';
    dropdown.style.display = 'none';
    dropdown.style.position = 'absolute';
    dropdown.style.top = '100%';
    dropdown.style.left = '0';
    dropdown.style.background = 'white';
    dropdown.style.border = '1px solid #ccc';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)'; // 增强阴影
    dropdown.style.minWidth = '180px'; // 增加宽度
    dropdown.style.zIndex = '1001'; // 确保下拉菜单在最上层
    dropdown.style.marginTop = '5px'; // 与按钮之间的间距
    dropdown.style.pointerEvents = 'auto'; // 确保菜单可以接收事件
    
    // 创建公共样式函数，确保所有菜单项风格一致
    const setMenuItemStyle = (item: HTMLElement) => {
      item.style.padding = '10px 15px'; // 增加点击区域
      item.style.cursor = 'pointer';
      item.style.borderBottom = '1px solid #eee';
      item.style.fontSize = '14px'; // 适当的字体大小
      item.style.fontFamily = 'Arial, sans-serif'; // 字体
      item.style.userSelect = 'none'; // 防止文本选择
      
      // 添加悬停效果
      item.addEventListener('mouseenter', () => {
        item.style.backgroundColor = '#f0f0f0';
      });
      item.addEventListener('mouseleave', () => {
        item.style.backgroundColor = 'white';
      });
    };
    
    // 添加菜单项
    const addRowOption = document.createElement('div');
    addRowOption.className = 'cell-option-item';
    addRowOption.textContent = 'Add row below';
    setMenuItemStyle(addRowOption);
    addRowOption.addEventListener('click', (event) => {
      event.stopPropagation();
      this.handleAddRowBelow();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(addRowOption);
    
    // 添加列选项
    const addColumnOption = document.createElement('div');
    addColumnOption.className = 'cell-option-item';
    addColumnOption.textContent = 'Add column right';
    setMenuItemStyle(addColumnOption);
    addColumnOption.addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      this.handleAddColumnRight();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(addColumnOption);
    
    // 删除行选项
    const deleteRowOption = document.createElement('div');
    deleteRowOption.className = 'cell-option-item';
    deleteRowOption.textContent = 'Delete row';
    setMenuItemStyle(deleteRowOption);
    deleteRowOption.addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      this.handleDeleteRow();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(deleteRowOption);
    
    // 删除列选项
    const deleteColumnOption = document.createElement('div');
    deleteColumnOption.className = 'cell-option-item';
    deleteColumnOption.textContent = 'Delete column';
    setMenuItemStyle(deleteColumnOption);
    deleteColumnOption.style.borderBottom = 'none'; // 最后一项不需要底部边框
    deleteColumnOption.addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      this.handleDeleteColumn();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(deleteColumnOption);
    
    // 将菜单添加到document.body而不是编辑器内部
    this.cellOptionsMenu.appendChild(dropdown);
    document.body.appendChild(this.cellOptionsMenu);
    
    // 确保菜单中的点击不会冒泡到document
    this.cellOptionsMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
  
  private handleAddRowBelow(): void {
    if (!this.currentCellElement) {
      return;
    }
    const rowElement = this.currentCellElement.closest('tr');
    if (!rowElement) {
      return;
    }
    const tableElement = rowElement.closest('table');
    if (!tableElement) {
      return;
    }
    const rowIndex = Array.from(tableElement.rows).indexOf(rowElement);
    if (rowIndex === -1) {
      return;
    }
    addRow(tableElement, rowIndex);
    this.editor.normalize();
  }
  
  private handleAddColumnRight(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    const columnIndex = getCellColumnIndex(this.currentCellElement);
    if (columnIndex === -1) return;
    
    addColumn(tableElement, columnIndex);
    this.editor.normalize();
  }
  
  private handleDeleteRow(): void {
    if (!this.currentCellElement) return;
    
    const rowElement = this.currentCellElement.closest('tr');
    if (!rowElement) return;
    
    const tableElement = rowElement.closest('table');
    if (!tableElement) return;
    
    const rowIndex = Array.from(tableElement.rows).indexOf(rowElement);
    if (rowIndex === -1) return;
    
    deleteRow(tableElement, rowIndex);
    this.editor.normalize();
  }
  
  private handleDeleteColumn(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    const columnIndex = getCellColumnIndex(this.currentCellElement);
    if (columnIndex === -1) return;
    
    deleteColumn(tableElement, columnIndex);
    this.editor.normalize();
  }
  
  private handleSelectionChange(): void {
    setTimeout(() => {
      this.updateCellOptionsMenu();
    }, 0);
  }
  
  private showCellOptionsMenu(cellElement: HTMLTableCellElement): void {
    if (!this.cellOptionsMenu) return;
    
    // 如果是相同的单元格，只需更新位置
    if (this.currentCellElement === cellElement && this.cellOptionsMenu.style.display !== 'none') {
      this.updateCellOptionsMenuPosition();
      return;
    }
    
    // 获取单元格的位置
    const rect = cellElement.getBoundingClientRect();
    
    // 定位菜单到单元格右上角，确保有一些边距
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY - 5}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
    this.cellOptionsMenu.style.display = 'block';
    
    // 调整按钮样式，使其更容易点击
    const arrowButton = this.cellOptionsMenu.querySelector('.cell-options-arrow') as HTMLElement;
    if (arrowButton) {
      arrowButton.style.width = '24px';
      arrowButton.style.height = '24px';
      arrowButton.style.cursor = 'pointer';
    }
    
    // 隐藏下拉部分
    const dropdown = this.cellOptionsMenu.querySelector('.cell-options-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.style.display = 'none';
    }
  }
  
  private hideCellOptionsMenu(): void {
    if (this.cellOptionsMenu) {
      this.cellOptionsMenu.style.display = 'none';
    }
    this.currentCellElement = null;
  }
  
  private toggleCellOptionsDropdown(event: MouseEvent): void {
    event.stopPropagation();
    event.preventDefault(); // 阻止默认行为
    
    const dropdown = this.cellOptionsMenu.querySelector('.cell-options-dropdown') as HTMLElement;
    if (dropdown) {
      if (dropdown.style.display === 'none') {
        // 调整下拉菜单位置，确保完全可见
        const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
        dropdown.style.top = `${buttonRect.height + 2}px`;
        dropdown.style.left = '0';
        
        // 检查是否会超出屏幕右侧，如果是则向左显示
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        if (buttonRect.left + dropdownRect.width > viewportWidth) {
          dropdown.style.left = 'auto';
          dropdown.style.right = '0';
        }
        
        dropdown.style.display = 'block';
        
        // 添加一个直接的点击事件处理器到document
        // 使用setTimeout确保这个事件处理器不会立即触发
        setTimeout(() => {
          document.addEventListener('click', this.handleOutsideClick);
        }, 0);
      } else {
        dropdown.style.display = 'none';
        document.removeEventListener('click', this.handleOutsideClick);
      }
    }
  }
  
  private hideCellOptionsDropdown(): void {
    const dropdown = this.cellOptionsMenu.querySelector('.cell-options-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.style.display = 'none';
    }
    document.removeEventListener('click', this.handleOutsideClick);
  }
  
  private handleOutsideClick = (event: MouseEvent): void => {
    // 使用箭头函数保持this上下文
    if (this.cellOptionsMenu && !this.cellOptionsMenu.contains(event.target as Node)) {
      this.hideCellOptionsDropdown();
    }
  }
  
  private updateCellOptionsMenuPosition(): void {
    if (!this.cellOptionsMenu || !this.currentCellElement || this.cellOptionsMenu.style.display === 'none') {
      return;
    }
    
    // 获取当前单元格的位置
    const rect = this.currentCellElement.getBoundingClientRect();
    
    // 定位菜单到单元格右上角，确保有一些边距
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY - 5}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
  }
} 