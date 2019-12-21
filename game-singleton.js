const { Game } = require('./game');

class GameSingleton {

  constructor() {
    this.currentGame = null;
  }

  createGame = () => new Game();

  getGame = () => this.currentGame;


  getGameSingleton = () => {

    if (!this.currentGame) {
      this.currentGame = this.createGame();
    }
    console.log('game singleton', this.currentGame);

    return this.currentGame;
  };

  close = () => {
    this.currentGame = null;
  }
}

module.exports = {GameSingleton};
