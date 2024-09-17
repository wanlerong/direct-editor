import {Editor} from "./editor";

test('construct empty editor', () => {
  let div = document.createElement("div")
  new Editor(div, null, null)
  expect((div.firstChild as HTMLElement).innerHTML).toBe('<div class="row"><br></div>');
});

test('normalize empty editor', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = ''
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div class="row"><br></div>');
});

test('normalize merge ul', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div><ul><li>111</li></ul></div>' +
    '<div><ul><li>222</li></ul></div>'
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div class="row"><ul><li>111</li><li>222</li></ul></div>');
});


test('normalize remove empty ul', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div><ul></ul></div>' +
    '<div>111</div>'
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div class="row">111</div>');
});

test('normalize remove stray text nodes', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div>111</div> stray text';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row">111</div>');
});

test('normalize handles multiple nested ul elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML =
    '<div><ul>' +
          '<li>111' +
            '<ul><li>nested 1</li></ul>' +
            '<ul><li>nested 2</li></ul>' +
          '</li>' +
          '<li>222</li>' +
    '</ul></div>' +
    '<div><ul><li>333</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row"><ul>' +
      '<li>111' +
        '<ul><li>nested 1</li><li>nested 2</li></ul>' +
      '</li>' +
      '<li>222</li>' +
      '<li>333</li>' +
    '</ul></div>');
});

test('normalize merge multiple ul lists with nested structure', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML =
    '<div><ul><li>111</li></ul></div>' +
    '<div><ul><li>222</li></ul></div>' +
    '<div><ul><li>333' +
                '<ul><li>nested 1</li></ul>' +
              '</li>' +
    '</ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row"><ul>' +
    '<li>111</li>' +
    '<li>222</li>' +
    '<li>333' +
      '<ul><li>nested 1</li></ul>' +
    '</li>' +
    '</ul></div>');
});

test('normalize remove empty span elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div><span></span><span>text</span><span></span></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row"><span>text</span></div>');
});

test('normalize handles multiple empty divs', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div></div><div></div><div>111</div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row"><br></div><div class="row"><br></div><div class="row">111</div>');
});

test('normalize moves extra ul outside div with other elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div>text<ul><li>111</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row">text</div><div class="row"><ul><li>111</li></ul></div>');
});

test('normalize adds br to empty li elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div><ul><li></li><li>text</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div class="row"><ul><li><br></li><li>text</li></ul></div>');
});
