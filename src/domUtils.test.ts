import {
  getLastTextNode,
  isCharacterDataNode,
  isTextNode,
  isElementNode,
  getClosestAncestorIn,
  getClosestAncestor,
  getNodeLength,
  insertAfter,
  insertBefore,
  getTextPosition,
  applyInlineStylesFormNode,
  getInlineStyles,
  createSpanWithText
} from "./domUtils";

test('getLastTextNode', () => {
  let div = document.createElement("div")
  let txt1 = document.createTextNode("111")
  div.appendChild(txt1)
  let txt2 = document.createTextNode("222")
  let span = document.createElement("span")
  span.appendChild(txt2)
  div.appendChild(span)
  
  let got = getLastTextNode(div)
  expect(got).toBe(txt2);
});

test('isCharacterDataNode 应该正确识别文本节点', () => {
  const textNode = document.createTextNode('text');
  expect(isCharacterDataNode(textNode)).toBe(true);
  
  const element = document.createElement('div');
  expect(isCharacterDataNode(element)).toBe(false);
});

test('isTextNode 应该正确识别文本节点', () => {
  const textNode = document.createTextNode('text');
  expect(isTextNode(textNode)).toBe(true);
  
  const commentNode = document.createComment('comment');
  expect(isTextNode(commentNode)).toBe(false);
  
  const element = document.createElement('div');
  expect(isTextNode(element)).toBe(false);
});

test('isElementNode 应该正确识别元素节点', () => {
  const element = document.createElement('div');
  expect(isElementNode(element)).toBe(true);
  
  const textNode = document.createTextNode('text');
  expect(isElementNode(textNode)).toBe(false);
});

test('getClosestAncestorIn 应该找到最近的祖先节点', () => {
  const parent = document.createElement('div');
  const child1 = document.createElement('span');
  const child2 = document.createElement('p');
  const textNode = document.createTextNode('text');
  
  parent.appendChild(child1);
  child1.appendChild(child2);
  child2.appendChild(textNode);
  
  expect(getClosestAncestorIn(textNode, parent)).toBe(child1);
  expect(getClosestAncestorIn(child2, parent)).toBe(child1);
  expect(getClosestAncestorIn(child1, parent)).toBe(child1);
  
  // 如果不是祖先，应该返回null
  const unrelatedNode = document.createElement('div');
  expect(getClosestAncestorIn(textNode, unrelatedNode)).toBe(null);
});

test('getClosestAncestor 应该找到匹配节点名的最近祖先', () => {
  const div = document.createElement('div');
  const span = document.createElement('span');
  const p = document.createElement('p');
  const textNode = document.createTextNode('text');
  
  div.appendChild(span);
  span.appendChild(p);
  p.appendChild(textNode);
  
  // 测试单个节点名
  expect(getClosestAncestor(textNode, 'P')).toBe(p);
  expect(getClosestAncestor(textNode, 'SPAN')).toBe(span);
  expect(getClosestAncestor(textNode, 'DIV')).toBe(div);
  
  // 测试节点名数组
  expect(getClosestAncestor(textNode, ['P', 'DIV'])).toBe(p);
  expect(getClosestAncestor(textNode, ['SPAN', 'DIV'])).toBe(span);
  
  // 测试不存在的节点名
  expect(getClosestAncestor(textNode, 'H1')).toBe(null);
  expect(getClosestAncestor(textNode, ['H1', 'H2'])).toBe(null);
});

test('getNodeLength 应该返回节点的长度', () => {
  // 测试文本节点
  const textNode = document.createTextNode('12345');
  expect(getNodeLength(textNode)).toBe(5);
  
  // 测试元素节点
  const div = document.createElement('div');
  const span1 = document.createElement('span');
  const span2 = document.createElement('span');
  div.appendChild(span1);
  div.appendChild(span2);
  expect(getNodeLength(div)).toBe(2);
  
  // 测试没有子节点的元素
  const emptyDiv = document.createElement('div');
  expect(getNodeLength(emptyDiv)).toBe(0);
});

test('insertAfter 应该在指定节点后插入新节点', () => {
  const parent = document.createElement('div');
  const ref = document.createElement('span');
  const node = document.createElement('p');
  
  parent.appendChild(ref);
  insertAfter(ref, node);
  
  expect(parent.childNodes.length).toBe(2);
  expect(parent.childNodes[1]).toBe(node);
});

test('insertBefore 应该在指定节点前插入新节点', () => {
  const parent = document.createElement('div');
  const ref = document.createElement('span');
  const node = document.createElement('p');
  
  parent.appendChild(ref);
  insertBefore(ref, node);
  
  expect(parent.childNodes.length).toBe(2);
  expect(parent.childNodes[0]).toBe(node);
});

test('getTextPosition 应该返回正确的文本位置', () => {
  const div = document.createElement('div');
  const textNode1 = document.createTextNode('123');
  const textNode2 = document.createTextNode('456');
  
  div.appendChild(textNode1);
  div.appendChild(textNode2);
  
  const range = document.createRange();
  
  // 测试位置在第一个文本节点
  range.setStart(textNode1, 2);
  expect(getTextPosition(div, range)).toBe(2);
  
  // 测试位置在第二个文本节点
  range.setStart(textNode2, 1);
  expect(getTextPosition(div, range)).toBe(4); // 3(第一个节点长度) + 1
  
  // 测试位置在div开始
  range.setStart(div, 0);
  expect(getTextPosition(div, range)).toBe(0);
  
  // 测试找不到的情况
  const unrelatedDiv = document.createElement('div');
  range.setStart(unrelatedDiv, 0);
  expect(getTextPosition(div, range)).toBe(-1);
});

test('applyInlineStylesFormNode 应该正确复制样式', () => {
  const source = document.createElement('span');
  source.style.fontWeight = 'bold';
  source.style.fontStyle = 'italic';
  
  const target = document.createElement('span');
  applyInlineStylesFormNode(source, target);
  
  expect(target.style.fontWeight).toBe('bold');
  expect(target.style.fontStyle).toBe('italic');
});

test('getInlineStyles 应该返回正确的内联样式', () => {
  const span = document.createElement('span');
  span.style.fontWeight = 'bold';
  span.style.textDecoration = 'underline';
  
  const styles = getInlineStyles(span);
  
  expect(styles).toEqual({
    fontWeight: 'bold',
    textDecoration: 'underline'
  });
  
  // 测试只获取特定样式
  const spanWithMoreStyles = document.createElement('span');
  spanWithMoreStyles.style.fontWeight = 'bold';
  spanWithMoreStyles.style.color = 'red'; // 不应该被提取
  
  const filteredStyles = getInlineStyles(spanWithMoreStyles);
  expect(filteredStyles).toEqual({
    fontWeight: 'bold'
  });
  expect(filteredStyles.color).toBeUndefined();
});

test('createSpanWithText 应该创建带有文本的span元素', () => {
  const span = createSpanWithText('hello');
  
  expect(span.tagName).toBe('SPAN');
  expect(span.childNodes.length).toBe(1);
  expect(span.firstChild?.nodeType).toBe(Node.TEXT_NODE);
  expect(span.textContent).toBe('hello');
});
