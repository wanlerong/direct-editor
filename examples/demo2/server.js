const http = require('http');
let path = require('path');
let express = require('express');
let ShareDB = require('sharedb');
let WebSocket = require('ws');
let WebSocketJSONStream = require('@teamwork/websocket-json-stream');

let backend = new ShareDB();
createDoc(startServer);

// Create initial document then fire callback
function createDoc(callback) {
  let connection = backend.connect();
  let doc = connection.get('examples', 'editor');
  doc.fetch(function (err) {
    if (err) throw err;
    if (doc.type === null) {
      let initJsonMl = ["DIV", {"class": "direct-editor", "contenteditable": "true"}, ["DIV", {"data-btype": "basic"}, "a"], ["DIV", {"data-btype": "basic"}, "a"], ["DIV", {"data-btype": "basic"}, "a"]]
      doc.create(initJsonMl, callback);
      return;
    }
    callback();
  });
}

function startServer() {
  // Create a web server to serve files and listen to WebSocket connections
  let app = express();
  app.use(express.static('build'));

  app.get('/', (req, res) => {
    res.sendFile(path.resolve("./build/index.html"))
  })

  let server = http.createServer(app);
  // Connect any incoming WebSocket connection to ShareDB
  let wss = new WebSocket.Server({server: server});
  wss.on('connection', function (ws) {
    let stream = new WebSocketJSONStream(ws);
    backend.listen(stream);
  });
  server.listen(8080);
  console.log('Listening on http://localhost:8080');
}
