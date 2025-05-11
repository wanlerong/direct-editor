import { indentLi, isNestedLi, replaceListType } from './ul';
import {Editor} from "../editor";

// 辅助函数：创建一个简单的列表结构
function createSimpleList() {
  const ul = document.createElement('ul');
  
  const li1 = document.createElement('li');
  li1.textContent = '第一项';
  
  const li2 = document.createElement('li');
  li2.textContent = '第二项';
  
  const li3 = document.createElement('li');
  li3.textContent = '第三项';
  
  ul.appendChild(li1);
  ul.appendChild(li2);
  ul.appendChild(li3);
  
  return { ul, li1, li2, li3 };
}

// 辅助函数：创建一个嵌套的列表结构
function createNestedList() {
  const { ul, li1, li2, li3 } = createSimpleList();
  
  const nestedUl = document.createElement('ul');
  const nestedLi1 = document.createElement('li');
  nestedLi1.textContent = '嵌套项1';
  const nestedLi2 = document.createElement('li');
  nestedLi2.textContent = '嵌套项2';
  
  nestedUl.appendChild(nestedLi1);
  nestedUl.appendChild(nestedLi2);
  li2.appendChild(nestedUl);
  
  return { ul, li1, li2, li3, nestedUl, nestedLi1, nestedLi2 };
}

describe('indentLi 函数', () => {
  test('当 bool 为 true 时应该缩进列表项', () => {
    const { ul, li1, li2, li3 } = createSimpleList();
    indentLi(li3, true);
    const container = document.createElement('div');
    container.appendChild(ul.cloneNode(true));
    expect(container.innerHTML).toBe('<ul><li>第一项</li><li>第二项<ul><li>第三项</li></ul></li></ul>');
  });
  
  test('当 bool 为 false 时应该减少缩进列表项', () => {
    const { ul, li2, nestedLi1, nestedLi2 } = createNestedList();
    
    indentLi(nestedLi1, false);

    const container = document.createElement('div');
    container.appendChild(ul.cloneNode(true));
    expect(container.innerHTML).toBe('<ul>' +
      '<li>第一项</li>' +
      '<li>第二项</li>' +
      '<li>嵌套项1' +
        '<ul>' +
          '<li>嵌套项2</li>' +
        '</ul>' +
      '</li>' +
      '<li>第三项</li>' +
    '</ul>');
  });
  
  test('当是第一个列表项时，不应进行缩进', () => {
    const { ul, li1 } = createSimpleList();
    
    indentLi(li1, true);
    
    const container = document.createElement('div');
    container.appendChild(ul.cloneNode(true));
    expect(container.innerHTML).toBe('<ul><li>第一项</li><li>第二项</li><li>第三项</li></ul>');
  });
  
  test('缩进后再取消缩进应该恢复原始结构', () => {
    const { ul, li1, li2, li3 } = createSimpleList();
    
    // 先缩进 li3
    indentLi(li3, true);
    
    // 再取消缩进
    const li2Ul = li2.querySelector('ul');
    const nestedLi = li2Ul!.querySelector('li')!;
    indentLi(nestedLi, false);
    
    const container = document.createElement('div');
    container.appendChild(ul.cloneNode(true));
    expect(container.innerHTML).toBe('<ul><li>第一项</li><li>第二项</li><li>第三项</li></ul>');
  });
});

describe('isNestedLi 函数', () => {
  test('应正确识别嵌套的列表项', () => {
    const { nestedLi1 } = createNestedList();
    
    expect(isNestedLi(nestedLi1)).toBe(true);
  });
  
  test('应正确识别非嵌套的列表项', () => {
    const { li1 } = createSimpleList();
    
    expect(isNestedLi(li1)).toBe(false);
  });
  
  test('应正确处理深度嵌套的列表项', () => {
    // 创建三层嵌套的列表
    const { nestedLi1 } = createNestedList();
    const deeperUl = document.createElement('ul');
    const deeperLi = document.createElement('li');
    deeperLi.textContent = '更深层嵌套';
    
    deeperUl.appendChild(deeperLi);
    nestedLi1.appendChild(deeperUl);
    
    expect(isNestedLi(deeperLi)).toBe(true);
  });
});

describe('replaceListType 函数', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  });
  
  test('应将无序列表替换为有序列表', () => {
    const { ul, li1, li2, li3 } = createSimpleList();
    document.body.appendChild(ul);
    replaceListType(ul, 'ol');
    expect(document.body.innerHTML).toBe('<ol><li>第一项</li><li>第二项</li><li>第三项</li></ol>');
  });
  
  test('应递归替换嵌套列表', () => {
    const { ul, nestedUl } = createNestedList();
    document.body.appendChild(ul);
    replaceListType(ul, 'ol');
    expect(document.body.innerHTML).toBe(
      '<ol><li>第一项</li><li>第二项<ol><li>嵌套项1</li><li>嵌套项2</li></ol></li><li>第三项</li></ol>'
    );
  });
  
  test('应将有序列表替换为无序列表', () => {
    // 创建有序列表
    const ol = document.createElement('ol');
    const li1 = document.createElement('li');
    li1.textContent = '有序项1';
    const li2 = document.createElement('li');
    li2.textContent = '有序项2';
    
    ol.appendChild(li1);
    ol.appendChild(li2);
    document.body.appendChild(ol);
    replaceListType(ol, 'ul');
    expect(document.body.innerHTML).toBe('<ul><li>有序项1</li><li>有序项2</li></ul>');
  });
});