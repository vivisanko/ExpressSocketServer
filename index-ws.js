const session = require('express-session');
const express = require("express");
const http = require('http');
const WebSocket = require("ws");
const uuid = require('uuid');
const app = express();
const {Game}=require('./game');

const sessionParser = session({
    saveUninitialized: false,
    secret: '$eCuRiTy',
    resave: false
});


const server = http.createServer(app);
const wsServer = new WebSocket.Server({ clientTracking: false, noServer: true });

 // msg={"step": 0, "message": "привет"}
 // connect = ws://localhost:8080/

 const game = new Game();
 game.sayPartyTheme();


server.on('upgrade', function(request, socket, head) {
  console.log('Parsing session from request...');

  sessionParser(request, {}, () => {
    if (game.partyTheme!=='') {
      socket.destroy();
      console.log('the game has already begun');

      return;
    }


    wsServer.handleUpgrade(request, socket, head, function(ws) {
        const id = uuid.v4();
        request.session.userId = id;
        wsServer.emit('connection', ws, request);
    });
  });
});


wsServer.on('connection', (ws, request) => {
    const userId = request.session.userId;
    game.handleConnection(userId, ws);

    ws.on('message', function(msg) {
        game.handleMessageFromClient(msg, userId);
      });

    ws.on('close', function() {
        game.processUserExit(userId);
    });
  });



//start our server
server.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

