import {handleBackspace, handleTab} from "./keydownHandler";
import {setRange} from "../range";
import {Editor} from "../editor";

test('handleTab', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111</li><li>222</li><li>333</li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  setRange(div.firstChild.firstChild.childNodes[1].firstChild, 1, div.firstChild.firstChild.childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe("<div><ul>" +
    "<li>111<ul><li>222</li></ul></li><li>333</li>" +
    "</ul></div>");
});

test('handleTab_02', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);

  editorDom.innerHTML = '<div data-btype="list"><ul>' +
    '<li>111</li><li>222</li><li>333</li><li>444</li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  setRange(editorDom.firstChild.firstChild.childNodes[1].firstChild, 1, editorDom.firstChild.firstChild.childNodes[2].firstChild, 1)

  handleTab(keyboardEvent)
  editor.normalize()

  expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul>' +
    '<li>111<ul><li>222</li><li>333</li></ul></li><li>444</li>' +
    '</ul></div>');
});

test('handleTab_03', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);

  editorDom.innerHTML = '<div data-btype="list"><ul>' +
      '<li>111' +
        '<ul>' +
          '<li>222' +
            '<ul><li>333</li><li>444</li></ul>' +
          '</li>' +
          '<li>555</li>' +
        '</ul>' +
      '</li>' +
      '<li>666</li>' +
    '</ul>' +
    '</div>';

  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: false,
  });

  let ul = editorDom.firstChild.firstChild
  setRange(ul.firstChild.childNodes[1].firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)
  editor.normalize()
  
  expect(editorDom.innerHTML).toBe('<div data-btype="list">' +
    '<ul>' +
      '<li>111' +
        '<ul>' +
          '<li>222' +
            '<ul>' +
                '<li>333' +
                  '<ul><li>444</li></ul>' +
                '</li>' +
                '<li>555</li>' +
            '</ul>' +
          '</li>' +
        '</ul>' +
      '</li>' +
      '<li>666</li>' +
    '</ul></div>'
  );
});

test('handleTab_shift', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111<ul><li>222</li><li>333</li><li>444</li></ul></li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
  });

  let ul = div.firstChild.firstChild
  setRange(ul.firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[1].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe('<div><ul>' +
    '<li>111<ul><li>222</li></ul></li>' +
    '<li>333<ul><li>444</li></ul></li>' +
    '</ul></div>'
  );
});

test('handleTab_shift_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><ul>' +
    '<li>111<ul><li>222</li><li>333</li><li>444</li></ul></li>' +
    '</ul></div>'
  document.body.appendChild(div);

  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Tab',
    shiftKey: true,
  });

  let ul = div.firstChild.firstChild
  setRange(ul.firstChild.childNodes[1].childNodes[1].firstChild, 1, ul.firstChild.childNodes[1].childNodes[2].firstChild, 1)

  handleTab(keyboardEvent)

  expect(div.innerHTML).toBe('<div><ul>' +
    '<li>111<ul><li>222</li></ul></li>' +
    '<li>333</li><li>444</li>' +
    '</ul></div>'
  );
});


test('handleBackspace_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>' +
    '<ul>' +
    '<li><br></li>' +
    '</ul>' +
    '</div>'
  document.body.appendChild(div);
  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
  });
  let ul = div.firstChild.firstChild
  setRange(ul.firstChild, 0,ul.firstChild, 0)
  handleBackspace(keyboardEvent)
  expect(div.innerHTML).toBe('<div><br>' +
    '</div>'
  );
})

test('handleBackspace_03', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  
  editorDom.innerHTML = '<div data-btype="list">' +
    '<ul>' +
      '<li>1</li>' +
      '<li><br>' +
        '<ul>' +
          '<li>3</li>' +
        '</ul>' +
      '</li>' +
      '<li>4</li>' +
    '</ul>' +
    '</div>'
  document.body.appendChild(div);
  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
  });
  let ul = editorDom.firstChild.firstChild
  setRange(ul.childNodes[1], 0,ul.childNodes[1], 0)
  handleBackspace(keyboardEvent)
  editor.normalize()
  
  expect(editorDom.innerHTML).toBe('<div data-btype="list">' +
    '<ul>' +
      '<li>1' +
        '<ul>' +
          '<li>3</li>' +
        '</ul>' +
      '</li>' +
      '<li>4</li>' +
    '</ul>' +
    '</div>');
})

