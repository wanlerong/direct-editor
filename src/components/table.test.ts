import {getCellColumnIndex, addRow, addColumn, deleteRow, deleteColumn, TableManager} from "./table";
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

  beforeEach(() => {
    let container = document.createElement('div');
    editor = new Editor(container, () => {
    }, () => {
    });
    document.body.appendChild(container)
    editorDom = (container.firstChild as HTMLElement);

    editorDom.innerHTML = '<div data-btype="basic">1234</div>'
    firstChild = editorDom.firstChild
    firstTextNode = firstChild.firstChild
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
}); 