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

// Set cursor to the first cell in a table
function setCursorToFirstCell(table: HTMLTableElement): void {
  if (!table || !table.rows.length || !table.rows[0].cells.length) return;
  
  const firstCell = table.rows[0].cells[0];
  const newRange = document.createRange();
  newRange.selectNodeContents(firstCell.firstChild.firstChild);
  newRange.collapse(true);
  setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
}

export function addRow(tableElement: HTMLTableElement, rowIdx: number): void {
  if (rowIdx < 0 || !tableElement || rowIdx >= tableElement.rows.length) return;
  
  const colCount = tableElement.rows[0].cells.length;
  const newRow = createTableRow(colCount);
  
  if (rowIdx < tableElement.rows.length - 1) {
    tableElement.rows[rowIdx].insertAdjacentElement('afterend', newRow);
  } else {
    tableElement.appendChild(newRow);
  }
  
  try {
    const firstCell = (newRow as HTMLTableRowElement).cells[0];
    const newRange = document.createRange();
    newRange.selectNodeContents(firstCell.firstChild.firstChild);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
  } catch (e) {
    console.warn("Failed to set cursor position after adding row:", e);
  }
}

export function addColumn(tableElement: HTMLTableElement, columnIdx: number): void {
  if (columnIdx < 0 || !tableElement || !tableElement.rows.length) return;
  
  Array.from(tableElement.rows).forEach(row => {
    if (columnIdx >= row.cells.length) return;
    
    const newCell = createTableCell()
    const refCell = row.cells[columnIdx];
    refCell.insertAdjacentElement('afterend', newCell);
  });
  
  const firstRowNewCell = tableElement.rows[0].cells[columnIdx + 1];
  const newRange = document.createRange();
  newRange.selectNodeContents(firstRowNewCell.firstChild.firstChild);
  newRange.collapse(true);
  setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
}

export function deleteRow(tableElement: HTMLTableElement, rowIdx: number): void {
  if (!tableElement || rowIdx < 0 || rowIdx >= tableElement.rows.length) return;
  
  // Keep at least one row
  if (tableElement.rows.length <= 1) return;
  
  tableElement.deleteRow(rowIdx);
  setCursorToFirstCell(tableElement);
}

export function deleteColumn(tableElement: HTMLTableElement, columnIdx: number): void {
  if (!tableElement || columnIdx < 0 || !tableElement.rows.length || 
      columnIdx >= tableElement.rows[0].cells.length) return;
  
  // Keep at least one column
  if (tableElement.rows[0].cells.length <= 1) return;
  
  Array.from(tableElement.rows).forEach(row => {
    if (row.cells[columnIdx]) {
      row.deleteCell(columnIdx);
    }
  });
  
  setCursorToFirstCell(tableElement);
}