test('handleBackspace_04', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);

  editorDom.innerHTML = '<div data-btype="list">' +
    '<ul>' +
      '<li><br>' +
        '<ul>' +
        '<li>3</li>' +
        '</ul>' +
      '</li>' +
      '<li>4</li>' +
    '</ul>' +
    '</div>'
  document.body.appendChild(div);
  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
  });
  let ul = editorDom.firstChild.firstChild
  setRange(ul.firstChild, 0,ul.firstChild, 0)
  handleBackspace(keyboardEvent)
  editor.normalize()

  expect(editorDom.innerHTML).toBe( '<div data-btype="basic"><br></div><div data-btype="list">' +
    '<ul>' +
    '<li>3</li>' +
    '<li>4</li>' +
    '</ul>' +
    '</div>');
})

test('handleBackspace_05', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);

  editorDom.innerHTML = '<div data-btype="list">' +
    '<ul>' +
      '<li>1</li>' +
      '<li>2345' +
        '<ul>' +
          '<li>3</li>' +
        '</ul>' +
      '</li>' +
      '<li>4</li>' +
    '</ul>' +
    '</div>'
  document.body.appendChild(div);
  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
  });
  let ul = editorDom.firstChild.firstChild
  setRange(ul.childNodes[1], 0,ul.childNodes[1], 0)
  handleBackspace(keyboardEvent)
  editor.normalize()

  expect(editorDom.innerHTML).toBe('<div data-btype="list">' +
    '<ul>' +
      '<li>12345' +
        '<ul>' +
        '<li>3</li>' +
        '</ul>' +
      '</li>' +
      '<li>4</li>' +
    '</ul>' +
    '</div>');
})

test('handleBackspace_06', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);

  editorDom.innerHTML = '<div data-btype="list">' +
      '<ul>' +
        '<li>1234' +
          '<ul>' +
            '<li>3</li>' +
          '</ul>' +
        '</li>' +
        '<li>4</li>' +
      '</ul>' +
    '</div>'
  document.body.appendChild(div);
  const keyboardEvent = new KeyboardEvent('keydown', {
    key: 'Backspace',
  });
  let ul = editorDom.firstChild.firstChild
  setRange(ul.firstChild, 0,ul.firstChild, 0)
  handleBackspace(keyboardEvent)
  editor.normalize()

  expect(editorDom.innerHTML).toBe('<div data-btype="basic">1234</div>'+
    '<div data-btype="list">' +
      '<ul>' +
      '<li>3</li>' +
      '<li>4</li>' +
      '</ul>' +
    '</div>');
})

describe('todo list enter handling', () => {
  test('todo list enter handling 01', () => {
    const container = document.createElement('div');
    const editor = new Editor(container, () => {
    }, () => {
    });
    document.body.appendChild(container);

    // 设置初始内容 - 一个todo列表项
    editor.theDom.innerHTML = '<div data-btype="todo"><div><input type="checkbox">aaa</div></div>';

    // 获取todo项和文本节点
    const todoBlock = editor.theDom.firstChild as HTMLElement;
    const todoItem = todoBlock.firstChild as HTMLElement;
    const textNode = todoItem.lastChild as Node; // "aaa" 文本节点

    // 设置光标在文本后面，比如"aaa|"
    setRange(textNode, 3, textNode, 3);

    const enterEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Enter'
    });

    editor.theDom.dispatchEvent(enterEvent);

    expect(editor.theDom.innerHTML).toBe(
      '<div data-btype="todo">' +
      '<div><input type="checkbox">aaa</div>' +
      '<div><input type="checkbox">' + '\u200B' + '</div>' +
      '</div>'
    );
  });
});

