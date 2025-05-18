import {getCellColumnIndex, addRow, addColumn, deleteRow, deleteColumn, TableManager, CellPosition} from "./table";
import {Editor} from "../editor";
import {getSelectionRange} from "../range";

// Mock range functions
jest.mock("../range", () => ({
  setRange: jest.fn(),
  getSelectionRange: jest.fn()
}));

describe('Table Functions', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    jest.clearAllMocks();
  });

  test('getCellColumnIndex returns correct index', () => {
    document.body.innerHTML = `
      <table>
        <tr>
          <td id="cell0"></td>
          <td id="cell1"></td>
          <td id="cell2"></td>
        </tr>
      </table>
    `;

    const cell0 = document.getElementById('cell0') as HTMLTableCellElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement;

    expect(getCellColumnIndex(cell0)).toBe(0);
    expect(getCellColumnIndex(cell1)).toBe(1);
    expect(getCellColumnIndex(cell2)).toBe(2);
  });

  test('getCellColumnIndex returns -1 when cell has no parent row', () => {
    const cell = document.createElement('td');
    expect(getCellColumnIndex(cell)).toBe(-1);
  });

  test('addRow adds a new row to table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialRowCount = tableElement.rows.length;

    addRow(tableElement, 0);

    expect(tableElement.rows.length).toBe(initialRowCount + 1);
    expect(tableElement.rows[1].cells.length).toBe(2);
  });

  test('addColumn adds a new column to table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialColCount = tableElement.rows[0].cells.length;

    addColumn(tableElement, 0);

    expect(tableElement.rows[0].cells.length).toBe(initialColCount + 1);
    expect(tableElement.rows[1].cells.length).toBe(initialColCount + 1);
  });

  test('deleteRow removes a row from table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialRowCount = tableElement.rows.length;

    deleteRow(tableElement, 1);

    expect(tableElement.rows.length).toBe(initialRowCount - 1);
  });

  test('deleteColumn removes a column from table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
          <td><div data-btype="basic"><br></div></td>
        </tr>
        <tr>
          <td><div data-btype="basic"><br></div></td>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialColCount = tableElement.rows[0].cells.length;

    deleteColumn(tableElement, 1);

    expect(tableElement.rows[0].cells.length).toBe(initialColCount - 1);
    expect(tableElement.rows[1].cells.length).toBe(initialColCount - 1);
  });

  test('deleteRow does not remove the last row', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialRowCount = tableElement.rows.length;

    deleteRow(tableElement, 0);

    expect(tableElement.rows.length).toBe(initialRowCount);
  });

  test('deleteColumn does not remove the last column', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td><div data-btype="basic"><br></div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const initialColCount = tableElement.rows[0].cells.length;

    deleteColumn(tableElement, 0);

    expect(tableElement.rows[0].cells.length).toBe(initialColCount);
  });
});

