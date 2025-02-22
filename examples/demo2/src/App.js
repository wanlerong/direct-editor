import './App.css';
import {useEffect, useRef} from "react";
import ReconnectingWebSocket from 'reconnecting-websocket';
import {Editor} from "direct-editor";

let sharedb = require('sharedb/lib/client');
// Open WebSocket connection to ShareDB server
let socket = new ReconnectingWebSocket('ws://' + window.location.host);
let connection = new sharedb.Connection(socket);

let doc = connection.get('examples', 'editor');

let theEditor

function App() {
  useEffect(() => {

    theEditor = new Editor(ref.current, mutationCallback, () => {})
    // Create local Doc instance mapped to 'examples' collection document with id 'counter'
    // Get initial value of document and subscribe to changes
    doc.subscribe(applyOp);
    // When document changes (by this client or any other, or the server),
    // update the number on the page
    doc.on('op', applyOp);

  }, [])

  const ref = useRef()

  const mutationCallback = (ops) => {
    doc.submitOp(ops);
  }
  console.log('r', ref)

  function applyOp(op, source) {
    if (!op) {
      return;
    }
    // 来源于自己
    if (source) {
      return;
    }
    // console.log(JSON.stringify(doc.data))
    console.log("received op ", JSON.stringify(op))
    theEditor.applyOps(op)
  }

  var div1
  var div2
  var div3
  var editordom
  setTimeout(() => {
    div1 = document.querySelector('.direct-editor').firstElementChild;
    div2 = document.querySelector('.direct-editor').childNodes[1];
    div3 = document.querySelector('.direct-editor').childNodes[2];
    editordom = document.querySelector('.direct-editor')
  }, 1000)

  
  setTimeout(() => {
    // 获取URL中的查询参数
    const urlParams = new URLSearchParams(window.location.search);

    const text = "This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div." +
      "This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div." +
      "This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div." +
      "This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.This is a test string being added to the div.";


    // 检查是否有参数 test=1
    if (urlParams.get('test') === '1') {
      let index = 0;

      setRange(div1.firstChild,1,div1.firstChild,1)

      // 每 10 毫秒插入一个字符
      const interval = setInterval(() => {
        // 当字符串插入完毕，清除计时器
        if (index >= text.length) {
          clearInterval(interval);
          return;
        }
        
        // 向 div 中插入字符
        div1.firstChild.data += text[index];
        index++;

        setRange(div1.firstChild,index+1,div1.firstChild,index+1)
      }, 5);
    }

    if (urlParams.get('test') === '2') {

      let index = 0;

      setRange(div2.firstChild,1,div2.firstChild,1)

      // 每 10 毫秒插入一个字符
      const interval = setInterval(() => {
        // 当字符串插入完毕，清除计时器
        if (index >= text.length) {
          clearInterval(interval);
          return;
        }

        // 向 div 中插入字符
        div2.firstChild.data += text[index];
        index++;

        setRange(div2.firstChild,index+1,div2.firstChild,index+1)
      }, 5);
    }

    if (urlParams.get('test') === '3') {

      let index = 0;

      setRange(div3.firstChild,1,div3.firstChild,1)

      // 每 10 毫秒插入一个字符
      const interval = setInterval(() => {
        // 当字符串插入完毕，清除计时器
        if (index >= text.length) {
          clearInterval(interval);
          return;
        }

        // 向 div 中插入字符
        div3.firstChild.data += text[index];
        index++;

        setRange(div3.firstChild,index+1,div3.firstChild,index+1)
      }, 5);
    }

    if (urlParams.get('test') === '4') {

      let index = 0;

      // 每 10 毫秒插入一个字符
      const interval = setInterval(() => {
        // 当字符串插入完毕，清除计时器
        if (index >= text.length) {
          clearInterval(interval);
          return;
        }

        var d1 = document.createElement("div")
        d1.appendChild(document.createTextNode("new-row"))
        editordom.appendChild(d1)
        index++;
        
        setRange(d1.firstChild,0,d1.firstChild,0)
        theEditor.toolbar.toggleList(index%2===1 ? "ul" : "ol")

      }, 5);
    }
    
  }, 15000)

  const handleClick = () => {
    theEditor.toolbar.bold(true)
    console.log('Button clicked!');
  };
  const handleClick2 = () => {
    theEditor.toolbar.toggleList("ul")
    console.log('Button clicked!');
  };

  return (
    <div className="App">
      <button onClick={handleClick}>加粗</button>
      <button onClick={handleClick2}>list</button>
      <div ref={ref}><div data-btype="basic">a</div><div data-btype="basic">a</div><div data-btype="basic">a</div></div>
    </div>
  );
}

export function setRange(start, startOffset, end, endOffset) {
  const range = document.createRange();
  range.setStart(start, startOffset)
  range.setEnd(end, endOffset)
  const selection = window.getSelection();
  selection.removeAllRanges();
  selection.addRange(range);
}


export default App;