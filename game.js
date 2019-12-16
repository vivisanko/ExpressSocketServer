const R = require('ramda');
const {createGeneralMessage, createAdditionalMessage, createFinalMessage} = require('./helpers/messages');
const { THEMES, ACTION_MESSAGES, CLIENT_MESSAGES } = require('./constants');


class Game {

  constructor() {
    this.map = new Map();
    this.nickNames = new Map();
    this.winners = [];
    this.userIds = [];
    this.partyTheme = "";
    this.activeUserIdx = 0;
    this.isAcceptAnswer = false;
    this.isIncludeNickname = false;
    this.isNicknameUnraveled = false;
  }

  sayPartyTheme() {
    this.partyTheme='test'
    console.log('partyTheme', this.partyTheme);
  }

  handleConnection(userId, ws) {
    const {map, userIds} = this;
    map.set(userId, ws);
    userIds.push(userId);
    console.log('userIds', userIds);
    this.sendCommonGeneralMessage('');
  }

  handleMessageFromClient(msg, userId) {
    const messageObject=JSON.parse(msg);
    const {nickNames, userIds, activeUserIdx} = this;
    const {step, message} = messageObject;
    console.log('messageObject', messageObject);
    console.log('step', step);
    console.log('message', message);
    console.log('nickNames.size', nickNames.size);
    console.log('userIds', userIds);
    console.log('activeUserIdx', activeUserIdx);
    if(step===1){
      takeFirstStepActions(message, userId)
    }

    if(step===2 && tnickNames.size === userIds.length){
      takeSecondStepActions(message, userId)
    }
  }

  clearData() {
    this.partyTheme = '';
    this.nickNames.clear();
    this.activeUserIdx=0;
    this.isAcceptAnswer = false;
    this.isIncludeNickname = false;
    this.isNicknameUnraveled = false;
    this.winners = [];
  }

  createGameTheme() {
    this.partyTheme = THEMES[Math.floor(Math.random() * THEMES.length)];
  }


  takeFirstStepActions(msg, userId){
    const {nickNames, userIds, partyTheme,} = this;
    if (nickNames.size < userIds.length) {
      console.log('partyTheme', partyTheme);

      if(partyTheme===''){
        this.clearData();
        this.createGameTheme();
        this.sendCommonGeneralMessage('');
    } else {
        this.createNicknames(msg, userId);
        if (nickNames.size===userIds.length){
          this.sendIndividualGeneralMessage(true);
        }
      }
    }
  }

  takeSecondStepActions(msg, userId){
    const {isAcceptAnswer, nickNames, userIds, activeUserIdx, isIncludeNickname, isNicknameUnraveled } = this;
    if(!isAcceptAnswer){
      isIncludeNickname = msg.toLowerCase().includes(nickNames.get(userIds[activeUserIdx]).toLowerCase());
      isNicknameUnraveled = message.toLowerCase().trim() === nickNames.get(userIds[activeUserIdx]).toLowerCase();
      isAcceptAnswer=true;
      }
      console.log('isIncludeNickname', isIncludeNickname);
      console.log('isNicknameUnraveled', isNicknameUnraveled);
      this.sendAdditionalMessageToAllOthers(msg,userId);
      this.sendIndividualGeneralMessage(false);
      if(msg===CLIENT_MESSAGES.RIGHT || msg===CLIENT_MESSAGES.WRONG && isAcceptAnswer){
        this.processBoolClientMessages(msg);
        isAcceptAnswer=false;
        this.checkIsGameOver();
      }
  }

  processUserExit(userId){
    const {userIds, activeUserIdx, map, nickNames, partyTheme} = this;
    userIds = R.reject(el=>el===userId,userIds);
      const newActiveUserIdx = activeUserIdx===0 ? userIds.length - 1 : activeUserIdx - 1;
      console.log('R.reject(userId)(userIds)', userId, userIds);
      console.log('newActiveUserIdx', userIds[newActiveUserIdx]);

      map.delete(userId);
      if(map.size===1){
        this.sendCommonGeneralMessage(ACTION_MESSAGES.LAST);
      } else {
        this.sendIndividualGeneralMessage(true);
        this.sendAdditionalMessageAboutExit(userId);
      }

      activeUserIdx=newActiveUserIdx;
      nickNames.delete(userId);
      if (partyTheme && R.isEmpty(userIds)){
       this.clearData();
      }
  }

