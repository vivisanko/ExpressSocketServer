const R = require('ramda');
const {createGeneralMessage, createAdditionalMessage, createFinalMessage} = require('./helpers/messages');
const { THEMES, ACTION_MESSAGES, CLIENT_MESSAGES } = require('./constants');


class Game {

  constructor() {
    this.map = new Map();
    this.nickNames = new Map();
    this.winners = new Map();
    this.userIds = [];
    this.partyTheme = "";
    this.activeUserIdx = 0;
    this.isAcceptAnswer = false;
    this.isIncludeNickname = false;
    this.isNicknameUnraveled = false;
    this.lifeCyclePhase = 0;
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
    this.winners.clear();
    this.lifeCyclePhase = 0;
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
          this.lifeCyclePhase = 1;
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
      this.lifeCyclePhase = 2;
      }
      console.log('isIncludeNickname', this.isIncludeNickname);
      console.log('isNicknameUnraveled', this.isNicknameUnraveled);
      this.sendAdditionalMessageToAllOthers(msg,userId);
      this.sendIndividualGeneralMessage(false);
      if(msg===CLIENT_MESSAGES.RIGHT || msg===CLIENT_MESSAGES.WRONG && this.isAcceptAnswer){
        this.processBoolClientMessages(msg);
        this.isAcceptAnswer=false;
        this.checkIsGameOver();
        this.lifeCyclePhase = 1;
      }
  }

  processUserExit(userId){
    const isUserWasActive = this.userIds[this.activeUserIdx]===userId;
    let activeUserId = this.userIds[this.activeUserIdx];
    if (isUserWasActive) {
      const newActiveUserIdx = this.createNewActiveUserIndex([userId]);
      activeUserId = this.userIds[newActiveUserIdx];
    }
    this.userIds = R.reject(el=>el===userId,this.userIds);

      this.activeUserIdx = R.indexOf(activeUserId, this.userIds);


      this.map.delete(userId);

      if (this.lifeCyclePhase === 0 || this.lifeCyclePhase === 3 ) {
          this.sendCommonGeneralMessage(`${this.nickNames.get(userId)} left us`)
      }  else {
        this.sendAdditionalMessageAboutExit(userId);
        // this.sendIndividualGeneralMessage(false);

        if (this.lifeCyclePhase === 1){
          this.sendIndividualGeneralMessage(true);
        }

        if (this.lifeCyclePhase === 2){
          this.sendIndividualGeneralMessage(isUserWasActive);
        }
      }

      if(this.map.size===1){
      this.sendCommonGeneralMessage(ACTION_MESSAGES.LAST);
      }

      this.nickNames.delete(userId);
      if (this.partyTheme && R.isEmpty(this.userIds)){
       this.clearData();
      }
  }

  checkIsGameOver(){
    const {winners, userIds} = this;
    if(userIds.every(id=>winners.has(id))){
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
    this.sendAdditionalMessageAboutWinner();
    const previousActiveInd = this.activeUserIdx;
    this.activeUserIdx = this.createNewActiveUserIndex();
    const winnerKey = this.userIds[previousActiveInd];
    console.log('nickNames.winnerKey', this.nickNames.get(winnerKey));
    this.winners.set(winnerKey, this.nickNames.get(winnerKey));
    console.log('winners', this.winners);

    this.isIncludeNickname = false;
    this.isNicknameUnraveled = false;
  }

  createNewActiveUserIndex(excluded=[]){
    const {userIds, activeUserIdx, winners} = this;

    return R.compose(
      activeUsers=>{
        console.log('winners in compose', winners);

        console.log('ind', activeUserIdx);

        const indNowFromActive=R.indexOf(userIds[activeUserIdx], activeUsers);
        console.log('indNowFromActive', indNowFromActive);
        return R.indexOf(activeUsers[R.lt(R.inc(indNowFromActive),R.length(activeUsers))?R.inc(indNowFromActive):0], userIds)
      },
      R.reject(el=>R.includes(el, R.concat(R.keys(winners), excluded))),
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
    // const {winners, map} = this;
    this.lifeCyclePhase = 3
    this.map.forEach((value, key, map)=> {
      value.send(createFinalMessage(this.winners, key));
    })
  }

}
module.exports = {Game};
