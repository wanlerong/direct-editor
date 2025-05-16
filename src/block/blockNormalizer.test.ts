import BlockNormalizer from "./blockNormalizer";
import {aSchema} from "../schema/schema";
import {Editor} from "../editor";

test('validate 01', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<span>2223</span>334"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});

test('validate 02', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<p>2223</p>334"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(false);
});

test('validate 03', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "<a>2223</a>"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(false);
});

test('validate 04', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "2223"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});


test('validate 05', () => {
  let blockNormalizer = new BlockNormalizer()
  let ele = document.createElement("a")
  ele.innerHTML = "123<span>2223</span><span>334</span>"
  let res = blockNormalizer.validateElement(ele, aSchema)
  expect(res).toBe(true);
});

test('normalize un-list to basic', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="list">' +
    '<br>' +
    '</div>';
  editor.normalize();
  
  expect(editorDom.innerHTML).toBe(
    '<div data-btype="basic">' +
    '<br>' +
    '</div>'
  );
});

test('normalize nested merge ul', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="table">' +
    '<table>' +
    '<tr>' +
    '<td><div data-btype="basic"><span>Text</span></div></td>' +
    '<td><div data-btype="list"><ul><li>111</li></ul></div>' +
        '<div data-btype="list"><ul><li>222</li></ul></div></td>' +
    '</tr>' +
    '</table>' +
    '</div>';
  editor.normalize();
  
  expect(editorDom.innerHTML).toBe(
    '<div data-btype="table">' +
    '<table>' +
    '<tr>' +
    '<td><div data-btype="basic"><span>Text</span></div></td>' +
    '<td><div data-btype="list"><ul><li>111</li><li>222</li></ul></div></td>' +
    '</tr>' +
    '</table>' +
    '</div>'
  );
});

test('normalize nested remove stray text nodes', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="table">' +
    '<table>' +
    '<tr>' +
    '<td><div data-btype="basic"><span>Text</span></div></td>' +
    '<td><div data-btype="basic">111</div> stray text</td>' +
    '</tr>' +
    '</table>' +
    '</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe(
    '<div data-btype="table">' +
    '<table>' +
    '<tr>' +
    '<td><div data-btype="basic"><span>Text</span></div></td>' +
    '<td><div data-btype="basic">111</div></td>' +
    '</tr>' +
    '</table>' +
    '</div>'
  );
});
