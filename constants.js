const THEMES = ['movie characters', 'animals', 'fruits and vegetables', 'cartoon characters'];

const TYPES = {
GENERAL: 'general',
ADDITIONAL: 'additional',
FINAL: 'final',
}

const CLIENT_MESSAGES = {
  RIGHT: 'yes',
  WRONG: 'no',
}

const ACTION_MESSAGES = {
  START: 'guess who you are',
  ASK: 'you can ask',
  ANSWER: 'answer the question',
  TYPING:(name)=>`${name} is typing...`,
  WAIT: '...wait',
  BESIDE: 'you are so close to the correct answer, it remains only to write who you are',
  WINNER_YOU: (name)=>`you're right, your nickname ${name}`,
  WINNER_HERE: (name)=>`nickname ${name} unraveled!`,
  GAME_OVER: 'game over, look places',
  LAST: 'you are the last player, everyone left the game'
}

module.exports = {THEMES, TYPES, ACTION_MESSAGES, CLIENT_MESSAGES};
