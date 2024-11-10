#!/bin/bash
source /Users/wlr/.bash_profile
nvm use v18.16.0
export PATH="$PATH:/Users/wlr/.nvm/versions/node/v18.16.0/bin"
node --version
cd /Users/wlr/workspace/direct-editor/examples/demo2 && ./node_modules/react-scripts/bin/react-scripts.js build && node server.js
