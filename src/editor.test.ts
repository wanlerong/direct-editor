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