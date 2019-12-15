const session = require('express-session');
const express = require("express");
const http = require('http');
const WebSocket = require("ws");
const uuid = require('uuid');
const R = require('ramda');
const { THEMES, TYPES, ACTION_MESSAGES } = require('./constants');
const {createGeneralMessage, createAdditionalMessage, createFinalMessage} = require('./helpers/messages');
const app = express();


const map = new Map();
const nickNames = new Map();
let winners = [];
let userIds = [];
let partyTheme = "";
let activeUserIdx = 0;
let isAcceptAnswer = false;
let isIncludeNickname = false;
let isNicknameUnraveled = false;

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
          nickNames.clear();
          activeUserIdx=0;

          map.forEach((value, key, map)=> {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: ""}));
          })
        } else {
             const userIndex = R.indexOf(userId, userIds);
             const nextIndex = userIndex + 1 < userIds.length ? userIndex + 1 : 0;
            nickNames.set(userIds[nextIndex], message.trim());
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

          console.log('1 message', message);
          if(!isAcceptAnswer){
          isIncludeNickname = message.toLowerCase().includes(nickNames.get(userIds[activeUserIdx]).toLowerCase());
          isNicknameUnraveled = message.toLowerCase().trim() === nickNames.get(userIds[activeUserIdx]).toLowerCase();
          isAcceptAnswer=true;
          }
          console.log('isIncludeNickname', isIncludeNickname);
          console.log('isNicknameUnraveled', isNicknameUnraveled);


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
          console.log('2');

          if((message==="yes" || message ==="no") && isAcceptAnswer) {
            console.log('3');

            console.log('YoN message', message);
            const createNewActiveUserIndex=(ind,arr)=>{
              return R.compose(
                activeUsers=>{
                  console.log('winners in compose', winners);


                  const indNowFromActive=R.indexOf(arr[ind], activeUsers);
                  console.log('indNowFromActive', indNowFromActive);
                  return R.indexOf(activeUsers[R.lt(R.inc(indNowFromActive),R.length(activeUsers))?R.inc(indNowFromActive):0], arr)
                },
                R.reject(el=>R.includes(el,winners)),
              )(arr,ind)
            }



              if (message==='no'){
                isIncludeNickname = false;
                isNicknameUnraveled = false;
                activeUserIdx = createNewActiveUserIndex(activeUserIdx, userIds);

              } else {
                if (isNicknameUnraveled){
                map.forEach((value, key, map)=>{
                value.send(createAdditionalMessage({
                    person: key===userIds[activeUserIdx]? ACTION_MESSAGES.WINNER_YOU(nickNames.get(userIds[activeUserIdx])): ACTION_MESSAGES.WINNER_HERE(nickNames.get(userIds[activeUserIdx])),
                    message:'',
                }))

              })
              const previousActiveInd = activeUserIdx;
              activeUserIdx = createNewActiveUserIndex(activeUserIdx, userIds);
              winners.push(userIds[previousActiveInd]);
              isIncludeNickname = false;
              isNicknameUnraveled = false;
              }
            }
            const messageForActiveUser = (bool) => bool ? ACTION_MESSAGES.BESIDE : ACTION_MESSAGES.ASK;

            isAcceptAnswer = false;
            console.log('4');
            if(winners.length===userIds.length){
              map.forEach((value, key, map)=> {
                value.send(createGeneralMessage({
                  partyTheme,
                  numberOfPlayers: userIds.length,
                  actions: ACTION_MESSAGES.GAME_OVER,
                  isActive: false,
                }));
                value.send(createFinalMessage(winners,nickNames, key));
              })
            } else {
           map.forEach((value, key, map)=> {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: key===userIds[activeUserIdx] ? messageForActiveUser(isIncludeNickname && !isNicknameUnraveled) : ACTION_MESSAGES.TYPING(nickNames.get(userIds[activeUserIdx])),
              isActive: key===userIds[activeUserIdx],
            }));
          })
        }
          console.log('5');

        }
          }
      });

    ws.on('close', function() {
      console.log('userId', userId);
      console.log('activeUserIdx on close', activeUserIdx);
      // const applyNewActiveUserId = () => {
      //   console.log('applyNew');

      //   if(userIds[activeUserIdx]!==userId || userIds[activeUserIdx + 1] >= userIds.length) {
      //     const result = userIds[activeUserIdx];
      //     console.log('result newInd if left another user', result);

      //     return result

      //   } else {
      //     const result = userIds[activeUserIdx + 1];
      //     console.log('result newInd if left userId', result);

      //     return result
      //   }
      // }

      userIds = R.reject(el=>el===userId,userIds);
      const newActiveUserIdx = activeUserIdx===0 ? userIds.length - 1 : activeUserIdx - 1;
      console.log('R.reject(userId)(userIds)', userId, userIds);
      console.log('newActiveUserIdx', userIds[newActiveUserIdx]);

      map.delete(userId);

      map.forEach((value, key, map)=> {
        if(map.size===1){
          value.send(createGeneralMessage({
            partyTheme,
            numberOfPlayers: userIds.length,
            actions: ACTION_MESSAGES.LAST,
            isActive: false,
          }));
        } else {
            value.send(createGeneralMessage({
              partyTheme,
              numberOfPlayers: userIds.length,
              actions: key===userIds[newActiveUserIdx] ? ACTION_MESSAGES.ASK : ACTION_MESSAGES.TYPING(nickNames.get(userIds[newActiveUserIdx])),
              isActive: key===userIds[newActiveUserIdx],
            }));
            value.send(createAdditionalMessage({
              person: `${nickNames.get(userId)} left us`,
              message:'',
          }))
       }
      })

      activeUserIdx=newActiveUserIdx;
      nickNames.delete(userId);
      if (partyTheme && R.isEmpty(userIds)){
        partyTheme = '';
        nickNames.clear();
        activeUserIdx=0;
        isIncludeNickname = false;
        isNicknameUnraveled = false;
        winners = [];
      }
    });
  });



//start our server
server.listen(process.env.PORT || 8080, () => {
    console.log(`Server started on port ${server.address().port} :)`);
});

