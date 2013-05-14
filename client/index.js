var  GameClient = require('./game_client');

var gameClient = new GameClient({
  el: '#render-target-container',
  projectId: '5130099e21d65002000000f6',
  engineOptions: {
    enablePicking: false,
    handleInput: true,
    clearColor: 0xff0000,
    forceLowEndRendering: window.VAPI.isMobile()
  }
});

gameClient.run();

module.exports = window.gameClient = gameClient;
