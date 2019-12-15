const R = require('ramda');
const {createGeneralMessage, createAdditionalMessage, createFinalMessage} = require('./helpers/messages');
const { THEMES, TYPES, ACTION_MESSAGES } = require('./constants');


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
    this.map.set(userId, ws);
    this.userIds.push(userId);
    console.log('userIds', this.userIds);
    this.sendCommonGeneralMessage('');
  }

  handleMessageFromClient(msg, userId) {
    const messageObject=JSON.parse(msg);
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

    if(step===2 && this.nickNames.size === this.userIds.length){
      takeSecondStsepActions(message, userId)
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
    if (this.nickNames.size < this.userIds.length) {
      console.log('partyTheme', partyTheme);

      if(this.partyTheme===''){
        this.clearData();
        this.createGameTheme();
        this.sendCommonGeneralMessage('');
    } else {
        this.createNicknames(msg, userId);
        if (this.nickNames.size===userIds.length){
          this.sendIndividualGeneralMessage(true);
        }
      }
    }
  }

  takeSecondStsepActions(msg, userId){
  //  code here
  }


  createNicknames (msg, userId) {
    const userIndex = R.indexOf(userId, this.userIds);
    const nextIndex = R.inc(userIndex) < R.length(this.userIds) ? R.inc(userIndex) : 0;
    this.nickNames.set(this.userIds[nextIndex], msg.trim());
    console.log('nickNames', nickNames);
  }

  sendCommonGeneralMessage(action) {
    const messageToClient = this.createGeneralMessage({
      partyTheme: this.partyTheme,
      numberOfPlayers: this.userIds.length,
      actions: action
    });
    this.map.forEach((value, key, map)=> {
      value.send(messageToClient);
    })
  }

  messageForActiveUser(bool) {
    return bool ? ACTION_MESSAGES.BESIDE : ACTION_MESSAGES.ASK;
  }

  sendIndividualGeneralMessage(isAskType) {
    const messageToOtherClients = this.createGeneralMessage({
      partyTheme: this.partyTheme,
      numberOfPlayers: this.userIds.length,
      actions: isAskType ? ACTION_MESSAGES.TYPING(this.nickNames.get(this.userIds[this.activeUserIdx])) : ACTION_MESSAGES.ANSWER
    });
    const messageToActiveClient = this.createGeneralMessage({
      partyTheme: this.partyTheme,
      numberOfPlayers: this.userIds.length,
      actions: isAskType ? messageForActiveUser(this.isIncludeNickname && !this.isNicknameUnraveled): ACTION_MESSAGES.WAIT,
      isActive: isAskType
    });
    this.map.forEach((value, key, map)=> {
      value.send(key===this.userIds[this.activeUserIdx]? messageToActiveClient : messageToOtherClients);
    })
  }

}
module.exports = {Game};
