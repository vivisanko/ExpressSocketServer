const session = require('express-session');
const express = require("express");
const http = require('http');
const WebSocket = require("ws");
const uuid = require('uuid');

const app = express();


const map = new Map();

const sessionParser = session({
    saveUninitialized: false,
    secret: '$eCuRiTy',
    resave: false
});


const server = http.createServer(app);
const wsServer = new WebSocket.Server({ clientTracking: false, noServer: true });

server.on('upgrade', function(request, socket, head) {
  console.log('Parsing session from request...');

  sessionParser(request, {}, () => {
    // if (!request.session.userId) {
    //   socket.destroy();
    //   console.log('!request.session.userId', !request.session.userId);
      
    //   return;
    // }


    wsServer.handleUpgrade(request, socket, head, function(ws) {
        const id = uuid.v4();
        request.session.userId = id;
        wsServer.emit('connection', ws, request);
    });
  });
});


wsServer.on('connection', (ws, request) => {
    const userId = request.session.userId;

    map.set(userId, ws);

  console.log('map', map);
  
    ws.on('message', function(message) {
        console.log(`Received message ${message} from user ${userId}`);
        map.forEach((value, key, map)=> {
            console.log('key', key);
            console.log('map', map);
            
            if(key!==userId){
                 value.send(`Hello, you sent -> ${message}`);
                }
            }
        )
    });
  
    ws.on('close', function() {
      map.delete(userId);
    });
  });
  


//start our server
server.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

