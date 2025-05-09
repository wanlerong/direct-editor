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

  const handleClick = () => {
    theEditor.toolbar.bold(true)
  };
  const handleClick2 = () => {
    theEditor.toolbar.toggleList("ul")
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