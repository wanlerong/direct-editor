import {Editor} from "./editor";

test('construct empty editor', () => {
  let div = document.createElement("div")
  new Editor(div, () => {}, () => {})
  expect((div.firstChild as HTMLElement).innerHTML).toBe('<div data-btype="basic"><br></div>');
});

test('normalize empty editor', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = ''
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div data-btype="basic"><br></div>');
});

test('normalize merge ul', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="list"><ul><li>111</li></ul></div>' +
    '<div data-btype="list"><ul><li>222</li></ul></div>'
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul><li>111</li><li>222</li></ul></div>');
});


test('normalize remove empty ul', () => {
  let div = document.createElement("div")
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="list"><ul></ul></div>' +
    '<div data-btype="basic">111</div>'
  editor.normalize()
  expect(editorDom.innerHTML).toBe('<div data-btype="basic">111</div>');
});

test('normalize remove stray text nodes', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic">111</div> stray text';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="basic">111</div>');
});

test('normalize handles multiple nested ul elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML =
    '<div data-btype="list"><ul>' +
          '<li>111' +
            '<ul><li>nested 1</li></ul>' +
            '<ul><li>nested 2</li></ul>' +
          '</li>' +
          '<li>222</li>' +
    '</ul></div>' +
    '<div data-btype="list"><ul><li>333</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul>' +
      '<li>111' +
        '<ul><li>nested 1</li><li>nested 2</li></ul>' +
      '</li>' +
      '<li>222</li>' +
      '<li>333</li>' +
    '</ul></div>');
});

test('normalize merge multiple ul lists with nested structure', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML =
    '<div data-btype="list"><ul><li>111</li></ul></div>' +
    '<div data-btype="list"><ul><li>222</li></ul></div>' +
    '<div data-btype="list"><ul><li>333' +
                '<ul><li>nested 1</li></ul>' +
              '</li>' +
    '</ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul>' +
    '<li>111</li>' +
    '<li>222</li>' +
    '<li>333' +
      '<ul><li>nested 1</li></ul>' +
    '</li>' +
    '</ul></div>');
});

test('normalize remove empty span elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic"><span></span><span>text</span><span></span></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="basic"><span>text</span></div>');
});

test('normalize handles multiple empty divs', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic"></div><div data-btype="basic"></div><div data-btype="basic">111</div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="basic"><br></div><div data-btype="basic"><br></div><div data-btype="basic">111</div>');
});

test('normalize moves extra ul outside div with other elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="list">text<ul><li>111</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="basic">text</div><div data-btype="list"><ul><li>111</li></ul></div>');
});

test('normalize adds br to empty li elements', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="list"><ul><li></li><li>text</li></ul></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="list"><ul><li><br></li><li>text</li></ul></div>');
});

test('normalize nested spans to plain', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic"><span>1<span>aaa<span>bbb</span></span>11</span></div>' +
    '<div data-btype="basic"><span>2<span>ccc<span>ddd</span></span>22</span></div>';
  editor.normalize();
  expect(editorDom.innerHTML).toBe('<div data-btype="basic"><span>1aaabbb11</span></div>' + 
  '<div data-btype="basic"><span>2cccddd22</span></div>');
});

test('normalize unwrap all unsupported tag', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic">1</div>' +
    '<div data-btype="basic"><font><font>丧的体验</font></font></div>' +
    '<div data-btype="basic"><font><font><span>使用g个</span></font></font></div>'
  editor.normalize();
  
  expect(editorDom.innerHTML).toBe('<div data-btype="basic">1</div>' +
    '<div data-btype="basic">丧的体验</div>' +
    '<div data-btype="basic"><span>使用g个</span></div>');
});

test('normalize unwrap all unsupported tag 2', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="basic">1</div>' +
    '<div data-btype="basic"><span><code>使用g个</code></span></div>'
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="basic">1</div>' +
    '<div data-btype="basic"><span>使用g个</span></div>');
});

test('normalize split htitle', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="line">' +
    '<h1>11</h1>' +
    '<h1>22</h1>' +
    '</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="line"><h1>11</h1></div>' +
    '<div data-btype="line"><h1>22</h1></div>');
});

test('normalize split htitle2', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="line">' +
    '<h1>11</h1>' +
    '<div>22</div>' +
    '</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="line"><h1>11</h1></div>' +
    '<div data-btype="basic">22</div>');
});

test('normalize split htitle3', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="line">' +
    '<h1>11</h1>' +
    '<br>' +
    '</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="line"><h1>11</h1></div>' +
    '<div data-btype="basic"><br></div>');
});

test('normalize split img block', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="img">text before<img src="test.jpg">text after</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="basic">text before</div>' +
    '<div data-btype="img"><img src="test.jpg"></div>' +
    '<div data-btype="basic">text after</div>');
});

test('normalize split multiple img blocks', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="img">text1<img src="pic1.jpg">text2</div>' +
    '<div data-btype="img">text3<img src="pic2.jpg">text4</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe('<div data-btype="basic">text1</div>' +
    '<div data-btype="img"><img src="pic1.jpg"></div>' +
    '<div data-btype="basic">text2</div>' +
    '<div data-btype="basic">text3</div>' +
    '<div data-btype="img"><img src="pic2.jpg"></div>' +
    '<div data-btype="basic">text4</div>');
});

test('normalize unimg img blocks', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="img"><img src="pic1.jpg"></div>' +
    '<div data-btype="img"><br></div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe(
    '<div data-btype="img"><img src="pic1.jpg"></div>' +
    '<div data-btype="basic"><br></div>'
  );
});

test('normalize merge adjacent todo blocks', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  editorDom.innerHTML = '<div data-btype="todo">' +
    '<div><input type="checkbox">111</div>' +
    '</div>' +
    '<div data-btype="todo">' +
    '<div><input type="checkbox">222</div>' +
    '<div><input type="checkbox">333</div>' +
    '</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe(
    '<div data-btype="todo">' +
    '<div><input type="checkbox">111</div>' +
    '<div><input type="checkbox">222</div>' +
    '<div><input type="checkbox">333</div>' +
    '</div>'
  );
});

test('normalize ensures zero-width space after todo checkbox', () => {
  let div = document.createElement("div");
  let editor = new Editor(div, () => {}, () => {});
  let editorDom = (div.firstChild as HTMLElement);
  
  editorDom.innerHTML = '<div data-btype="todo">'
      + '<div><input type="checkbox">111</div>'
      + '<div><input type="checkbox"></div>'
      +'<div><input type="checkbox">'+ '\u200B' + '已有零宽空格</div>'
    +'</div>';
  editor.normalize();

  expect(editorDom.innerHTML).toBe(
    '<div data-btype="todo">' +
    '<div><input type="checkbox">'+ '\u200B' + '111</div>' +
    '<div><input type="checkbox">'+ '\u200B' + '</div>' +
    '<div><input type="checkbox">'+ '\u200B' + '已有零宽空格</div>' +
    '</div>'
  );
});
