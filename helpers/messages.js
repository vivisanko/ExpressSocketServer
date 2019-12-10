const { TYPES } = require('../constants');


const createGeneralMessage = (values = {partyTheme: '', numberOfPlayers: 1, actions: '', isActive: false}) => {
  console.log('values', values);
const {partyTheme, numberOfPlayers, actions, isActive} = values;
return `
{"type": "${TYPES.GENERAL}",
 "message": ${JSON.stringify({
   theme: partyTheme,
   numberOfPlayers,
   actions,
   isActive,
   })}}`
};

const createAdditionalMessage = (values = {person: 'anonymous', message: '', isActive: false}) => {
  const {person, message, isActive} = values;
  return `
  {"type": "${TYPES.ADDITIONAL}",
   "message": ${JSON.stringify({
     person,
     message,
     isActive,
     timestamp: Date.now(),
     })}}`
  };

module.exports = {createGeneralMessage, createAdditionalMessage};
