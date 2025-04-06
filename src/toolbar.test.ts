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

});