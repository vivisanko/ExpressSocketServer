const session = require('express-session');
const express = require("express");
const http = require('http');
const WebSocket = require("ws");
const uuid = require('uuid');
const R = require('ramda');
const { THEMES, TYPES, ACTION_MESSAGES } = require('./constants');
const {createGeneralMessage, createAdditionalMessage} = require('./helpers/messages');
const app = express();


const map = new Map();
const nickNames = new Map();
let userIds = [];
let partyTheme = "";
let activeUserIdx = 0;
let isAcceptAnswer = false;

const sessionParser = session({
    saveUninitialized: false,
    secret: '$eCuRiTy',
    resave: false
});


const server = http.createServer(app);
const wsServer = new WebSocket.Server({ clientTracking: false, noServer: true });

 // msg={"step": 0, "message": "привет"}
 // connect = ws://localhost:8080/

server.on('upgrade', function(request, socket, head) {
  console.log('Parsing session from request...');

  sessionParser(request, {}, () => {
    if (partyTheme!=='') {
      socket.destroy();
      console.log('the game has already begun');
      console.log('partyTheme', partyTheme);

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

    map.set(userId, ws);
    userIds.push(userId);
    console.log('userIds', userIds);
    map.forEach((value, key, map)=> {
      value.send(createGeneralMessage({
        partyTheme,
        numberOfPlayers: userIds.length,
        actions: ""}));
    })


    ws.on('message', function(msg) {
        console.log(`Received message ${msg} from user ${userId}`);
        const messageObject=JSON.parse(msg);
        const {step, message} = messageObject;
        console.log('messageObject', messageObject);
        console.log('step', step);
        console.log('message', message);
        console.log('nickNames.size', nickNames.size);
        console.log('userIds', userIds);
        console.log('activeUserIdx', activeUserIdx);


        if (step === 1 && nickNames.size < userIds.length) {
          console.log('partyTheme', partyTheme);

          if(partyTheme===''){
          partyTheme = THEMES[Math.floor(Math.random() * THEMES.length)];

          map.forEach((value, key, map)=> {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: ""}));
          })
        } else {
             const userIndex = R.indexOf(userId, userIds);
             const nextIndex = userIndex + 1 < userIds.length ? userIndex + 1 : 0;
            nickNames.set(userIds[nextIndex], message);
            console.log('nickNames', nickNames);
            if (nickNames.size===userIds.length){

              map.forEach((value, key, map)=> {
                value.send(createGeneralMessage({
                  partyTheme,
                  numberOfPlayers: userIds.length,
                  actions: key===userIds[activeUserIdx] ? ACTION_MESSAGES.ASK : ACTION_MESSAGES.TYPING(nickNames.get(userIds[activeUserIdx])),
                  isActive: key===userIds[activeUserIdx],
                }));
              })
            }
          }
        }

        if (step===2 && nickNames.size === userIds.length){
          isAcceptAnswer=true;
          map.forEach((value, key, map)=> {
            if(key!==userId){
                value.send(createAdditionalMessage({
                  person: `${nickNames.get(userId)}`,
                  message,
              }))
                }
            }
           )
           map.forEach((value, key, map)=> {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: key===userIds[activeUserIdx] ? '...wait' : ACTION_MESSAGES.ANSWER,
              isActive: false,
            }));
          })
          if(message==="yes" || message ==="no" && isAcceptAnswer) {
            console.log('YoN message', message);
            const newActiveUser=()=>{
              if(message==='yes'){
                return activeUserIdx
              } else {
                return activeUserIdx+1< userIds.length ? activeUserIdx+1 : 0;
              }
            }
            activeUserIdx= newActiveUser();
            isAcceptAnswer = false;
           map.forEach((value, key, map)=> {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: key===userIds[activeUserIdx] ? ACTION_MESSAGES.ASK : ACTION_MESSAGES.TYPING(nickNames.get(userIds[activeUserIdx])),
              isActive: key===userIds[activeUserIdx],
            }));
          })
        }
          }
      });

    ws.on('close', function() {
      console.log('userId', userId);
      console.log('activeUserIdx on close', activeUserIdx);
      const applyNewActiveUserId = () => {
        console.log('applyNew');

        if(userIds[activeUserIdx]!==userId || userIds[activeUserIdx + 1] >= userIds.length) {
          const result = userIds[activeUserIdx];
          console.log('result newInd if left another user', result);

          return result

        } else {
          const result = userIds[activeUserIdx + 1];
          console.log('result newInd if left userId', result);

          return result
        }
      }
      const newActiveUserId = applyNewActiveUserId();
      console.log('newActiveUserId', newActiveUserId);

      userIds = R.reject(el=>el===userId,userIds);
      console.log('R.reject(userId)(userIds)', userId, userIds);

      map.delete(userId);

      isAcceptAnswer=false;
      map.forEach((value, key, map)=> {
          value.send(createGeneralMessage({
            partyTheme,
            numberOfPlayers: userIds.length,
            actions: key===newActiveUserId ? ACTION_MESSAGES.ASK : ACTION_MESSAGES.TYPING(nickNames.get(newActiveUserId)),
            isActive: key===newActiveUserId,
          }));
          value.send(createAdditionalMessage({
            person: `${nickNames.get(userId)} left us`,
            message:'',
        }))
      })
      activeUserIdx=R.indexOf(newActiveUserId, userIds);
      nickNames.delete(userId);
      if (partyTheme && R.isEmpty(userIds)){
        partyTheme = '';
        nickNames.clear();
      }
    });
  });



//start our server
server.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

