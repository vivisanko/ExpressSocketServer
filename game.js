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
      this.takeFirstStepActions(message, userId)
    }

    if(step===2 && nickNames.size === userIds.length){
      this.takeSecondStepActions(message, userId)
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
    const {nickNames, userIds, activeUserIdx} = this;
    if(!this.isAcceptAnswer){
      this.isIncludeNickname = msg.toLowerCase().includes(`${nickNames.get(userIds[activeUserIdx]).toLowerCase()}`);
      this.isNicknameUnraveled = msg.toLowerCase().trim() === nickNames.get(userIds[activeUserIdx]).toLowerCase();
      this.isAcceptAnswer=true;
      }
      console.log('isIncludeNickname', this.isIncludeNickname);
      console.log('isNicknameUnraveled', this.isNicknameUnraveled);
      this.sendAdditionalMessageToAllOthers(msg,userId);
      this.sendIndividualGeneralMessage(false);
      if(msg===CLIENT_MESSAGES.RIGHT || msg===CLIENT_MESSAGES.WRONG && this.isAcceptAnswer){
        this.processBoolClientMessages(msg);
        this.isAcceptAnswer=false;
        this.checkIsGameOver();
      }
  }

  processUserExit(userId){
    // переписать newActiveUserIndex и логику elses
    this.userIds = R.reject(el=>el===userId,this.userIds);
      // const newActiveUserIdx = this.activeUserIdx===0 ? this.userIds.length - 1 : this.activeUserIdx - 1;
      const newActiveUserIdx=0;
      console.log('newActiveUserIdx', this.userIds[newActiveUserIdx]);

      this.map.delete(userId);
      if(this.map.size===1){
        this.sendCommonGeneralMessage(ACTION_MESSAGES.LAST);
      } else {
        this.sendIndividualGeneralMessage(false);
        this.sendAdditionalMessageAboutExit(userId);
      }

      this.activeUserIdx=newActiveUserIdx;
      this.nickNames.delete(userId);
      if (this.partyTheme && R.isEmpty(this.userIds)){
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
    if(msg===CLIENT_MESSAGES.WRONG){
      this.isIncludeNickname = false;
      this.isNicknameUnraveled = false;
      this.activeUserIdx = this.createNewActiveUserIndex();
    } else if(this.isNicknameUnraveled){
      this.handleNextWinner();
    }
  }

  handleNextWinner(){
    const {activeUserIdx, userIds, winners}=this;
    this.sendAdditionalMessageAboutWinner();
    const previousActiveInd = activeUserIdx;
    this.activeUserIdx = this.createNewActiveUserIndex();
    winners.push(userIds[previousActiveInd]);
    this.isIncludeNickname = false;
    this.isNicknameUnraveled = false;
  }

  createNewActiveUserIndex(){
    const {userIds, activeUserIdx, winners} = this;

    return R.compose(
      activeUsers=>{
        console.log('winners in compose', winners);

        console.log('ind', activeUserIdx);

        const indNowFromActive=R.indexOf(userIds[activeUserIdx], activeUsers);
        console.log('indNowFromActive', indNowFromActive);
        return R.indexOf(activeUsers[R.lt(R.inc(indNowFromActive),R.length(activeUsers))?R.inc(indNowFromActive):0], userIds)
      },
      R.reject(el=>R.includes(el,winners)),
    )(userIds,activeUserIdx)
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
    const {userIds, nickNames, activeUserIdx, map} = this;
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
      actions: isAskType ? this.messageForActiveUser(isIncludeNickname && !isNicknameUnraveled): ACTION_MESSAGES.WAIT,
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
