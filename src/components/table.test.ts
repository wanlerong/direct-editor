import {getCellColumnIndex, TableManager, CellPosition} from "./table";
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

  test('handleAddRowBelow adds a new row to table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1"><div data-btype="basic">A</div></td>
          <td id="cell2"><div data-btype="basic">B</div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const initialRowCount = tableElement.rows.length;

    // 设置当前选中的单元格
    (tableManager as any).currentCellElement = cell1;
    (tableManager as any).currentTable = tableElement;

    // 调用添加行方法
    (tableManager as any).handleAddRowBelow();

    expect(tableElement.rows.length).toBe(initialRowCount + 1);
    expect(tableElement.rows[1].cells.length).toBe(2);
  });

  test('handleAddColumnRight adds a new column to table', () => {
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1"><div data-btype="basic">A</div></td>
        </tr>
        <tr>
          <td id="cell2"><div data-btype="basic">B</div></td>
        </tr>
      </table>
    `;

    const tableElement = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const initialColCount = tableElement.rows[0].cells.length;

    // 设置当前选中的单元格
    (tableManager as any).currentCellElement = cell1;
    (tableManager as any).currentTable = tableElement;

    // 调用添加列方法
    (tableManager as any).handleAddColumnRight();

    expect(tableElement.rows[0].cells.length).toBe(initialColCount + 1);
    expect(tableElement.rows[1].cells.length).toBe(initialColCount + 1);
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
        <table><tbody>
        <tr><td><div data-btype="basic"><br></div></td><td><div data-btype="basic"><br></div></td></tr>
        <tr><td><div data-btype="basic"><br></div></td><td><div data-btype="basic"><br></div></td></tr>
        </tbody></table>
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
    (tableManager as any).updateSelectionOverlay = jest.fn();
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
    expect((tableManager as any).selectedCells.length).toBe(3);
    expect((tableManager as any).selectedCells).toContain(cell4);
    expect((tableManager as any).selectedCells).toContain(cell6);
    expect((tableManager as any).selectedCells).toContain(cell7);
    expect((tableManager as any).updateSelectionOverlay).toHaveBeenCalled();
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
    (tableManager as any).updateSelectionOverlay = jest.fn();
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
    expect((tableManager as any).selectedCells.length).toBe(3);
    expect((tableManager as any).selectedCells).toContain(cell1); // A
    expect((tableManager as any).selectedCells).toContain(cell2); // B
    expect((tableManager as any).selectedCells).toContain(cell4); // D
    expect((tableManager as any).updateSelectionOverlay).toHaveBeenCalled();
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
    (tableManager as any).updateSelectionOverlay = jest.fn();
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
    expect((tableManager as any).selectedCells.length).toBe(3);
    expect((tableManager as any).selectedCells).toContain(cell2); // B
    expect((tableManager as any).selectedCells).toContain(cell3); // C
    expect((tableManager as any).selectedCells).toContain(cell5); // F
    expect((tableManager as any).updateSelectionOverlay).toHaveBeenCalled();
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
    (tableManager as any).updateSelectionOverlay = jest.fn();
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
    expect((tableManager as any).selectedCells.length).toBe(3);
    expect((tableManager as any).selectedCells).toContain(cell4); // D
    expect((tableManager as any).selectedCells).toContain(cell6); // G
    expect((tableManager as any).selectedCells).toContain(cell7); // H
    expect((tableManager as any).updateSelectionOverlay).toHaveBeenCalled();
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
    const cellI = document.getElementById('cellI') as HTMLTableCellElement;
    const cellJ = document.getElementById('cellJ') as HTMLTableCellElement;
    const cellK = document.getElementById('cellK') as HTMLTableCellElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).updateSelectionOverlay = jest.fn();
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
    expect((tableManager as any).selectedCells.length).toBe(7);
    expect((tableManager as any).selectedCells).toContain(cellA);
    expect((tableManager as any).selectedCells).toContain(cellB);
    expect((tableManager as any).selectedCells).toContain(cellC);
    expect((tableManager as any).selectedCells).toContain(cellE);
    expect((tableManager as any).selectedCells).toContain(cellI);
    expect((tableManager as any).selectedCells).toContain(cellJ);
    expect((tableManager as any).selectedCells).toContain(cellK);
    expect((tableManager as any).updateSelectionOverlay).toHaveBeenCalled();
  });
  
  // 测试部分重叠单元格的检测功能
  test('hasPartiallyOverlappingCells correctly detects partially overlapping cells', () => {
    const hasPartiallyOverlappingCellsMethod = (TableManager.prototype as any).hasPartiallyOverlappingCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建一个有合并单元格的表格
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA">A</td>
          <td id="cellB">B</td>
          <td id="cellC">C</td>
        </tr>
        <tr>
          <td id="cellD" colspan="2">D</td>
          <td id="cellF">F</td>
        </tr>
        <tr>
          <td id="cellG">G</td>
          <td id="cellH">H</td>
          <td id="cellI">I</td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    
    // 设置必要的私有属性
    (tableManager as any).currentTable = table;
    
    // 计算单元格位置信息
    const cellDetails = calculateCellDetailsMethod.call(tableManager);
    
    // 测试用例1：B~F的选择，D有部分重叠
    const range1: CellPosition = {
      startRow: 0,
      startCol: 1, // B的列索引
      endRow: 1,
      endCol: 2  // F的列索引
    };
    
    // D有部分在选区外，应该返回true
    const result1 = hasPartiallyOverlappingCellsMethod.call(tableManager, range1, cellDetails);
    expect(result1).toBe(true);
    
    // 测试用例2：B~H的选择，D有部分重叠
    const range2: CellPosition = {
      startRow: 0,
      startCol: 1, // B的列索引
      endRow: 2,
      endCol: 1  // H的列索引
    };
    
    // D有部分在选区外，应该返回true
    const result2 = hasPartiallyOverlappingCellsMethod.call(tableManager, range2, cellDetails);
    expect(result2).toBe(true);
    
    // 测试用例3：完整选择A~I，应该没有部分重叠的单元格
    const range3: CellPosition = {
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 2
    };
    
    // 所有单元格都完全在选区内，应该返回false
    const result3 = hasPartiallyOverlappingCellsMethod.call(tableManager, range3, cellDetails);
    expect(result3).toBe(false);
    
    // 测试用例4：选择A~D，D完全包含在选区内
    const range4: CellPosition = {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1
    };
    
    // D完全在选区内，应该返回false
    const result4 = hasPartiallyOverlappingCellsMethod.call(tableManager, range4, cellDetails);
    expect(result4).toBe(false);
  });
  
  // 测试改进后的mergeCells方法
  test('mergeCells handles cells with existing colspan or rowspan', () => {
    const mergeCellsMethod = (TableManager.prototype as any).mergeCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    const getTableColumnCountMethod = (TableManager.prototype as any).getTableColumnCount;
    const findCellAtMethod = (TableManager.prototype as any).findCellAt;
    
    // 创建表格并设置测试环境
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1"><div data-btype="basic">A</div></td>
          <td id="cell2"><div data-btype="basic">B</div></td>
          <td id="cell3"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cell4" colspan="2"><div data-btype="basic">D</div></td>
          <td id="cell5"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cell6"><div data-btype="basic">G</div></td>
          <td id="cell7"><div data-btype="basic">H</div></td>
          <td id="cell8"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    
    // 设置必要的私有属性和方法
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1, cell2, cell4];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    (tableManager as any).hasPartiallyOverlappingCells = jest.fn().mockReturnValue(false);
    (tableManager as any).getTableColumnCount = getTableColumnCountMethod;
    
    // 模拟findCellAt方法，返回cell1
    (tableManager as any).findCellAt = jest.fn().mockReturnValue(cell1);
    
    // 设置当前选区范围
    (tableManager as any).currentSelectionRange = {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1
    };
    
    // 调用合并方法
    mergeCellsMethod.call(tableManager);
    
    // 验证表格结构
    expect(cell1.rowSpan).toBe(2); // 合并后应该跨2行
    expect(cell1.colSpan).toBe(2); // 合并后应该跨2列
    expect((tableManager as any).clearSelection).toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).toHaveBeenCalled();
    
    // 验证合并后的表格结构
    expect(table.rows.length).toBe(3); // 保留3行
    expect(table.rows[0].cells.length).toBe(2); // 第一行现在有2个单元格（合并单元格和C）
    expect(table.rows[1].cells.length).toBe(1); // 第二行只有F单元格
    expect(table.rows[2].cells.length).toBe(3); // 第三行不变
    
    // 验证内容合并
    expect(cell1.innerHTML).toContain('A');
    expect(cell1.innerHTML).toContain('B');
    expect(cell1.innerHTML).toContain('D');
    
    // 验证HTML结构
    const cellC = document.getElementById('cell3') as HTMLTableCellElement;
    const cellF = document.getElementById('cell5') as HTMLTableCellElement;
    
    expect(cellC).not.toBeNull(); // C单元格仍然存在
    expect(cellF).not.toBeNull(); // F单元格仍然存在
    expect(table.rows[2].cells[0].innerHTML).toContain('G'); // 第三行不受影响
  });
  
  test('mergeCells handles special case when spanning all columns', () => {
    const mergeCellsMethod = (TableManager.prototype as any).mergeCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    const getTableColumnCountMethod = (TableManager.prototype as any).getTableColumnCount;
    
    // 创建表格并设置测试环境
    document.body.innerHTML = '<table id="testTable">'+
        '<tr>'+
          '<td id="cell1"><div data-btype="basic">A</div></td>'+
          '<td id="cell2"><div data-btype="basic">B</div></td>'+
          '<td id="cell3"><div data-btype="basic">C</div></td>'+
        '</tr>'+
        '<tr>'+
          '<td id="cell4"><div data-btype="basic">D</div></td>'+
          '<td id="cell5"><div data-btype="basic">E</div></td>'+
          '<td id="cell6"><div data-btype="basic">F</div></td>'+
        '</tr>'+
         '<tr>'+
          '<td id="cell7"><div data-btype="basic">G</div></td>'+
          '<td id="cell8"><div data-btype="basic">H</div></td>'+
          '<td id="cell9"><div data-btype="basic">I</div></td>'+
        '</tr>'+
      '</table>'
    ;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement;
    const cell3 = document.getElementById('cell3') as HTMLTableCellElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    const cell5 = document.getElementById('cell5') as HTMLTableCellElement;
    const cell6 = document.getElementById('cell6') as HTMLTableCellElement;
    
    // 设置必要的私有属性和方法
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1, cell2, cell3, cell4, cell5, cell6];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    (tableManager as any).hasPartiallyOverlappingCells = jest.fn().mockReturnValue(false);
    
    // 模拟getTableColumnCount方法，返回3（即表格总列数）
    (tableManager as any).getTableColumnCount = jest.fn().mockReturnValue(3);
    
    // 模拟findCellAt方法，返回cell1
    (tableManager as any).findCellAt = jest.fn().mockReturnValue(cell1);
    
    // 设置当前选区范围
    (tableManager as any).currentSelectionRange = {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 2
    };
    
    // 调用合并方法
    mergeCellsMethod.call(tableManager);
    
    let ele = table.firstChild!.nodeName.toLowerCase() === 'tbody' ? table.firstChild : table
    expect((ele as HTMLElement).innerHTML.replace(/\s+/g, '')).toBe(
      `<tr>
          <td id="cell1" rowspan="1" colspan="3">
            <div data-btype="basic">A</div>
            <div data-btype="basic">B</div>
            <div data-btype="basic">C</div>
            <div data-btype="basic">D</div>
            <div data-btype="basic">E</div>
            <div data-btype="basic">F</div>
          </td>
        </tr>
         <tr>
          <td id="cell7"><div data-btype="basic">G</div></td>
          <td id="cell8"><div data-btype="basic">H</div></td>
          <td id="cell9"><div data-btype="basic">I</div></td>
        </tr>
    `.replace(/\s+/g, ''));
  });
  
  test('mergeCells 01', () => {
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
        <tr>
          <td id="cell5"><div data-btype="basic">E</div></td>
          <td id="cell6"><div data-btype="basic">F</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell3 = document.getElementById('cell3') as HTMLTableCellElement;
    const cell5 = document.getElementById('cell5') as HTMLTableCellElement;
    
    // 设置必要的私有属性和方法
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1, cell3, cell5];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    (tableManager as any).hasPartiallyOverlappingCells = jest.fn().mockReturnValue(false);
    (tableManager as any).getTableColumnCount = jest.fn().mockReturnValue(2);
    
    // 模拟findCellAt方法，返回cell1
    (tableManager as any).findCellAt = jest.fn().mockReturnValue(cell1);
    
    // 设置当前选区范围
    (tableManager as any).currentSelectionRange = {
      startRow: 0,
      startCol: 0,
      endRow: 2,
      endCol: 0
    };
    
    // 调用合并方法
    mergeCellsMethod.call(tableManager);
    
    expect(cell1.rowSpan).toBe(3);
    expect((tableManager as any).clearSelection).toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).toHaveBeenCalled();
    
    expect(table.rows.length).toBe(3);
    expect(table.rows[0].cells.length).toBe(2);
    expect(table.rows[1].cells.length).toBe(1);
    expect(table.rows[2].cells.length).toBe(1);
    
    expect(table.rows[0].cells[0].innerHTML).toContain('A');
    expect(table.rows[0].cells[0].innerHTML).toContain('C');
    expect(table.rows[0].cells[0].innerHTML).toContain('E');
    expect(table.rows[0].cells[1].innerHTML).toContain('B');
  });
  
  test('mergeCells combines content from all selected cells', () => {
    const mergeCellsMethod = (TableManager.prototype as any).mergeCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建表格并设置测试环境
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1"><div data-btype="basic">Content 1</div></td>
          <td id="cell2"><div data-btype="basic">Content 2</div></td>
        </tr>
        <tr>
          <td id="cell3"><div data-btype="basic">Content 3</div></td>
          <td id="cell4"><div data-btype="basic">Content 4</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    const cell2 = document.getElementById('cell2') as HTMLTableCellElement;
    const cell3 = document.getElementById('cell3') as HTMLTableCellElement;
    const cell4 = document.getElementById('cell4') as HTMLTableCellElement;
    
    // 设置必要的私有属性和方法
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1, cell2, cell3, cell4];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    (tableManager as any).hasPartiallyOverlappingCells = jest.fn().mockReturnValue(false);
    (tableManager as any).getTableColumnCount = jest.fn().mockReturnValue(2);
    
    // 模拟findCellAt方法，返回cell1
    (tableManager as any).findCellAt = jest.fn().mockReturnValue(cell1);
    
    // 设置当前选区范围
    (tableManager as any).currentSelectionRange = {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 1
    };
    
    mergeCellsMethod.call(tableManager);
    
    expect(table.rows.length).toBe(1);
    expect(table.rows[0].cells.length).toBe(1);
    
    // 验证单元格属性
    expect(cell1.rowSpan).toBe(1);
    expect(cell1.colSpan).toBe(1);
    
    expect(cell1.innerHTML).toContain('Content 1');
    expect(cell1.innerHTML).toContain('Content 2');
    expect(cell1.innerHTML).toContain('Content 3');
    expect(cell1.innerHTML).toContain('Content 4');
    
    // 验证合并内容的DOM结构 - 所有原始单元格的内容被保留
    const contentDivs = cell1.querySelectorAll('div[data-btype="basic"]');
    expect(contentDivs.length).toBe(4); // 应该包含4个内容块
  });
  
  test('mergeCells case1: 框选A-F合并后保留第三行G、H、I', () => {
    const mergeCellsMethod = (TableManager.prototype as any).mergeCells;
    const calculateCellDetailsMethod = (TableManager.prototype as any).calculateCellDetails;
    
    // 创建表格并设置测试环境 - case1场景
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
          <td id="cellB"><div data-btype="basic">B</div></td>
          <td id="cellC"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cellD"><div data-btype="basic">D</div></td>
          <td id="cellE"><div data-btype="basic">E</div></td>
          <td id="cellF"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cellG"><div data-btype="basic">G</div></td>
          <td id="cellH"><div data-btype="basic">H</div></td>
          <td id="cellI"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellA = document.getElementById('cellA') as HTMLTableCellElement;
    const cellB = document.getElementById('cellB') as HTMLTableCellElement;
    const cellC = document.getElementById('cellC') as HTMLTableCellElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    const cellE = document.getElementById('cellE') as HTMLTableCellElement;
    const cellF = document.getElementById('cellF') as HTMLTableCellElement;
    
    // 设置必要的私有属性和方法
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cellA, cellB, cellC, cellD, cellE, cellF];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    (tableManager as any).calculateCellDetails = calculateCellDetailsMethod;
    (tableManager as any).hasPartiallyOverlappingCells = jest.fn().mockReturnValue(false);
    (tableManager as any).getTableColumnCount = jest.fn().mockReturnValue(3);
    
    // 模拟findCellAt方法，返回cellA
    (tableManager as any).findCellAt = jest.fn().mockReturnValue(cellA);
    
    // 设置当前选区范围
    (tableManager as any).currentSelectionRange = {
      startRow: 0,
      startCol: 0,
      endRow: 1,
      endCol: 2
    };
    
    // 调用合并方法
    mergeCellsMethod.call(tableManager);
    
    // 验证合并后表格的结构
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells.length).toBe(1);
    expect(table.rows[1].cells.length).toBe(3);
    
    expect(cellA.rowSpan).toBe(1);
    expect(cellA.colSpan).toBe(3);
    
    // 验证合并内容
    expect(cellA.innerHTML).toContain('A');
    expect(cellA.innerHTML).toContain('B');
    expect(cellA.innerHTML).toContain('C');
    expect(cellA.innerHTML).toContain('D');
    expect(cellA.innerHTML).toContain('E');
    expect(cellA.innerHTML).toContain('F');
    
    // 验证第三行保留原样
    expect(table.rows[1].cells[0].innerHTML).toContain('G');
    expect(table.rows[1].cells[1].innerHTML).toContain('H');
    expect(table.rows[1].cells[2].innerHTML).toContain('I');
  });

  test('splitCell correctly splits a cell with rowspan and colspan', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // Create a table with merged cells
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1" rowspan="2" colspan="2"><div data-btype="basic">合并单元格</div></td>
          <td id="cell2"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cell3"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cell4"><div data-btype="basic">G</div></td>
          <td id="cell5"><div data-btype="basic">H</div></td>
          <td id="cell6"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    
    // Set required properties and methods
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call split method
    splitCellMethod.call(tableManager);
    
    // Verify table structure after split
    expect(cell1.rowSpan).toBe(1);
    expect(cell1.colSpan).toBe(1);
    
    // Verify cell count in first row
    expect(table.rows[0].cells.length).toBe(3);
    
    // Verify cell count in second row
    expect(table.rows[1].cells.length).toBe(3);
    
    // Verify content is preserved
    expect(cell1.innerHTML).toContain('合并单元格');
    
    // Verify new cells structure
    const firstRowSecondCell = table.rows[0].cells[1];
    const secondRowFirstCell = table.rows[1].cells[0];
    const secondRowSecondCell = table.rows[1].cells[1];
    
    expect(firstRowSecondCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
    expect(secondRowFirstCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
    expect(secondRowSecondCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
    
    // Verify required methods were called
    expect((tableManager as any).clearSelection).toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).toHaveBeenCalled();
  });

  test('splitCell handles cell with only rowspan', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // Create a table with a rowspan cell
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1" rowspan="3"><div data-btype="basic">跨行单元格</div></td>
          <td id="cell2"><div data-btype="basic">B</div></td>
        </tr>
        <tr>
          <td id="cell3"><div data-btype="basic">D</div></td>
        </tr>
        <tr>
          <td id="cell4"><div data-btype="basic">F</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    
    // Set required properties and methods
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call split method
    splitCellMethod.call(tableManager);
    
    // Verify table structure after split
    expect(cell1.rowSpan).toBe(1);
    expect(cell1.colSpan).toBe(1);
    
    // Verify first cell in each row exists
    expect(table.rows[0].cells[0]).toBe(cell1);
    expect(table.rows[1].cells[0]).not.toBeNull();
    expect(table.rows[2].cells[0]).not.toBeNull();
    
    // Verify cell count in each row
    expect(table.rows[0].cells.length).toBe(2);
    expect(table.rows[1].cells.length).toBe(2);
    expect(table.rows[2].cells.length).toBe(2);
    
    // Verify content is preserved
    expect(cell1.innerHTML).toContain('跨行单元格');
    
    // Verify all new cells contain basic blocks
    const secondRowFirstCell = table.rows[1].cells[0];
    const thirdRowFirstCell = table.rows[2].cells[0];
    
    expect(secondRowFirstCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
    expect(thirdRowFirstCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
  });

  test('splitCell handles cell with only colspan', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // Create a table with a colspan cell
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1" colspan="3"><div data-btype="basic">跨列单元格</div></td>
        </tr>
        <tr>
          <td id="cell2"><div data-btype="basic">D</div></td>
          <td id="cell3"><div data-btype="basic">E</div></td>
          <td id="cell4"><div data-btype="basic">F</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cell1 = document.getElementById('cell1') as HTMLTableCellElement;
    
    // Set required properties and methods
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call split method
    splitCellMethod.call(tableManager);
    
    // Verify table structure after split
    expect(cell1.rowSpan).toBe(1);
    expect(cell1.colSpan).toBe(1);
    
    // Verify cell count in first row
    expect(table.rows[0].cells.length).toBe(3);
    
    // Verify content is preserved
    expect(cell1.innerHTML).toContain('跨列单元格');
    
    // Verify all new cells contain basic blocks
    const firstRowSecondCell = table.rows[0].cells[1];
    const firstRowThirdCell = table.rows[0].cells[2];
    
    expect(firstRowSecondCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
    expect(firstRowThirdCell.querySelector('div[data-btype="basic"]')).not.toBeNull();
  });

  test('splitCell does nothing when no cell is selected', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // Create a table
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cell1" rowspan="2" colspan="2"><div data-btype="basic">合并单元格</div></td>
          <td id="cell2"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cell3"><div data-btype="basic">F</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    
    // Set required properties without selecting any cell
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // Initial state
    const initialStructure = table.innerHTML;
    
    // Call split method
    splitCellMethod.call(tableManager);
    
    // Verify table structure unchanged
    expect(table.innerHTML).toBe(initialStructure);
    
    // Verify selection and normalize methods not called
    expect((tableManager as any).clearSelection).not.toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).not.toHaveBeenCalled();
  });

  test('splitCell does nothing when selected cell has no rowspan or colspan', () => {
    const splitCellMethod = (TableManager.prototype as any).splitCell;
    
    // Create a table with no merged cells
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
    
    // Set required properties and methods
    (tableManager as any).currentTable = table;
    (tableManager as any).selectedCells = [cell1];
    (tableManager as any).clearSelection = jest.fn();
    (tableManager as any).editor.normalize = jest.fn();
    
    // Initial state
    const initialStructure = table.innerHTML;
    
    // Call split method
    splitCellMethod.call(tableManager);
    
    // Verify table structure unchanged
    expect(table.innerHTML).toBe(initialStructure);
    
    // Verify selection and normalize methods not called
    expect((tableManager as any).clearSelection).not.toHaveBeenCalled();
    expect((tableManager as any).editor.normalize).not.toHaveBeenCalled();
  });

  // Test deleteRow with merged cells - Case 1: Delete merged cell D completely
  test('deleteRow case1: select D and delete - removes both rows spanned by D', () => {
    const deleteRowMethod = (TableManager.prototype as any).deleteRow;
    
    // Create table: A B C / D D F / D D I where D has colspan=2, rowspan=2
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
          <td id="cellB"><div data-btype="basic">B</div></td>
          <td id="cellC"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cellD" colspan="2" rowspan="2"><div data-btype="basic">D</div></td>
          <td id="cellF"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cellI"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    
    // Setup TableManager state
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellD;
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call deleteRow
    deleteRowMethod.call(tableManager);
    
    // Verify result: only A B C row remains
    expect(table.rows.length).toBe(1);
    expect(table.rows[0].cells.length).toBe(3);
    expect(table.rows[0].cells[0].innerHTML).toContain('A');
    expect(table.rows[0].cells[1].innerHTML).toContain('B');
    expect(table.rows[0].cells[2].innerHTML).toContain('C');
  });

  // Test deleteRow with merged cells - Case 2: Delete row containing I
  test('deleteRow case2: select I and delete - reduces D rowspan and keeps A B C / D D F', () => {
    const deleteRowMethod = (TableManager.prototype as any).deleteRow;
    
    // Create table: A B C / D D F / D D I where D has colspan=2, rowspan=2
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
          <td id="cellB"><div data-btype="basic">B</div></td>
          <td id="cellC"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cellD" colspan="2" rowspan="2"><div data-btype="basic">D</div></td>
          <td id="cellF"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cellI"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellI = document.getElementById('cellI') as HTMLTableCellElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    
    // Setup TableManager state
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellI;
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call deleteRow
    deleteRowMethod.call(tableManager);
    
    // Verify result: A B C / D D F (D rowspan reduced to 1)
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells.length).toBe(3);
    expect(table.rows[1].cells.length).toBe(2);
    
    expect(cellD.rowSpan).toBe(1);
    expect(cellD.colSpan).toBe(2);
    
    expect(table.rows[0].cells[0].innerHTML).toContain('A');
    expect(table.rows[0].cells[1].innerHTML).toContain('B');
    expect(table.rows[0].cells[2].innerHTML).toContain('C');
    expect(table.rows[1].cells[0].innerHTML).toContain('D');
    expect(table.rows[1].cells[1].innerHTML).toContain('F');
  });

  // Test deleteRow with merged cells - Case 3: Delete row containing F
  test('deleteRow case3: select F and delete - reduces D rowspan and moves D to I row', () => {
    const deleteRowMethod = (TableManager.prototype as any).deleteRow;
    
    // Create table: A B C / D D F / D D I where D has colspan=2, rowspan=2
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
          <td id="cellB"><div data-btype="basic">B</div></td>
          <td id="cellC"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cellD" colspan="2" rowspan="2"><div data-btype="basic">D</div></td>
          <td id="cellF"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cellI"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellF = document.getElementById('cellF') as HTMLTableCellElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    
    // Setup TableManager state
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellF;
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call deleteRow
    deleteRowMethod.call(tableManager);
    
    // Verify result: A B C / D D I (D rowspan reduced to 1, moved to I's row)
    expect(table.rows.length).toBe(2);
    expect(table.rows[0].cells.length).toBe(3);
    expect(table.rows[1].cells.length).toBe(2);
    
    expect(cellD.rowSpan).toBe(1);
    expect(cellD.colSpan).toBe(2);
    
    expect(table.rows[0].cells[0].innerHTML).toContain('A');
    expect(table.rows[0].cells[1].innerHTML).toContain('B');
    expect(table.rows[0].cells[2].innerHTML).toContain('C');
    expect(table.rows[1].cells[0].innerHTML).toContain('D');
    expect(table.rows[1].cells[1].innerHTML).toContain('I');
  });

  // Test deleteColumn with merged cells
  test('deleteColumn handles merged cells correctly', () => {
    const deleteColumnMethod = (TableManager.prototype as any).deleteColumn;
    
    // Create table: A B C / D D F / G H I where D has colspan=2
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
          <td id="cellB"><div data-btype="basic">B</div></td>
          <td id="cellC"><div data-btype="basic">C</div></td>
        </tr>
        <tr>
          <td id="cellD" colspan="2"><div data-btype="basic">D</div></td>
          <td id="cellF"><div data-btype="basic">F</div></td>
        </tr>
        <tr>
          <td id="cellG"><div data-btype="basic">G</div></td>
          <td id="cellH"><div data-btype="basic">H</div></td>
          <td id="cellI"><div data-btype="basic">I</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellB = document.getElementById('cellB') as HTMLTableCellElement;
    const cellD = document.getElementById('cellD') as HTMLTableCellElement;
    
    // Setup TableManager state
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellB;
    (tableManager as any).editor.normalize = jest.fn();
    
    // Call deleteColumn
    deleteColumnMethod.call(tableManager);
    
    // Verify result: column B is deleted, D's colspan reduced
    expect(table.rows[0].cells.length).toBe(2); // A, C
    expect(table.rows[1].cells.length).toBe(2); // D, F
    expect(table.rows[2].cells.length).toBe(2); // G, I
    
    expect(cellD.colSpan).toBe(1);
    
    expect(table.rows[0].cells[0].innerHTML).toContain('A');
    expect(table.rows[0].cells[1].innerHTML).toContain('C');
    expect(table.rows[1].cells[0].innerHTML).toContain('D');
    expect(table.rows[1].cells[1].innerHTML).toContain('F');
    
  });

  // Test deleteRow/deleteColumn prevent deleting last row/column
  test('deleteRow prevents deleting the last row', () => {
    const deleteRowMethod = (TableManager.prototype as any).deleteRow;
    
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellA = document.getElementById('cellA') as HTMLTableCellElement;
    
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellA;
    (tableManager as any).editor.normalize = jest.fn();
    
    const initialRowCount = table.rows.length;
    deleteRowMethod.call(tableManager);
    
    expect(table.rows.length).toBe(initialRowCount);
    expect((tableManager as any).editor.normalize).not.toHaveBeenCalled();
  });

  test('deleteColumn prevents deleting the last column', () => {
    const deleteColumnMethod = (TableManager.prototype as any).deleteColumn;
    
    document.body.innerHTML = `
      <table id="testTable">
        <tr>
          <td id="cellA"><div data-btype="basic">A</div></td>
        </tr>
      </table>
    `;
    
    const table = document.getElementById('testTable') as HTMLTableElement;
    const cellA = document.getElementById('cellA') as HTMLTableCellElement;
    
    (tableManager as any).currentTable = table;
    (tableManager as any).currentCellElement = cellA;
    (tableManager as any).editor.normalize = jest.fn();
    
    const initialColCount = table.rows[0].cells.length;
    deleteColumnMethod.call(tableManager);
    
    expect(table.rows[0].cells.length).toBe(initialColCount);
    expect((tableManager as any).editor.normalize).not.toHaveBeenCalled();
  });
}); 