const { TYPES } = require('../constants');


const createGeneralMessage = (values = {partyTheme: '', numberOfPlayers: 1, actions: '', isActive: false}) => {
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

const createAdditionalMessage = (values = {person: 'anonymous', message: ''}) => {
  const {person, message} = values;
  return `
  {"type": "${TYPES.ADDITIONAL}",
   "message": ${JSON.stringify({
     person,
     message,
     timestamp: Date.now(),
     })}}`
  };

  const createFinalMessage = (winners,names, person) => {
    const  placeRating=JSON.stringify(winners.map(el=>names.get(el)));
    const personPlace = winners.findIndex(el=>el===person);
    return `
    {"type": "${TYPES.FINAL}",
     "message": ${JSON.stringify({
       placeRating,
       personPlace,
     })}}`
    };

module.exports = {createGeneralMessage, createAdditionalMessage, createFinalMessage};
