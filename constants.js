const THEMES = ['movie characters', 'animals', 'fruits and vegetables', 'cartoon characters'];

const TYPES = {
GENERAL: 'general',
ADDITIONAL: 'additional',
}

const ACTION_MESSAGES = {
  START: 'guess who you are',
  ASK: 'you can ask',
  ANSWER: 'answer the question',
  TYPING:(name)=>`${name} is typing...`,
  WAIT: '...wait'
}

module.exports = {THEMES, TYPES, ACTION_MESSAGES};