  checkIsGameOver(){
    const {winners, userIds} = this;
    if(winners.length===userIds.length){
      this.sendCommonGeneralMessage(ACTION_MESSAGES.GAME_OVER);
      this.sendFinalMessage();
    } else {
      this.sendIndividualGeneralMessage(true);
    }
  }

  processBoolClientMessages(msg) {
    const {isIncludeNickname, isNicknameUnraveled, activeUserIdx, userIds, winners} = this;
    if(msg===CLIENT_MESSAGES.WRONG){
      isIncludeNickname = false;
      isNicknameUnraveled = false;
      activeUserIdx = this.createNewActiveUserIndex(activeUserIdx, userIds, winners);
    } else if(isNicknameUnraveled){
      this.handleNextWinner();
    }
  }

  handleNextWinner(){
    const {activeUserIdx, userIds, winners, isIncludeNickname, isNicknameUnraveled}=this;
    this.sendAdditionalMessageAboutWinner();
    const previousActiveInd = activeUserIdx;
    activeUserIdx = createNewActiveUserIndex(activeUserIdx, userIds, winners);
    winners.push(userIds[previousActiveInd]);
    isIncludeNickname = false;
    isNicknameUnraveled = false;
  }

  createNewActiveUserIndex(arr, ind, winners){
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

  createNicknames (msg, userId) {
    const {userIds, nickNames} = this;
    const userIndex = R.indexOf(userId, userIds);
    const nextIndex = R.inc(userIndex) < R.length(userIds) ? R.inc(userIndex) : 0;
    nickNames.set(userIds[nextIndex], msg.trim());
    console.log('nickNames', nickNames);
  }

  sendAdditionalMessageToAllOthers(message, userId) {
    const {map, nickNames} = this;
    const messageToOtherClients = createAdditionalMessage({
      person: `${nickNames.get(userId)}`,
      message,
  });
    map.forEach((value, key, map)=> {
      if(key!==userId){
          value.send(messageToOtherClients)
          }
      }
     )
  }

  sendAdditionalMessageAboutWinner() {
    const {userIds, nickNames, activeUserIdx} = this;
    const messageToOtherClients = createAdditionalMessage({
      person: ACTION_MESSAGES.WINNER_HERE(nickNames.get(userIds[activeUserIdx])),
      message: '',
    });
    const messageToNextWinner = createAdditionalMessage({
      person: ACTION_MESSAGES.WINNER_YOU(nickNames.get(userIds[activeUserIdx])),
      message: '',
    });
    map.forEach((value, key, map)=> {
      value.send(key===userIds[activeUserIdx]? messageToNextWinner : messageToOtherClients);
    })
  }

  sendAdditionalMessageAboutExit(userId) {
    const { nickNames, map} = this;
    const messageToAllClients = createAdditionalMessage({
      person: `${nickNames.get(userId)} left us`,
      message: '',
    });

    map.forEach((value, key, map)=> {
      value.send(messageToAllClients);
    })
  }

  sendCommonGeneralMessage(action) {
    const {partyTheme, userIds, map} = this;
    const messageToClient = createGeneralMessage({
      partyTheme: partyTheme,
      numberOfPlayers: userIds.length,
      actions: action
    });
    map.forEach((value, key, map)=> {
      value.send(messageToClient);
    })
  }

  messageForActiveUser(bool) {
    return bool ? ACTION_MESSAGES.BESIDE : ACTION_MESSAGES.ASK;
  }

  sendIndividualGeneralMessage(isAskType) {
    const {partyTheme, userIds, nickNames, activeUserIdx, isIncludeNickname, isNicknameUnraveled, map} = this;
    const messageToOtherClients = createGeneralMessage({
      partyTheme: partyTheme,
      numberOfPlayers: userIds.length,
      actions: isAskType ? ACTION_MESSAGES.TYPING(nickNames.get(userIds[activeUserIdx])) : ACTION_MESSAGES.ANSWER
    });
    const messageToActiveClient = createGeneralMessage({
      partyTheme: partyTheme,
      numberOfPlayers: userIds.length,
      actions: isAskType ? messageForActiveUser(isIncludeNickname && !isNicknameUnraveled): ACTION_MESSAGES.WAIT,
      isActive: isAskType
    });
      map.forEach((value, key, map)=> {
      value.send(key===userIds[activeUserIdx]? messageToActiveClient : messageToOtherClients);
    })
  }

  sendFinalMessage(){
    const {map, winners, nickNames} = this;
    map.forEach((value, key, map)=> {
      value.send(createFinalMessage(winners,nickNames, key));
    })
  }

}
module.exports = {Game};
