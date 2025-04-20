import { Editor } from './editor';
import { getSelectionRange, setRange } from './range';

describe('insertLink', () => {
  let editor: Editor;
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    editor = new Editor(container, null, null);
    document.body.appendChild(container)
  });

  const setTestContent = (html: string) => {
    editor.theDom.innerHTML = html;
    editor.normalize();
  };

  const assertHTML = (expected: string) => {
    editor.normalize(); // Ensure normalized state
    expect(container.innerHTML.replace(/\s+/g, '')).toEqual(
      expected.replace(/\s+/g, '')
    );
  };

  describe('insert link cases', () => {
    test('折叠选区插入链接', () => {
      setTestContent('<div data-btype="basic">test</div>');
      setRange(editor.theDom.firstChild.firstChild, 2, editor.theDom.firstChild.firstChild, 2); // 选中 te|st 
      editor.cacheSelection();
      editor.toolbar.insertLink('example.com', 'click here');
      assertHTML(`
        <div class="direct-editor" contenteditable="true">
          <div data-btype="basic">te<a href="https://example.com">click here</a>st</div>
        </div>
      `);
    });

    test('选中文本替换为链接', () => {
      setTestContent('<div data-btype="basic">test selected here</div>');
      setRange(editor.theDom.firstChild.firstChild, 5, editor.theDom.firstChild.firstChild, 13); // 选中 "selected"
      editor.cacheSelection();
      editor.toolbar.insertLink('foo.com', 'replaced');
      assertHTML(`
        <div class="direct-editor" contenteditable="true">
          <div data-btype="basic">test <a href="https://foo.com">replaced</a> here</div>
        </div>
      `);
    });

    test('跨元素选区处理', () => {
      setTestContent('<div data-btype="basic">' +
        '<span>before</span>' +
        'cross<span>element</span>' +
        '<span>after</span>' +
        '</div>');
      
      // 选中 [cross<span>element</span>]
      setRange(editor.theDom.firstChild.childNodes[1], 0, editor.theDom.firstChild.childNodes[3].firstChild, 0);
      editor.cacheSelection();
      
      console.log(getSelectionRange().cloneContents().textContent)

      editor.toolbar.insertLink('nested.com', 'new-link');

      assertHTML(`
        <div class="direct-editor" contenteditable="true">
          <div data-btype="basic">
            <span>before</span>
            <a href="https://nested.com">new-link</a>
            <span>after</span>
          </div>
        </div>
      `);
    });

    test('在列表项中插入链接', () => {
      setTestContent('<div data-btype="list"><ul><li>item</li></ul></div>')
      setRange(editor.theDom.firstChild.firstChild.firstChild.firstChild, 4, editor.theDom.firstChild.firstChild.firstChild.firstChild, 4);
      editor.cacheSelection();
      editor.toolbar.insertLink('list-item.com', 'link');

      assertHTML(`
    <div class="direct-editor" contenteditable="true">
        <div data-btype="list">
          <ul>
            <li>item<a href="https://list-item.com">link</a></li>
          </ul>
        </div></div>
      `);
    });
  });

  test('insertImg in basic block', () => {
    const div = document.createElement("div")
    const editor = new Editor(div, () => {}, () => {})
    document.body.appendChild(div)
    const editorDom = editor.theDom
    expect(editorDom).not.toBeNull()
    if (!editorDom) return
    
    editorDom.innerHTML = '<div data-btype="basic">123</div><div data-btype="basic">456</div>'
    const firstChild = editorDom.firstChild
    expect(firstChild).not.toBeNull()
    if (!(firstChild instanceof HTMLElement)) return
    
    const textNode = firstChild.firstChild
    expect(textNode).not.toBeNull()
    if (!(textNode instanceof Text)) return
    
    setRange(textNode, 1, textNode, 1)
    editor.cacheSelection();
    editor.toolbar.insertImg('test.jpg')
    
    expect(editorDom.innerHTML).toBe('<div data-btype="basic">123</div><div data-btype="img"><img src="test.jpg"></div><div data-btype="basic">456</div>')
  })


  test('insertImg in basic block2', () => {
    const div = document.createElement("div")
    const editor = new Editor(div, () => {}, () => {})
    document.body.appendChild(div)
    const editorDom = editor.theDom
    expect(editorDom).not.toBeNull()
    if (!editorDom) return

    editorDom.innerHTML = '<div data-btype="basic">123</div><div data-btype="basic">456</div>'
    const firstChild = editorDom.firstChild
    expect(firstChild).not.toBeNull()
    if (!(firstChild instanceof HTMLElement)) return

    const textNode = firstChild.firstChild
    expect(textNode).not.toBeNull()
    if (!(textNode instanceof Text)) return

    setRange(textNode, 1, editorDom.childNodes[1].firstChild, 2)
    editor.cacheSelection();
    editor.toolbar.insertImg('test.jpg')

    expect(editorDom.innerHTML).toBe('<div data-btype="basic">123</div><div data-btype="basic">456</div><div data-btype="img"><img src="test.jpg"></div>')
  })
  
  test('insertImg in list block', () => {
    const div = document.createElement("div")
    const editor = new Editor(div, () => {}, () => {})
    document.body.appendChild(div)
    const editorDom = editor.theDom
    expect(editorDom).not.toBeNull()
    if (!editorDom) return
    
    editorDom.innerHTML = '<div data-btype="list"><ul><li>123</li></ul></div>'
    const firstChild = editorDom.firstChild
    expect(firstChild).not.toBeNull()
    if (!(firstChild instanceof HTMLElement)) return
    
    const ul = firstChild.firstChild
    expect(ul).not.toBeNull()
    if (!(ul instanceof HTMLElement)) return
    
    const li = ul.firstChild
    expect(li).not.toBeNull()
    if (!(li instanceof HTMLElement)) return
    
    const textNode = li.firstChild
    expect(textNode).not.toBeNull()
    if (!(textNode instanceof Text)) return
    
    setRange(textNode, 1, textNode, 1)
    editor.cacheSelection();
    editor.toolbar.insertImg('test.jpg')
    
    expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul><li>123</li></ul></div><div data-btype="img"><img src="test.jpg"></div>')
  })

  test('insertImg in empty editor', () => {
    const div = document.createElement("div")
    const editor = new Editor(div, () => {}, () => {})
    document.body.appendChild(div)
    const editorDom = editor.theDom
    expect(editorDom).not.toBeNull()
    if (!editorDom) return
    
    editorDom.innerHTML = '<div data-btype="basic"><br></div>'
    const firstChild = editorDom.firstChild
    expect(firstChild).not.toBeNull()
    if (!(firstChild instanceof HTMLElement)) return
    
    setRange(firstChild, 0, firstChild, 0)
    editor.cacheSelection();
    editor.toolbar.insertImg('test.jpg')
    
    expect(editorDom.innerHTML).toBe('<div data-btype="basic"><br></div><div data-btype="img"><img src="test.jpg"></div>')
  })
});