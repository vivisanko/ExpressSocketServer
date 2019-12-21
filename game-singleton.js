const { Game } = require('./game');


  let currentGame = null;

  createGame = () => new Game();

  getGameSingleton = () => {

    if (!currentGame) {
      currentGame = createGame();
    }

    return currentGame;
  };


module.exports = { getGameSingleton };
