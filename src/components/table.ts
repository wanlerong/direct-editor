import { setRange } from "../range.js";
import {tableBlockConfig, basicBlockConfig, createTableRow, createTableCell} from "../block/block.js";
import { Editor } from "../editor.js";
import { getSelectionRange } from "../range.js";
import {getClosestBlock} from "../domUtils";

export interface CellPosition {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

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
  
  // 框选相关的状态变量
  private isSelecting: boolean = false;
  private selectionStartCell: HTMLTableCellElement | null = null;
  private selectedCells: HTMLTableCellElement[] = [];
  private currentTable: HTMLTableElement | null = null;
  
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
    
    // 监听鼠标按下事件，用于开始选择
    this.editor.theDom.addEventListener('mousedown', this.handleMouseDown.bind(this));
    // 监听鼠标移动事件，用于更新选择范围
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    // 监听鼠标抬起事件，用于完成选择
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }
  
  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const cell = target.closest('td') as HTMLTableCellElement;
    
    if (cell) {
      this.currentTable = cell.closest('table');
      if (!this.currentTable) return;
      
      // 清除之前的选择
      this.clearSelection();
      
      // 记录选择起始单元格
      this.isSelecting = true;
      this.selectionStartCell = cell;
      
      // 仅记录单元格，但不应用高亮样式
      this.selectedCells = [cell];
      
      // 不阻止默认行为，允许正常的文本选择
    }
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isSelecting || !this.selectionStartCell || !this.currentTable) return;
    
    // 获取当前鼠标下的元素
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    
    const currentCell = target.closest('td') as HTMLTableCellElement;
    if (!currentCell || !this.currentTable.contains(currentCell)) return;
    
    // 计算一次单元格位置信息，后续复用
    const cellDetails = this.calculateCellDetails();
    
    // 计算选择区域
    const range = this.getCellsRange(this.selectionStartCell, currentCell, cellDetails);
    if (!range) return;
    
    // 检查选择范围是否包含多个单元格
    const isMultipleSelection = 
      (range.endRow > range.startRow) || (range.endCol > range.startCol);
    
    if (isMultipleSelection) {
      this.updateSelectedCells(range, cellDetails);
      event.preventDefault();
    } else {
      this.clearHighlights();
    }
  }
  
  private handleMouseUp(event: MouseEvent): void {
    if (this.isSelecting) {
      this.isSelecting = false;
    }
  }
  
  private clearSelection(): void {
    this.clearHighlights()
    this.selectedCells = [];
    this.selectionStartCell = null;
  }
  
  private clearHighlights(): void {
    this.selectedCells.forEach(cell => {
      cell.classList.remove('cell-selected');
    });
  }
  
  private highlightCell(cell: HTMLTableCellElement): void {
    cell.classList.add('cell-selected');
  }
  
  // 计算表格中所有单元格的位置信息
  // 每个单元格所占的矩形范围
  private calculateCellDetails(): Map<HTMLTableCellElement, CellPosition> {
    const cellDetails: Map<HTMLTableCellElement, CellPosition> = new Map();
    
    if (!this.currentTable) return cellDetails;
    
    const rows = Array.from(this.currentTable.rows);
    
    // 使用二维矩阵记录单元格占用情况
    const matrix: Array<Array<boolean>> = [];
    for (let i = 0; i < rows.length; i++) {
      matrix[i] = [];
    }
    
    // 计算所有单元格的实际位置和范围
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      let colIdx = 0;
      
      for (let j = 0; j < row.cells.length; j++) {
        const cell = row.cells[j];
        const rowSpan = cell.rowSpan || 1;
        const colSpan = cell.colSpan || 1;
        
        // 找到当前行中未被占用的第一个列位置
        while (colIdx < matrix[rowIdx].length && matrix[rowIdx][colIdx]) {
          colIdx++;
        }
        
        // 标记此单元格占用的所有位置
        for (let r = 0; r < rowSpan; r++) {
          for (let c = 0; c < colSpan; c++) {
            if (rowIdx + r < matrix.length) {
              while (matrix[rowIdx + r].length <= colIdx + c) {
                matrix[rowIdx + r].push(false);
              }
              matrix[rowIdx + r][colIdx + c] = true;
            }
          }
        }
        
        // 记录单元格的位置信息
        cellDetails.set(cell, {
          startRow: rowIdx,
          startCol: colIdx,
          endRow: rowIdx + rowSpan - 1,
          endCol: colIdx + colSpan - 1
        });
        
        colIdx += colSpan; // 移动到下一个可能的列位置
      }
    }
    
    return cellDetails;
  }

  private getCellsRange(start: HTMLTableCellElement, end: HTMLTableCellElement, cellDetails?: Map<HTMLTableCellElement, CellPosition>): CellPosition | null {
    if (!this.currentTable || !start || !end) return null;
    
    // 获取每个单元格的实际位置和范围，如果没有传递则计算
    const details = cellDetails || this.calculateCellDetails();
    
    // 如果没有找到起始或结束单元格，返回null
    if (!details.has(start) || !details.has(end)) return null;
    
    // 获取起始和结束单元格的位置信息
    const startDetails = details.get(start)!;
    const endDetails = details.get(end)!;
    
    return {
      startRow: Math.min(startDetails.startRow, endDetails.startRow),
      startCol: Math.min(startDetails.startCol, endDetails.startCol),
      endRow: Math.max(startDetails.endRow, endDetails.endRow),
      endCol: Math.max(startDetails.endCol, endDetails.endCol)
    };
  }
  
  private updateSelectedCells(range: CellPosition, cellDetails?: Map<HTMLTableCellElement, CellPosition>): void {
    if (!this.currentTable) return;
    
    this.clearHighlights();
    this.selectedCells = [];
    
    // 获取表格中所有单元格的实际位置和范围，如果没有传递则计算
    const details = cellDetails || this.calculateCellDetails();
    
    // 根据选择范围确定选中的单元格
    details.forEach((pos, cell) => {
      // 单元格完全包含在选择范围内才被选中
      if (pos.startRow >= range.startRow && pos.endRow <= range.endRow &&
          pos.startCol >= range.startCol && pos.endCol <= range.endCol) {
        this.highlightCell(cell);
        this.selectedCells.push(cell);
      }
    });
  }
  
  // todo: is Draft now
  private mergeCells(): void {
    if (this.selectedCells.length <= 1) return;
    
    // 计算单元格位置信息
    const cellDetails = this.calculateCellDetails();
    
    // 获取选择区域
    const range = this.getCellsRange(this.selectedCells[0], this.selectedCells[this.selectedCells.length - 1], cellDetails);
    if (!range) return;
    
    // 计算合并后的单元格应该占据的行数和列数
    const rowSpan = range.endRow - range.startRow + 1;
    const colSpan = range.endCol - range.startCol + 1;
    
    // 获取第一个选中的单元格作为保留的单元格
    const targetCell = this.selectedCells[0];
    
    // 收集所有选中单元格的内容
    const contents: Node[] = [];
    this.selectedCells.forEach(cell => {
      Array.from(cell.childNodes).forEach(node => {
        contents.push(node.cloneNode(true));
      });
    });
    
    targetCell.rowSpan = rowSpan;
    targetCell.colSpan = colSpan;
    targetCell.replaceChildren(...contents);
    
    // 移除其他被合并的单元格
    for (let i = range.startRow; i <= range.endRow; i++) {
      const row = this.currentTable.rows[i];
      if (!row) continue;
      
      // 从右向左删除，避免索引变化
      for (let j = range.endCol; j >= range.startCol; j--) {
        // 跳过目标单元格
        if (i === range.startRow && j === range.startCol) continue;
        
        const cell = row.cells[j];
        if (cell) {
          row.deleteCell(j);
        }
      }
    }
    
    this.clearSelection();
    this.editor.normalize();
  }
  
  // todo: is Draft now
  private splitCell(): void {
    if (this.selectedCells.length !== 1) return;
    
    const cell = this.selectedCells[0];
    if (cell.rowSpan === 1 && cell.colSpan === 1) return;
    
    const table = cell.closest('table');
    if (!table) return;
    
    // 获取单元格的位置
    let rowIndex = -1, colIndex = -1;
    const rows = Array.from(table.rows);
    
    for (let i = 0; i < rows.length; i++) {
      const cells = Array.from(rows[i].cells);
      const idx = cells.indexOf(cell);
      if (idx !== -1) {
        rowIndex = i;
        colIndex = idx;
        break;
      }
    }
    
    if (rowIndex === -1 || colIndex === -1) return;
    
    // 保存原来的rowSpan和colSpan
    const originalRowSpan = cell.rowSpan;
    const originalColSpan = cell.colSpan;
    
    // 重置当前单元格的rowSpan和colSpan
    cell.rowSpan = 1;
    cell.colSpan = 1;
    
    // 创建新的单元格
    for (let i = 0; i < originalRowSpan; i++) {
      const row = rows[rowIndex + i];
      if (!row) continue;
      
      for (let j = 0; j < originalColSpan; j++) {
        // 跳过原单元格位置
        if (i === 0 && j === 0) continue;
        
        const newCell = createTableCell();
        
        // 根据位置插入新单元格
        if (j === 0) {
          // 如果是每行的第一个，找到下一行的适当位置
          let insertBefore = null;
          
          // 找到当前行中应该插入的位置
          for (let k = 0; k < row.cells.length; k++) {
            const currentIndexInRow = row.cells[k].cellIndex;
            if (currentIndexInRow > colIndex) {
              insertBefore = row.cells[k];
              break;
            }
          }
          
          if (insertBefore) {
            row.insertBefore(newCell, insertBefore);
          } else {
            row.appendChild(newCell);
          }
        } else {
          // 如果不是第一个，直接在当前行中插入
          if (colIndex + j < row.cells.length) {
            row.insertBefore(newCell, row.cells[colIndex + j]);
          } else {
            row.appendChild(newCell);
          }
        }
      }
    }
    
    // 清除选择并更新
    this.clearSelection();
    this.editor.normalize();
  }
  
  private initCellOptionsMenu(): void {
    // 如果已存在，则删除旧的菜单
    if (this.cellOptionsMenu) {
      document.body.removeChild(this.cellOptionsMenu);
    }
    
    // 创建新的菜单元素
    this.cellOptionsMenu = document.createElement('div');
    this.cellOptionsMenu.className = 'table-cell-options';
    
    // 创建箭头按钮
    const arrowButton = document.createElement('button');
    arrowButton.className = 'cell-options-arrow';
    arrowButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    arrowButton.addEventListener('click', this.toggleCellOptionsDropdown.bind(this));
    this.cellOptionsMenu.appendChild(arrowButton);
    
    // 创建下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'cell-options-dropdown';
    
    // 添加菜单项
    const addRowOption = document.createElement('div');
    addRowOption.className = 'cell-option-item';
    addRowOption.textContent = 'Add row below';
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
    deleteColumnOption.addEventListener('click', (event) => {
      event.stopPropagation(); // 阻止事件冒泡
      this.handleDeleteColumn();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(deleteColumnOption);
    
    // 合并单元格选项
    const mergeCellsOption = document.createElement('div');
    mergeCellsOption.className = 'cell-option-item';
    mergeCellsOption.textContent = 'Merge cells';
    mergeCellsOption.addEventListener('click', (event) => {
      event.stopPropagation();
      this.mergeCells();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(mergeCellsOption);
    
    // 拆分单元格选项
    const splitCellOption = document.createElement('div');
    splitCellOption.className = 'cell-option-item';
    splitCellOption.textContent = 'Split cell';
    splitCellOption.style.borderBottom = 'none'; // 最后一项不需要底部边框
    splitCellOption.addEventListener('click', (event) => {
      event.stopPropagation();
      this.splitCell();
      this.hideCellOptionsDropdown();
    });
    dropdown.appendChild(splitCellOption);
    
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
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY + 2}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
    this.cellOptionsMenu.style.display = 'block';
    
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
    this.clearSelection();
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
        
        // 更新合并/拆分单元格选项的可用性
        const mergeCellsOption = dropdown.querySelector('.cell-option-item:nth-of-type(5)') as HTMLElement;
        const splitCellOption = dropdown.querySelector('.cell-option-item:nth-of-type(6)') as HTMLElement;
        
        if (mergeCellsOption && splitCellOption) {
          // 只有选择了多个单元格才允许合并
          if (this.selectedCells.length > 1) {
            mergeCellsOption.classList.remove('disabled');
          } else {
            mergeCellsOption.classList.add('disabled');
          }
          
          // 只有选择了一个已合并的单元格才允许拆分
          const canSplit = this.selectedCells.length === 1 && 
                         (this.selectedCells[0].rowSpan > 1 || this.selectedCells[0].colSpan > 1);
          if (canSplit) {
            splitCellOption.classList.remove('disabled');
          } else {
            splitCellOption.classList.add('disabled');
          }
        }
        
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
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY + 2}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
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
}

