const { TYPES } = require('../constants');


const createGeneralMessage = (values = {partyTheme: '', numberOfPlayers: 1, actions: ''}) => {
  console.log('values', values);
const {partyTheme, numberOfPlayers, actions} = values;
return `
{"type": "${TYPES.GENERAL}",
 "message": ${JSON.stringify({
   theme: partyTheme,
   numberOfPlayers,
   actions,
   })}}`
};

const createAdditionalMessage = (values = {person: 'anonymous', message: ''}) => {
  const {person, message} = values;
  return `
  {"type": "${TYPES.ADDITIONAL}",
   "message": ${JSON.stringify({
     person,
     message,
     })}}`
  };

module.exports = {createGeneralMessage, createAdditionalMessage};
