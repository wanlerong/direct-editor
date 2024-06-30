import {Editor} from "./editor";

test('construct empty editor', () => {
  let div = document.createElement("div")
  new Editor(div, null, null)
  expect((div.firstChild as HTMLElement).innerHTML).toBe("<div><br></div>");
});

test('normalize empty editor', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, null, null);
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = ''
  editor.normalize()
  expect(editorDom.innerHTML).toBe("<div><br></div>");
});