export function createTable(rows: number, cols: number): HTMLElement {
  if (rows < 1 || cols < 1) return null;
  
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
  
  // Selection related state variables
  private isSelecting: boolean = false;
  private selectionStartCell: HTMLTableCellElement | null = null;
  private selectedCells: HTMLTableCellElement[] = [];
  private currentTable: HTMLTableElement | null = null;
  private currentSelectionRange: CellPosition | null = null;
  
  constructor(editor: Editor) {
    this.editor = editor;
    this.initCellOptionsMenu();
    
    // Listen for selection changes to show/hide menu
    document.addEventListener('selectionchange', this.handleSelectionChange.bind(this));
    
    this.editor.theDom.addEventListener('blur', () => {
      setTimeout(() => {
        if (!this.cellOptionsMenu?.contains(document.activeElement as Node)) {
          this.hideCellOptionsMenu();
        }
      }, 200);
    });
    
    window.addEventListener('scroll', this.updateCellOptionsMenuPosition.bind(this));
    window.addEventListener('resize', this.updateCellOptionsMenuPosition.bind(this));
    
    this.editor.theDom.addEventListener('mousedown', this.handleMouseDown.bind(this));
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }
  
  private handleMouseDown(event: MouseEvent): void {
    const target = event.target as HTMLElement;
    const cell = target.closest('td') as HTMLTableCellElement;
    
    if (!cell) return;
    
    this.currentTable = cell.closest('table');
    if (!this.currentTable) return;
    
    this.clearSelection();
    this.isSelecting = true;
    this.selectionStartCell = cell;
    this.selectedCells = [cell];
  }
  
  private handleMouseMove(event: MouseEvent): void {
    if (!this.isSelecting || !this.selectionStartCell || !this.currentTable) return;
    
    // Get the element under current mouse position
    const target = document.elementFromPoint(event.clientX, event.clientY);
    if (!target) return;
    
    const currentCell = target.closest('td') as HTMLTableCellElement;
    if (!currentCell || !this.currentTable.contains(currentCell)) return;
    
    const cellDetails = this.calculateCellDetails();
    const range = this.getCellsRange(this.selectionStartCell, currentCell, cellDetails);
    if (!range) return;
    
    const isMultipleSelection = (range.endRow > range.startRow) || (range.endCol > range.startCol);
    
    if (isMultipleSelection) {
      this.updateSelectedCells(range, cellDetails);
      event.preventDefault();
    } else {
      this.clearHighlights();
    }
  }
  
  private handleMouseUp(event: MouseEvent): void {
    this.isSelecting = false;
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
  
  // Calculate the rectangular range of each cell, handling rowSpan and colSpan
  private calculateCellDetails(): Map<HTMLTableCellElement, CellPosition> {
    const cellDetails: Map<HTMLTableCellElement, CellPosition> = new Map();
    
    if (!this.currentTable) return cellDetails;
    
    const rows = Array.from(this.currentTable.rows);
    
    // Use a 2D matrix to track cell occupancy
    const matrix: Array<Array<boolean>> = [];
    for (let i = 0; i < rows.length; i++) {
      matrix[i] = [];
    }
    
    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
      const row = rows[rowIdx];
      let colIdx = 0;
      
      for (let j = 0; j < row.cells.length; j++) {
        const cell = row.cells[j];
        const rowSpan = cell.rowSpan || 1;
        const colSpan = cell.colSpan || 1;
        
        // Find the next available column position
        while (colIdx < matrix[rowIdx].length && matrix[rowIdx][colIdx]) {
          colIdx++;
        }
        
        // Mark all cells covered by this cell as occupied
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
        
        // Record the cell's position
        cellDetails.set(cell, {
          startRow: rowIdx,
          startCol: colIdx,
          endRow: rowIdx + rowSpan - 1,
          endCol: colIdx + colSpan - 1
        });
        
        colIdx += colSpan;
      }
    }
    
    return cellDetails;
  }

  private getCellsRange(start: HTMLTableCellElement, end: HTMLTableCellElement, cellDetails?: Map<HTMLTableCellElement, CellPosition>): CellPosition | null {
    if (!this.currentTable || !start || !end) return null;
    
    const details = cellDetails || this.calculateCellDetails();
    if (!details.has(start) || !details.has(end)) return null;
    
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
    
    const details = cellDetails || this.calculateCellDetails();
    
    details.forEach((pos, cell) => {
      // Only select cells fully contained within the range
      if (pos.startRow >= range.startRow && pos.endRow <= range.endRow &&
          pos.startCol >= range.startCol && pos.endCol <= range.endCol) {
        this.highlightCell(cell);
        this.selectedCells.push(cell);
      }
    });
    
    // Save the current selection range
    this.currentSelectionRange = range;
  }
  
  // Check if any cells partially overlap with the selection but aren't fully contained
  private hasPartiallyOverlappingCells(range: CellPosition, cellDetails?: Map<HTMLTableCellElement, CellPosition>): boolean {
    if (!this.currentTable) return false;
    
    const details = cellDetails || this.calculateCellDetails();
    
    for (const [cell, pos] of details.entries()) {
      // Check if cell overlaps with selection
      const hasOverlap = !(
        pos.endRow < range.startRow || 
        pos.startRow > range.endRow || 
        pos.endCol < range.startCol || 
        pos.startCol > range.endCol
      );
      
      // Check if cell is fully contained
      const isFullyContained = 
        pos.startRow >= range.startRow && 
        pos.endRow <= range.endRow &&
        pos.startCol >= range.startCol && 
        pos.endCol <= range.endCol;
      
      // If overlaps but not fully contained, return true
      if (hasOverlap && !isFullyContained) {
        return true;
      }
    }
    
    return false;
  }
  
  private mergeCells(): void {
    if (this.selectedCells.length <= 1) return;
    
    const cellDetails = this.calculateCellDetails();
    const range = this.currentSelectionRange;
    if (!range) return;
    
    // Don't merge if any cells are only partially in the selection
    if (this.hasPartiallyOverlappingCells(range, cellDetails)) {
      return;
    }
    
    const tableRows = this.currentTable.rows.length;
    const tableCols = this.getTableColumnCount();
    
    // Calculate initial rowspan and colspan
    const rowSpan = range.endRow - range.startRow + 1;
    const colSpan = range.endCol - range.startCol + 1;
    
    // Target cell (top-left corner)
    const targetCell = this.findCellAt(range.startRow, range.startCol);
    if (!targetCell) return;
    
    // Collect content from all selected cells
    const contents: Node[] = [];
    const seenCells = new Set<HTMLTableCellElement>();
    
    this.selectedCells.forEach(cell => {
      if (!seenCells.has(cell)) {
        Array.from(cell.childNodes).forEach(node => {
          contents.push(node.cloneNode(true));
        });
        seenCells.add(cell);
      }
    });
    
    // Add an empty basic block if there's no content
    if (contents.length === 0) {
      const basicBlock = document.createElement('div');
      basicBlock.setAttribute('data-btype', 'basic');
      basicBlock.innerHTML = '<br>';
      contents.push(basicBlock);
    }
    
    // 1. Execute merge operation
    
    // Set target cell attributes and content
    targetCell.rowSpan = rowSpan;
    targetCell.colSpan = colSpan;
    targetCell.replaceChildren(...contents);
    
    // Remove other selected cells
    for (let r = range.endRow; r >= range.startRow; r--) {
      const row = this.currentTable.rows[r];
      if (!row) continue;
      
      for (let c = row.cells.length - 1; c >= 0; c--) {
        const cell = row.cells[c];
        if (cell === targetCell) continue; // Skip target cell
        
        const pos = cellDetails.get(cell);
        if (!pos) continue;
        
        // Delete cells within the range
        if (pos.startRow >= range.startRow && 
            pos.endRow <= range.endRow &&
            pos.startCol >= range.startCol && 
            pos.endCol <= range.endCol) {
          row.deleteCell(c);
        }
      }
    }
    
    // 2. Handle special cases after merging
    
    // Special case: spanning all rows and columns
    if (rowSpan === tableRows && colSpan === tableCols) {
      // Set to a single cell
      targetCell.rowSpan = 1;
      targetCell.colSpan = 1;
      
      // Keep first row, delete all other rows
      while (this.currentTable.rows.length > 1) {
        this.currentTable.deleteRow(1);
      }
    }
    // Special case: spanning all rows
    else if (rowSpan === tableRows) {
      targetCell.colSpan = 1;
    }
    // Special case: spanning all columns
    else if (colSpan === tableCols) {
      targetCell.rowSpan = 1;
      // Delete only rows in the selection range
      for (let r = range.endRow; r >= range.startRow; r--) {
        if (r === range.startRow) continue; // Skip target row
        this.currentTable.deleteRow(r);
      }
    }
    
    this.clearSelection();
    this.editor.normalize();
  }
  
  // Get the number of columns in the table
  private getTableColumnCount(): number {
    if (!this.currentTable || !this.currentTable.rows.length) return 0;
    
    let colCount = 0;
    const firstRow = this.currentTable.rows[0];
    
    for (let i = 0; i < firstRow.cells.length; i++) {
      colCount += firstRow.cells[i].colSpan || 1;
    }
    
    return colCount;
  }
  
  // Find cell at specific row and column indices
  private findCellAt(rowIndex: number, colIndex: number): HTMLTableCellElement | null {
    if (!this.currentTable) return null;
    
    const row = this.currentTable.rows[rowIndex];
    if (!row) return null;
    
    // Iterate through cells in the row, calculating actual column position
    let currentColIndex = 0;
    
    for (let i = 0; i < row.cells.length; i++) {
      const cell = row.cells[i];
      
      if (currentColIndex === colIndex) {
        return cell;
      }
      
      currentColIndex += cell.colSpan || 1;
    }
    
    return null;
  }
  
  private splitCell(): void {
    if (this.selectedCells.length !== 1) return;
    
    const cell = this.selectedCells[0];
    if (cell.rowSpan === 1 && cell.colSpan === 1) return;
    
    const table = cell.closest('table');
    if (!table) return;
    
    // Find cell position using cellDetails for consistency
    const cellDetails = this.calculateCellDetails();
    const cellPosition = cellDetails.get(cell);
    if (!cellPosition) return;
    
    const rowIndex = cellPosition.startRow;
    const colIndex = cellPosition.startCol;
    const rows = Array.from(table.rows);
    
    const originalRowSpan = cell.rowSpan;
    const originalColSpan = cell.colSpan;
    
    // Reset the original cell
    cell.rowSpan = 1;
    cell.colSpan = 1;
    
    // Create and insert new cells
    for (let i = 0; i < originalRowSpan; i++) {
      const row = rows[rowIndex + i];
      if (!row) continue;
      
      for (let j = 0; j < originalColSpan; j++) {
        // Skip the original cell
        if (i === 0 && j === 0) continue;
        
        const newCell = createTableCell();
        
        if (j === 0) {
          // For cells in first column, special handling for position
          let insertBefore = null;
          
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
          // For other cells, insert at appropriate position
          if (colIndex + j < row.cells.length) {
            row.insertBefore(newCell, row.cells[colIndex + j]);
          } else {
            row.appendChild(newCell);
          }
        }
      }
    }
    
    this.clearSelection();
    this.editor.normalize();
  }
  
  private initCellOptionsMenu(): void {
    if (this.cellOptionsMenu) {
      document.body.removeChild(this.cellOptionsMenu);
    }
    
    this.cellOptionsMenu = document.createElement('div');
    this.cellOptionsMenu.className = 'table-cell-options';
    
    const arrowButton = document.createElement('button');
    arrowButton.className = 'cell-options-arrow';
    arrowButton.innerHTML = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M2 4L6 8L10 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;
    arrowButton.addEventListener('click', this.toggleCellOptionsDropdown.bind(this));
    this.cellOptionsMenu.appendChild(arrowButton);
    
    const dropdown = document.createElement('div');
    dropdown.className = 'cell-options-dropdown';
    
    const menuItems = [
      { text: 'Add row below', handler: this.handleAddRowBelow },
      { text: 'Add column right', handler: this.handleAddColumnRight },
      { text: 'Delete row', handler: this.handleDeleteRow },
      { text: 'Delete column', handler: this.handleDeleteColumn },
      { text: 'Merge cells', handler: this.mergeCells },
      { text: 'Split cell', handler: this.splitCell }
    ];
    
    menuItems.forEach((item, index) => {
      const menuItem = document.createElement('div');
      menuItem.className = 'cell-option-item';
      menuItem.textContent = item.text;
      
      if (index === menuItems.length - 1) {
        menuItem.style.borderBottom = 'none';
      }
      
      menuItem.addEventListener('click', (event) => {
        event.stopPropagation();
        item.handler.call(this);
        this.hideCellOptionsDropdown();
      });
      
      dropdown.appendChild(menuItem);
    });
    
    this.cellOptionsMenu.appendChild(dropdown);
    document.body.appendChild(this.cellOptionsMenu);
    
    this.cellOptionsMenu.addEventListener('click', (event) => {
      event.stopPropagation();
    });
  }
  
  private handleAddRowBelow(): void {
    if (!this.currentCellElement) return;
    
    const rowElement = this.currentCellElement.closest('tr');
    if (!rowElement) return;
    
    const tableElement = rowElement.closest('table');
    if (!tableElement) return;
    
    const rowIndex = Array.from(tableElement.rows).indexOf(rowElement);
    if (rowIndex === -1) return;
    
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
    setTimeout(() => this.updateCellOptionsMenu(), 0);
  }
  
  updateCellOptionsMenu(): void {
    const range = getSelectionRange();
    if (!range) {
      this.hideCellOptionsMenu();
      return;
    }
    
    // Find if selection is inside a table cell
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
    
    // If same cell, just update position
    if (this.currentCellElement === cellElement && this.cellOptionsMenu.style.display !== 'none') {
      this.updateCellOptionsMenuPosition();
      return;
    }
    
    // Get cell position
    const rect = cellElement.getBoundingClientRect();
    
    // Position menu at top-right of cell with some margin
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY + 2}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
    this.cellOptionsMenu.style.display = 'block';
    
    // Hide dropdown part
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
    event.preventDefault();
    
    const dropdown = this.cellOptionsMenu.querySelector('.cell-options-dropdown') as HTMLElement;
    if (!dropdown) return;
    
    if (dropdown.style.display === 'none') {
      const buttonRect = (event.target as HTMLElement).getBoundingClientRect();
      dropdown.style.top = `${buttonRect.height + 2}px`;
      dropdown.style.left = '0';
      
      const dropdownRect = dropdown.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      if (buttonRect.left + dropdownRect.width > viewportWidth) {
        dropdown.style.left = 'auto';
        dropdown.style.right = '0';
      }
      
      dropdown.style.display = 'block';
      
      // Update merge/split cell option availability
      const mergeCellsOption = dropdown.querySelector('.cell-option-item:nth-of-type(5)') as HTMLElement;
      const splitCellOption = dropdown.querySelector('.cell-option-item:nth-of-type(6)') as HTMLElement;
      
      if (mergeCellsOption && splitCellOption) {
        // Check if cells can be merged
        const canMerge = this.selectedCells.length > 1;
        if (canMerge) {
          // Check if any cells are only partially in selection
          const cellDetails = this.calculateCellDetails();
          const range = this.getCellsRange(this.selectedCells[0], this.selectedCells[this.selectedCells.length - 1], cellDetails);
          if (range && this.hasPartiallyOverlappingCells(range, cellDetails)) {
            mergeCellsOption.classList.add('disabled');
          } else {
            mergeCellsOption.classList.remove('disabled');
          }
        } else {
          mergeCellsOption.classList.add('disabled');
        }
        
        // Check if cell can be split
        const canSplit = this.selectedCells.length === 1 && 
                      (this.selectedCells[0].rowSpan > 1 || this.selectedCells[0].colSpan > 1);
        
        canSplit ? splitCellOption.classList.remove('disabled') : splitCellOption.classList.add('disabled');
      }
      
      setTimeout(() => {
        document.addEventListener('click', this.handleOutsideClick);
      }, 0);
    } else {
      dropdown.style.display = 'none';
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }
  
  private hideCellOptionsDropdown(): void {
    const dropdown = this.cellOptionsMenu?.querySelector('.cell-options-dropdown') as HTMLElement;
    if (dropdown) {
      dropdown.style.display = 'none';
    }
    document.removeEventListener('click', this.handleOutsideClick);
  }
  
  private handleOutsideClick = (event: MouseEvent): void => {
    // Arrow function to maintain this context
    if (this.cellOptionsMenu && !this.cellOptionsMenu.contains(event.target as Node)) {
      this.hideCellOptionsDropdown();
    }
  }
  
  private updateCellOptionsMenuPosition(): void {
    if (!this.cellOptionsMenu || !this.currentCellElement || this.cellOptionsMenu.style.display === 'none') {
      return;
    }
    
    // Get current cell position
    const rect = this.currentCellElement.getBoundingClientRect();
    
    // Position menu at top-right of cell with some margin
    this.cellOptionsMenu.style.top = `${rect.top + window.scrollY + 2}px`;
    this.cellOptionsMenu.style.left = `${rect.right + window.scrollX - 25}px`;
  }
  
  insertTable(rows: number, cols: number): void {
    if (!rows || !cols || rows < 1 || cols < 1) return;
    
    let range = getSelectionRange();
    if (!range) return;

    let block = getClosestBlock(range.endContainer)
    
    const tableBlock = createTable(rows, cols);
    if (!tableBlock) return;
    
    if (block) {
      block.insertAdjacentElement('afterend', tableBlock);
    } else {
      this.editor.theDom.appendChild(tableBlock);
    }
    
    const firstCell = tableBlock.querySelector('td');
    const basicBlock = firstCell?.querySelector('div[data-btype="basic"]');
    
    if (firstCell) {
      const newRange = document.createRange();
      newRange.selectNodeContents(basicBlock || firstCell);
      newRange.collapse(true);
      setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
    }
    
    this.editor.normalize();
  }
}

