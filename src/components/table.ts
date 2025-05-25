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

export function createTable(rows: number, cols: number): HTMLElement {
  if (rows < 1 || cols < 1) return null;
  
  const tableBlock = tableBlockConfig.createElement();
  const table = document.createElement('table');
  const tbody = document.createElement('tbody');

  for (let i = 0; i < rows; i++) {
    tbody.appendChild(createTableRow(cols));
  }

  table.appendChild(tbody);
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
  
  // Overlay for cell selection highlighting
  private selectionOverlay: HTMLElement | null = null;
  
  constructor(editor: Editor) {
    this.editor = editor;
    this.initCellOptionsMenu();
    this.initSelectionOverlay();
    
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
    window.addEventListener('scroll', this.updateSelectionOverlay.bind(this));
    window.addEventListener('resize', this.updateSelectionOverlay.bind(this));
    
    // Clear selection when content changes
    this.editor.theDom.addEventListener('input', this.handleContentChange.bind(this));
    this.editor.theDom.addEventListener('paste', this.handleContentChange.bind(this));
    this.editor.theDom.addEventListener('keydown', this.handleKeyDown.bind(this));
    
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
    
    this.hideCellOptionsDropdown();
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
  
  private handleContentChange(event: Event): void {
    if (this.selectedCells.length > 0) {
      // Clear selection if content changed
      this.clearSelection();
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // Clear selection on typing (excluding navigation keys)
    if (this.selectedCells.length > 0) {
      // Clear selection on content-modifying keys
      const isNavigationKey = ['Arrow', 'Home', 'End', 'Page'].some(key => event.key.includes(key));
      const isModifierOnly = event.key === 'Control' || event.key === 'Alt' || event.key === 'Shift' || event.key === 'Meta';
      
      if (!isNavigationKey && !isModifierOnly && !event.ctrlKey && !event.metaKey) {
        this.clearSelection();
      }
    }
  }
  
  private clearSelection(): void {
    this.clearHighlights()
    this.selectedCells = [];
    this.selectionStartCell = null;
  }
  
  private clearHighlights(): void {
    this.hideSelectionOverlay();
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
        this.selectedCells.push(cell);
      }
    });
    
    // Update overlay display
    this.updateSelectionOverlay();
    
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
  
  private deleteRow(): void {
    if (!this.currentCellElement || !this.currentTable) return;
    
    const cellDetails = this.calculateCellDetails();
    const selectedCellDetails = cellDetails.get(this.currentCellElement);
    if (!selectedCellDetails) return;
    
    const totalRows = this.currentTable.rows.length;
    if (totalRows <= 1) return; // Keep at least one row
    
    const targetRowStart = selectedCellDetails.startRow;
    const targetRowEnd = selectedCellDetails.endRow;
    
    // If selected cell spans multiple rows, delete all spanned rows
    const rowsToDelete: number[] = [];
    for (let i = targetRowStart; i <= targetRowEnd; i++) {
      rowsToDelete.push(i);
    }
    
    // If deleting all rows, keep the last one
    if (rowsToDelete.length >= totalRows) {
      rowsToDelete.splice(-1, 1);
    }
    
    // Process all cells to handle colspan/rowspan adjustments
    cellDetails.forEach((pos, cell) => {
      if (cell === this.currentCellElement) return; // Skip the selected cell
      
      const cellStartRow = pos.startRow;
      const cellEndRow = pos.endRow;
      
      // Check if this cell is affected by row deletion
      let affectedRowCount = 0;
      let needsRelocation = false;
      let newStartRow = cellStartRow;
      
      for (const deleteRowIdx of rowsToDelete) {
        if (deleteRowIdx >= cellStartRow && deleteRowIdx <= cellEndRow) {
          affectedRowCount++;
          
          // If the cell's start row is being deleted, it needs relocation
          if (deleteRowIdx === cellStartRow && cell.rowSpan > 1) {
            needsRelocation = true;
            // Find the next available row after deleted rows
            newStartRow = deleteRowIdx + 1;
            while (rowsToDelete.includes(newStartRow) && newStartRow < totalRows) {
              newStartRow++;
            }
          }
          if (newStartRow > cellEndRow) {
            needsRelocation = false
          }
        }
      }
      
      if (affectedRowCount > 0) {
        // Reduce rowspan
        const newRowSpan = Math.max(1, cell.rowSpan - affectedRowCount);
        cell.rowSpan = newRowSpan;
        
        // If cell needs relocation
        if (needsRelocation && newStartRow < totalRows) {
          const newRow = this.currentTable.rows[newStartRow];
          if (newRow) {
            // Calculate the original column position of this cell
            const cellPosition = cellDetails.get(cell);
            if (cellPosition) {
              const targetColStart = cellPosition.startCol;
              
              // Remove cell from current position
              cell.remove();
              
              // Find the correct insertion position in the new row
              let insertBefore = null;
              
              // Look through existing cells in the new row to find the right position
              for (let i = 0; i < newRow.cells.length; i++) {
                const existingCell = newRow.cells[i];
                const existingPos = cellDetails.get(existingCell);
                
                if (existingPos && existingPos.startCol > targetColStart) {
                  insertBefore = existingCell;
                  break;
                }
              }
              
              // Insert the cell at the correct position
              if (insertBefore) {
                newRow.insertBefore(cell, insertBefore);
              } else {
                newRow.appendChild(cell);
              }
            } else {
              // Fallback to simple append if position can't be determined
              cell.remove();
              newRow.appendChild(cell);
            }
          }
        }
      }
    });
    
    // Delete rows in reverse order to maintain indices
    rowsToDelete.sort((a, b) => b - a);
    rowsToDelete.forEach(rowIdx => {
      if (rowIdx < this.currentTable.rows.length) {
        this.currentTable.deleteRow(rowIdx);
      }
    });
    
    setCursorToFirstCell(this.currentTable);
  }
  
  private deleteColumn(): void {
    if (!this.currentCellElement || !this.currentTable) return;
    
    const cellDetails = this.calculateCellDetails();
    const selectedCellDetails = cellDetails.get(this.currentCellElement);
    if (!selectedCellDetails) return;
    
    const totalCols = this.getTableColumnCount();
    if (totalCols <= 1) return; // Keep at least one column
    
    const targetColStart = selectedCellDetails.startCol;
    const targetColEnd = selectedCellDetails.endCol;
    
    // If selected cell spans multiple columns, delete all spanned columns
    const colsToDelete: number[] = [];
    for (let i = targetColStart; i <= targetColEnd; i++) {
      colsToDelete.push(i);
    }
    
    // If deleting all columns, keep the last one
    if (colsToDelete.length >= totalCols) {
      colsToDelete.splice(-1, 1);
    }
    
    // Process all cells to handle colspan adjustments and removals
    const cellsToRemove: HTMLTableCellElement[] = [];
    
    cellDetails.forEach((pos, cell) => {
      const cellStartCol = pos.startCol;
      const cellEndCol = pos.endCol;
      
      // Check if this cell is completely within the deleted columns
      if (cellStartCol >= targetColStart && cellEndCol <= targetColEnd) {
        cellsToRemove.push(cell);
        return;
      }
      
      // Check if this cell is affected by column deletion (partially overlaps)
      let affectedColCount = 0;
      for (const deleteColIdx of colsToDelete) {
        if (deleteColIdx >= cellStartCol && deleteColIdx <= cellEndCol) {
          affectedColCount++;
        }
      }
      
      if (affectedColCount > 0) {
        // Reduce colspan
        const newColSpan = Math.max(1, cell.colSpan - affectedColCount);
        cell.colSpan = newColSpan;
      }
    });
    
    // Remove cells that are completely within deleted columns
    cellsToRemove.forEach(cell => cell.remove());
    
    setCursorToFirstCell(this.currentTable);
  }
  
  private deleteTable(): void {
    if (!this.currentCellElement || !this.currentTable) return;
    
    const tableBlock = this.currentTable.closest('[data-btype="table"]');
    if (!tableBlock) return;
    
    // Find next or previous block to set cursor
    let nextBlock = tableBlock.nextElementSibling;
    
    // Remove the table block
    tableBlock.remove();

    const basicBlock = basicBlockConfig.createElement();
    if (nextBlock) {
      (nextBlock as HTMLElement).insertAdjacentElement('beforebegin', basicBlock)
    } else {
      this.editor.theDom.appendChild(basicBlock);
    }
    const newRange = document.createRange();
    newRange.selectNodeContents(basicBlock);
    newRange.collapse(true);
    setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
    
    this.hideCellOptionsMenu();
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
      { text: 'Split cell', handler: this.splitCell },
      { text: 'Delete table', handler: this.handleDeleteTable }
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
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    const rowElement = this.currentCellElement.closest('tr');
    if (!rowElement) return;
    
    const rowIndex = Array.from(tableElement.rows).indexOf(rowElement);
    if (rowIndex === -1) return;
    
    // Calculate cell positions using the class method
    const cellDetails = this.calculateCellDetails();
    
    // Get the selected cell position
    const selectedCellDetails = cellDetails.get(this.currentCellElement);
    if (!selectedCellDetails) return;
    
    // Use the bottom edge of the selected cell as the insert position
    const insertAfterRow = selectedCellDetails.endRow;
    
    // Get the effective column count
    const colCount = this.getTableColumnCount();
    
    // Create new row
    const newRow = document.createElement('tr');
    
    // Track which columns in the new row are already covered by spanning cells
    const coveredColumns = new Array(colCount).fill(false);
    
    // Process cells that need rowspan adjustment
    cellDetails.forEach((pos, cell) => {
      // Skip the cell if it doesn't span across rows
      if (pos.startRow === pos.endRow) return;
      
      // Check if this cell spans into the insertion point
      if (pos.startRow <= insertAfterRow && pos.endRow > insertAfterRow) {
        // This cell spans across our insertion point - increase its rowspan
        cell.rowSpan = (cell.rowSpan || 1) + 1;
        
        // Mark the columns this cell covers in the new row
        for (let col = pos.startCol; col <= pos.endCol; col++) {
          if (col < coveredColumns.length) {
            coveredColumns[col] = true;
          }
        }
      }
    });
    
    // Add cells for columns not covered by spanning cells
    for (let col = 0; col < colCount; col++) {
      if (!coveredColumns[col]) {
        newRow.appendChild(createTableCell());
      }
    }
    
    const referenceRow = tableElement.rows[insertAfterRow];
    if (referenceRow) {
      referenceRow.insertAdjacentElement('afterend', newRow);
    } else {
      tableElement.appendChild(newRow);
    }
    
    // Set cursor to the first cell in the new row
    if (newRow.cells.length > 0) {
      const firstCell = newRow.cells[0];
      const newRange = document.createRange();
      newRange.selectNodeContents(firstCell.firstChild.firstChild);
      newRange.collapse(true);
      setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
    }

    this.clearSelection();
    this.editor.normalize();
  }
  
  private handleAddColumnRight(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    const cellDetails = this.calculateCellDetails();
    
    const selectedCellDetails = cellDetails.get(this.currentCellElement);
    if (!selectedCellDetails) return;
    
    const insertAfterColumn = selectedCellDetails.endCol;
    
    const rowCount = tableElement.rows.length;
    
    // 跟踪哪些行已被跨列单元格覆盖
    const coveredRows = new Array(rowCount).fill(false);
    
    // 处理需要调整 colspan 的单元格
    cellDetails.forEach((pos, cell) => {
      // 跳过未跨列的单元格
      if (pos.startCol === pos.endCol) return;
      
      // 检查此单元格是否跨越插入点
      if (pos.startCol <= insertAfterColumn && pos.endCol > insertAfterColumn) {
        // 此单元格跨越插入点 - 增加其 colspan
        cell.colSpan = (cell.colSpan || 1) + 1;
        
        // 标记此单元格覆盖的行
        for (let row = pos.startRow; row <= pos.endRow; row++) {
          if (row < coveredRows.length) {
            coveredRows[row] = true;
          }
        }
      }
    });
    
    // 为未被覆盖的行添加新单元格
    for (let rowIdx = 0; rowIdx < rowCount; rowIdx++) {
      if (coveredRows[rowIdx]) continue;
      
      const row = tableElement.rows[rowIdx];
      const cellsInRow = row.cells.length;
      
      // 找到插入新单元格的位置
      let insertBefore = null;
      
      for (let cellIdx = 0; cellIdx < cellsInRow; cellIdx++) {
        const cell = row.cells[cellIdx];
        const pos = cellDetails.get(cell);
        
        if (!pos) continue;
        
        // 如果找到一个起始列大于插入点的单元格，则在此单元格前插入
        if (pos.startCol > insertAfterColumn) {
          insertBefore = cell;
          break;
        }
      }
      
      const newCell = createTableCell();
      
      if (insertBefore) {
        row.insertBefore(newCell, insertBefore);
      } else {
        row.appendChild(newCell);
      }
    }
    
    const newCellDetails = this.calculateCellDetails();  

    // 设置光标位置到新列的某个单元格
    // 查找第一个在新列中的非跨列单元格
    for (let rowIdx = 0; rowIdx < tableElement.rows.length; rowIdx++) {
      const row = tableElement.rows[rowIdx];
      
      for (let cellIdx = 0; cellIdx < row.cells.length; cellIdx++) {
        const cell = row.cells[cellIdx];
        const pos = newCellDetails.get(cell);
        
        if (pos && pos.startCol === insertAfterColumn + 1 && pos.startCol === pos.endCol) {
          const newRange = document.createRange();
          newRange.selectNodeContents(cell.firstChild.firstChild);
          newRange.collapse(true);
          setRange(newRange.startContainer, newRange.startOffset, newRange.endContainer, newRange.endOffset);
          
          this.clearSelection();
          this.editor.normalize();
          return;
        }
      }
    }

    this.clearSelection();
    this.editor.normalize();
  }
  
  private handleDeleteRow(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    this.currentTable = tableElement;
    this.deleteRow();
    this.clearSelection();
    this.editor.normalize();
  }
  
  private handleDeleteColumn(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    this.currentTable = tableElement;
    this.deleteColumn();
    this.clearSelection();
    this.editor.normalize();
  }
  
  private handleDeleteTable(): void {
    if (!this.currentCellElement) return;
    
    const tableElement = this.currentCellElement.closest('table');
    if (!tableElement) return;
    
    this.currentTable = tableElement;
    this.deleteTable();
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
      dropdown.style.display = 'block';
      
      // Use requestAnimationFrame to ensure layout calculation after display change
      requestAnimationFrame(() => {
        const dropdownRect = dropdown.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        
        // Check if dropdown extends beyond right edge of viewport
        if (dropdownRect.right > viewportWidth) {
          dropdown.style.left = 'auto';
          dropdown.style.right = '0';
        }
        
        // Check if dropdown extends beyond bottom edge of viewport
        const viewportHeight = window.innerHeight;
        if (dropdownRect.bottom > viewportHeight) {
          dropdown.style.top = `${-dropdownRect.height - 2}px`;
        }
      });
      
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
  
  private initSelectionOverlay(): void {
    this.selectionOverlay = document.createElement('div');
    this.selectionOverlay.className = 'table-selection-overlay';
    this.selectionOverlay.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 10;
      display: none;
      background-color: rgba(24, 144, 255, 0.1);
      border: 2px solid #1890ff;
      box-sizing: border-box;
    `;
    document.body.appendChild(this.selectionOverlay);
  }
  
  private updateSelectionOverlay(): void {
    if (!this.selectionOverlay || this.selectedCells.length === 0) {
      this.hideSelectionOverlay();
      return;
    }
    
    // Calculate the bounding box of all selected cells
    let minTop = Infinity, minLeft = Infinity;
    let maxBottom = -Infinity, maxRight = -Infinity;
    
    this.selectedCells.forEach(cell => {
      const rect = cell.getBoundingClientRect();
      minTop = Math.min(minTop, rect.top);
      minLeft = Math.min(minLeft, rect.left);
      maxBottom = Math.max(maxBottom, rect.bottom);
      maxRight = Math.max(maxRight, rect.right);
    });
    
    // Position overlay
    this.selectionOverlay.style.top = `${minTop + window.scrollY}px`;
    this.selectionOverlay.style.left = `${minLeft + window.scrollX}px`;
    this.selectionOverlay.style.width = `${maxRight - minLeft}px`;
    this.selectionOverlay.style.height = `${maxBottom - minTop}px`;
    this.selectionOverlay.style.display = 'block';
  }
  
  private hideSelectionOverlay(): void {
    if (this.selectionOverlay) {
      this.selectionOverlay.style.display = 'none';
    }
  }
}

