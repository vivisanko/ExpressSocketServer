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

  const createFinalMessage = (winners, person) => {
    const  placeRating = JSON.stringify(Array.from(winners.values()));
    const personPlace = Array.from(winners.keys()).findIndex(el=>el===person);
    return `
    {"type": "${TYPES.FINAL}",
     "message": ${JSON.stringify({
       placeRating,
       personPlace,
     })}}`
    };

module.exports = {createGeneralMessage, createAdditionalMessage, createFinalMessage};