describe('TableManager', () => {
  let editor: Editor;
  let editorDom: HTMLElement;
  let firstChild: ChildNode;
  let firstTextNode: ChildNode;
  let tableManager: TableManager;

  beforeEach(() => {
    let container = document.createElement('div');
    editor = new Editor(container, () => {
    }, () => {
    });
    document.body.appendChild(container)
    editorDom = (container.firstChild as HTMLElement);

    editorDom.innerHTML = '<div data-btype="basic">1234</div>'
    firstChild = editorDom.firstChild!
    firstTextNode = firstChild.firstChild!
    tableManager = new TableManager(editor);
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  test('insertTable creates and inserts a table', () => {
    const range = document.createRange();
    range.setStart(firstTextNode, 2);
    range.setEnd(firstTextNode, 2);
    (getSelectionRange as jest.Mock).mockReturnValue(range);

    editor.toolbar.insertTable(2, 2)
    const expectedHTML = `
      <div data-btype="basic">1234</div>
      <div data-btype="table">
        <table>
        <tr><td><div data-btype="basic"><br></div></td><td><div data-btype="basic"><br></div></td></tr>
        <tr><td><div data-btype="basic"><br></div></td><td><div data-btype="basic"><br></div></td></tr>
        </table>
      </div>
  `.replace(/\s+/g, '')

    const actualHTML = editorDom.innerHTML.replace(/\s+/g, '')
    expect(actualHTML).toBe(expectedHTML)
  });

  test('insertTable does nothing with invalid input', () => {
    const range = document.createRange();
    range.setStart(firstTextNode, 2);
    range.setEnd(firstTextNode, 2);
    (getSelectionRange as jest.Mock).mockReturnValue(range);

    editor.toolbar.insertTable(0, 3);
    expect(editorDom.querySelector('table')).toBeNull();

    editor.toolbar.insertTable(3, 0);
    expect(editorDom.querySelector('table')).toBeNull();

    editor.toolbar.insertTable(-1, -1);
    expect(editorDom.querySelector('table')).toBeNull();
  });

  test('insertTable handles no selection', () => {
    (getSelectionRange as jest.Mock).mockReturnValue(null);
    editor.toolbar.insertTable(2, 2);
    expect(editorDom.querySelector('table')).toBeNull();
  });
  
  // 测试获取单元格范围计算，特别关注合并单元格的情况
  test('getCellsRange handles merged cells', () => {
    const getCellsRangeMethod = (TableManager.prototype as any).getCellsRange;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1">A</td>
          <td id="cell2">B</td>
          <td id="cell3">C</td>
        </tr>
        <tr>
          <td id="cell4" colspan="2">D</td>
          <td id="cell5">F</td>
        </tr>
        <tr>
          <td id="cell6">G</td>
          <td id="cell7">H</td>
          <td id="cell8">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    const cell7 = document.getElementById('cell7') as HTMLTableCellElement;
    
    // 设置私有属性currentTable以便方法可以运行
    (tableManager as any).currentTable = table;
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试从H到D的选择（从cell7到cell4）
    const range = getCellsRangeMethod.call(tableManager, cell7, cell4, cellDetails);
    
    // 验证范围计算是否正确
    expect(range).not.toBeNull();
    expect(range.startRow).toBe(1); // D的行索引
    expect(range.startCol).toBe(0); // D的列索引
    expect(range.endRow).toBe(2);   // H的行索引
    expect(range.endCol).toBe(1);   // H的列索引
  });
  
  // 测试选中单元格的更新，特别是对合并单元格的处理
  test('updateSelectedCells correctly selects cells considering merged cells', () => {
    const updateSelectedCellsMethod = (TableManager.prototype as any).updateSelectedCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1">A</td>
          <td id="cell2">B</td>
          <td id="cell3">C</td>
        </tr>
        <tr>
          <td id="cell4" colspan="2">D</td>
          <td id="cell5">F</td>
        </tr>
        <tr>
          <td id="cell6">G</td>
          <td id="cell7">H</td>
          <td id="cell8">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).highlightCell = jest.fn();
    (tableManager as any).clearHighlights = jest.fn();
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 范围包含D、G和H单元格（不包括F，因为F的位置已经被D的colspan覆盖）
    const range: CellPosition = {
      startRow: 1,
      startCol: 0,
      endRow: 2,
      endCol: 1
    };
    
    // 调用方法
    updateSelectedCellsMethod.call(tableManager, range, cellDetails);
    
    // 验证结果
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    const cell6 = document.getElementById('cell6') as HTMLTableCellElement;
    const cell7 = document.getElementById('cell7') as HTMLTableCellElement;
    
    // 检查selectedCells数组中是否包含正确的单元格
    expect((tableManager as any).highlightCell).toHaveBeenCalledTimes(3);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell4);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell6);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell7);
  });
  
  // 测试单元格合并功能
  test('mergeCells correctly merges selected cells', () => {
    const mergeCellsMethod = (TableManager.prototype as any).mergeCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建表格并设置测试环境
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1"><div data-btype="basic">A</div></td>
          <td id="cell2"><div data-btype="basic">B</div></td>
        </tr>
        <tr>
          <td id="cell3"><div data-btype="basic">C</div></td>
          <td id="cell4"><div data-btype="basic">D</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement;
    const cell3 = document.getElementById('cell3') as HTMLTableCellElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1, cell2, cell3, cell4];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    
    // 调用合并方法
    mergeCellsMethod.call(tableManager);
    
    // 验证结果
    expect(cell1.rowSpan).toBe(2);
    expect(cell1.colSpan).toBe(2);
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells.length).toBe(1);
    expect(table.rows[1].cells.length).toBe(0);
    expect((tableManager as any).clearSelection).toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).toHaveBeenCalled();
  });
  
  // 测试单元格拆分功能
  test('splitCell correctly splits a merged cell', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="mergedCell" rowspan="2" colspan="2"><div data-btype="basic">Merged</div></td>
        </tr>
        <tr></tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const mergedCell = document.getElementById('mergedCell') as HTMLTableCellElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [mergedCell];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // 调用拆分方法
    splitCellMethod.call(tableManager);
    
    // 验证结果
    expect(mergedCell.rowSpan).toBe(1);
    expect(mergedCell.colSpan).toBe(1);
    expect(table.rows[0].cells.length).toBe(2);
    expect(table.rows[1].cells.length).toBe(2);
    expect((tableManager as any).clearSelection).toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).toHaveBeenCalled();
  });

  // 测试从A单元格到D单元格的选择，确保B也被正确选中
  test('getCellsRange and updateSelectedCells correctly handle A to D selection including B', () => {
    const getCellsRangeMethod = (TableManager.prototype as any).getCellsRange;
    const updateSelectedCellsMethod = (TableManager.prototype as any).updateSelectedCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1">A</td>
          <td id="cell2">B</td>
          <td id="cell3">C</td>
        </tr>
        <tr>
          <td id="cell4" colspan="2">D</td>
          <td id="cell5">F</td>
        </tr>
        <tr>
          <td id="cell6">G</td>
          <td id="cell7">H</td>
          <td id="cell8">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement; // A
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement; // B
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement; // D
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).highlightCell = jest.fn();
    (tableManager as any).clearHighlights = jest.fn();
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试从A到D的选择
    const range = getCellsRangeMethod.call(tableManager, cell1, cell4, cellDetails);
    
    // 验证范围计算是否正确
    expect(range).not.toBeNull();
    expect(range.startRow).toBe(0); // A的行索引
    expect(range.startCol).toBe(0); // A的列索引
    expect(range.endRow).toBe(1);   // D的行索引
    expect(range.endCol).toBe(1);   // D的列索引（考虑D的colspan=2后的右边界）
    
    // 调用updateSelectedCells方法
    updateSelectedCellsMethod.call(tableManager, range, cellDetails);
    
    // 验证结果 - A、B和D单元格都应该被选中
    expect((tableManager as any).highlightCell).toHaveBeenCalledTimes(3);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell1); // A
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell2); // B
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell4); // D
  });
  
  // 测试从F到B的选择场景
  test('getCellsRange and updateSelectedCells correctly handle F to B selection', () => {
    const getCellsRangeMethod = (TableManager.prototype as any).getCellsRange;
    const updateSelectedCellsMethod = (TableManager.prototype as any).updateSelectedCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1">A</td>
          <td id="cell2">B</td>
          <td id="cell3">C</td>
        </tr>
        <tr>
          <td id="cell4" colspan="2">D</td>
          <td id="cell5">F</td>
        </tr>
        <tr>
          <td id="cell6">G</td>
          <td id="cell7">H</td>
          <td id="cell8">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement; // B
    const cell3 = document.getElementById('cell3') as HTMLTableCellElement; // C
    const cell5 = document.getElementById('cell5') as HTMLTableCellElement; // F
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).highlightCell = jest.fn();
    (tableManager as any).clearHighlights = jest.fn();
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试从F到B的选择
    const range = getCellsRangeMethod.call(tableManager, cell5, cell2, cellDetails);
    
    // 验证范围计算是否正确
    expect(range).not.toBeNull();
    expect(range.startRow).toBe(0); // B的行索引
    expect(range.startCol).toBe(1); // B的列索引
    expect(range.endRow).toBe(1);   // F的行索引
    expect(range.endCol).toBe(2);   // F的列索引
    
    // 调用updateSelectedCells方法
    updateSelectedCellsMethod.call(tableManager, range, cellDetails);
    
    // 验证结果 - B、C和F单元格应该被选中，D不应该被选中(因为D的左部分在选区外)
    expect((tableManager as any).highlightCell).toHaveBeenCalledTimes(3);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell2); // B
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell3); // C
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell5); // F
  });
  
  // 测试从H到D的选择场景
  test('getCellsRange and updateSelectedCells correctly handle H to D selection', () => {
    const getCellsRangeMethod = (TableManager.prototype as any).getCellsRange;
    const updateSelectedCellsMethod = (TableManager.prototype as any).updateSelectedCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1">A</td>
          <td id="cell2">B</td>
          <td id="cell3">C</td>
        </tr>
        <tr>
          <td id="cell4" colspan="2">D</td>
          <td id="cell5">F</td>
        </tr>
        <tr>
          <td id="cell6">G</td>
          <td id="cell7">H</td>
          <td id="cell8">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement; // D
    const cell6 = document.getElementById('cell6') as HTMLTableCellElement; // G
    const cell7 = document.getElementById('cell7') as HTMLTableCellElement; // H
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).highlightCell = jest.fn();
    (tableManager as any).clearHighlights = jest.fn();
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试从H到D的选择
    const range = getCellsRangeMethod.call(tableManager, cell7, cell4, cellDetails);
    
    // 验证范围计算是否正确
    expect(range).not.toBeNull();
    expect(range.startRow).toBe(1); // D的行索引
    expect(range.startCol).toBe(0); // D的列索引
    expect(range.endRow).toBe(2);   // H的行索引
    expect(range.endCol).toBe(1);   // H的列索引
    
    // 调用updateSelectedCells方法
    updateSelectedCellsMethod.call(tableManager, range, cellDetails);
    
    // 验证结果 - D、G和H单元格应该被选中
    expect((tableManager as any).highlightCell).toHaveBeenCalledTimes(3);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell4); // D
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell6); // G
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cell7); // H
  });

  // 测试修改后的矩形选择逻辑，特别是对合并单元格的处理
  test('矩形选择逻辑正确处理合并单元格的选择', () => {
    const getCellsRangeMethod = (TableManager.prototype as any).getCellsRange;
    const updateSelectedCellsMethod = (TableManager.prototype as any).updateSelectedCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;

// a b c d
// e e c h
// i j k l 
    // 创建一个更复杂的表格，包含多个合并单元格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA">A</td>
          <td id="cellB">B</td>
          <td id="cellC" rowspan="2">C</td>
          <td id="cellD">D</td>
        </tr>
        <tr>
          <td id="cellE" colspan="2">E</td>
          <td id="cellH">H</td>
        </tr>
        <tr>
          <td id="cellI">I</td>
          <td id="cellJ">J</td>
          <td id="cellK">K</td>
          <td id="cellL">L</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellA = document.getElementById('cellA') as HTMLTableCellElement;
    const cellB = document.getElementById('cellB') as HTMLTableCellElement;
    const cellC = document.getElementById('cellC') as HTMLTableCellElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    const cellE = document.getElementById('cellE') as HTMLTableCellElement;
    const cellK = document.getElementById('cellK') as HTMLTableCellElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).highlightCell = jest.fn();
    (tableManager as any).clearHighlights = jest.fn();
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试从A到K的选择（选择一个完整的矩形区域，应该包含多个合并单元格）
    const range = getCellsRangeMethod.call(tableManager, cellA, cellK, cellDetails);
    
    // 验证范围计算是否正确
    expect(range).not.toBeNull();
    expect(range.startRow).toBe(0);
    expect(range.startCol).toBe(0);
    expect(range.endRow).toBe(2);
    expect(range.endCol).toBe(2);
    
    // 调用updateSelectedCells方法
    updateSelectedCellsMethod.call(tableManager, range, cellDetails);
    
    // 验证结果 - A、B、C、E、I、J、K都应该被选中
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellA);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellB);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellC);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellE);
    expect((tableManager as any).highlightCell).not.toHaveBeenCalledWith(cellD); // D不在选区内
    
    // 测试合并单元格部分覆盖选区的情况（选择B到H）
    (tableManager as any).clearHighlights.mockClear();
    (tableManager as any).highlightCell.mockClear();
    
    const cellH = document.getElementById('cellH') as HTMLTableCellElement;
    const range2 = getCellsRangeMethod.call(tableManager, cellB, cellH, cellDetails);
    
    expect(range2).not.toBeNull();
    expect(range2.startRow).toBe(0);
    expect(range2.startCol).toBe(1);
    expect(range2.endRow).toBe(1);
    expect(range2.endCol).toBe(3);
    
    updateSelectedCellsMethod.call(tableManager, range2, cellDetails);
    
    // B、C、D、E、H都应该被选中
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellB);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellC);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellD);
    expect((tableManager as any).highlightCell).toHaveBeenCalledWith(cellH);
    expect((tableManager as any).highlightCell).not.toHaveBeenCalledWith(cellA); // A不在选区内
    expect((tableManager as any).highlightCell).not.toHaveBeenCalledWith(cellE);
  });
}); 