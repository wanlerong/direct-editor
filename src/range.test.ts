import {
  getIntersectionBlockType,
  getIntersectionStyle,
  getSelectionRange,
  iterateSubtree,
  splitRange,
  splitTextNode
} from "./range";
import {BlockType} from "./const/const";
import {RangeIterator} from "./rangeIterator";

test('splitTextNode', () => {
  let div = document.createElement("div")
  div.innerHTML = '123456'
  let range = new Range()
  range.setStart(div.firstChild, 1)
  range.setEnd(div.firstChild, 3)
  let data = splitTextNode((div.firstChild) as Text, range.startOffset, range.endOffset)
  expect(data.before).toBe("1");
  expect(data.mid).toBe("23");
  expect(data.after).toBe("456");
});

test('splitTextNode_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '123456'
  let data = splitTextNode((div.firstChild) as Text, 4)
  expect(data.before).toBe("1234");
  expect(data.mid).toBe("56");
  expect(data.after).toBe("");
});

test('splitRange_someNode', () => {
  let div = document.createElement("div")
  div.innerHTML = '123456'
  let range = new Range()
  range.setStart(div.firstChild, 1)
  range.setEnd(div.firstChild, 3)
  splitRange(range)
  expect(div.innerHTML).toBe("1<span>23</span>456");
});

test('splitRange_nodes', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>123456</div><div>abcdef</div>'
  let range = new Range()
  range.setStart(div.firstChild.firstChild, 2)
  range.setEnd(div.childNodes[1].firstChild, 3)
  splitRange(range)
  expect(div.innerHTML).toBe("<div>12<span>3456</span></div><div><span>abc</span>def</div>");
});

test('splitRange_node_in_span', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span>3456</span></div><div>abcdef</div>'
  let range = new Range()
  range.setStart(div.firstChild.childNodes[1].firstChild, 1)
  range.setEnd(div.firstChild.childNodes[1].firstChild, 3)
  splitRange(range)
  expect(div.innerHTML).toBe("<div>12<span>3</span><span>45</span><span>6</span></div><div>abcdef</div>");
});

test('splitRange_node_in_span_with_style', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span style="font-weight: bold;">3456</span></div><div>abcdef</div>'
  let range = new Range()
  range.setStart(div.firstChild.childNodes[1].firstChild, 1)
  range.setEnd(div.firstChild.childNodes[1].firstChild, 3)
  splitRange(range)
  expect(div.innerHTML).toBe('<div>12<span style="font-weight: bold;">3</span><span style="font-weight: bold;">45</span>' +
    '<span style="font-weight: bold;">6</span></div><div>abcdef</div>');
});

test('splitRange_node_in_span_not_same_node', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span>3456</span></div><div><span>abcde</span>f</div>'
  let range = new Range()
  range.setStart(div.firstChild.childNodes[1].firstChild, 1)
  range.setEnd(div.childNodes[1].firstChild.firstChild, 3)
  splitRange(range)
  expect(div.innerHTML).toBe("<div>12<span>3</span><span>456</span></div><div><span>abc</span><span>de</span>f</div>");
});

test('getIntersectionStyle', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span style="font-weight: bold;">3456</span></div>' +
    '<div><span style="font-weight: bold;">abcde</span>f</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.childNodes[1].firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let styles = getIntersectionStyle()
  expect(styles).toEqual({"fontWeight": "bold"});
});

test('getIntersectionStyle_no_common_style', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span style="font-weight: bold;">3456</span></div>' +
    '<div><span style="text-decoration: underline;">abcde</span>f</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.childNodes[1].firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let styles = getIntersectionStyle()
  expect(styles).toEqual({});
});

test('getIntersectionStyle_multi_common_style', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>12<span style="font-weight: bold;text-decoration: underline;">3456</span></div>' +
    '<div><span style="font-weight: bold;text-decoration: underline;">abcde</span>f</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.childNodes[1].firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let styles = getIntersectionStyle()
  expect(styles).toEqual({"fontWeight": "bold", "textDecoration": "underline"});
});

test('getIntersectionBlockType', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><h1>3456</h1></div>' +
    '<div><h1>3456</h1></div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.firstChild.firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let got = getIntersectionBlockType()
  expect(got).toEqual(BlockType.BLOCK_TYPE_H1);
});

test('getIntersectionBlockType_none', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div><h1>3456</h1></div>' +
    '<div><h2>3456</h2></div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.firstChild.firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let got = getIntersectionBlockType()
  expect(got).toEqual(BlockType.BLOCK_TYPE_NONE);
});

test('getIntersectionBlockType_none_2', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>3456</div>' +
    '<div><h2>3456</h2></div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.firstChild, 1, div.childNodes[1].firstChild.firstChild, 3)
  let got = getIntersectionBlockType()
  expect(got).toEqual(BlockType.BLOCK_TYPE_NONE);
});

test('iterateSubtree', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>3456</div>' +
    '<div>3456</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.firstChild, 1, div.childNodes[1].firstChild, 3)

  let got: Node[] = []
  iterateSubtree(new RangeIterator(getSelectionRange()), (node) => {
    got.push(node)
    return false
  })

  expect(got).toEqual([div.firstChild, div.firstChild.firstChild, div.childNodes[1], div.childNodes[1].firstChild]);
});


test('iterateSubtree_02', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>34<span>56</span></div>' +
    '<div>3456</div>' +
    '<div>1234</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.firstChild, 1, div.childNodes[2].firstChild, 3)

  let got: Node[] = []
  iterateSubtree(new RangeIterator(getSelectionRange()), (node) => {
    got.push(node)
    return false
  })

  expect(got).toEqual([div.firstChild, div.firstChild.firstChild, div.firstChild.childNodes[1], div.firstChild.childNodes[1].firstChild,
    div.childNodes[1], div.childNodes[1].firstChild,
    div.childNodes[2], div.childNodes[2].firstChild,
  ]);
});

test('iterateSubtree_03', () => {
  let div = document.createElement("div")
  div.innerHTML = '<div>34<span>56</span></div>' +
    '<div>3456</div>' +
    '<div>1234</div>'
  document.body.appendChild(div);
  setRangeForTest(div.firstChild.childNodes[1].firstChild, 1, div.childNodes[2].firstChild, 3)

  let got: Node[] = []
  iterateSubtree(new RangeIterator(getSelectionRange()), (node) => {
    got.push(node)
    return false
  })

  expect(got).toEqual([div.firstChild, div.firstChild.childNodes[1], div.firstChild.childNodes[1].firstChild,
    div.childNodes[1], div.childNodes[1].firstChild,
    div.childNodes[2], div.childNodes[2].firstChild,
  ]);
});


function setRangeForTest(start: Node, startOffset: number, end: Node, endOffset: number) {
  const range = document.createRange();
  range.setStart(start, startOffset)
  range.setEnd(end, endOffset)
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}
