var VeroldApp = require('../vendor/verold/VeroldApp'),
    $ = require('jquery-browser'),
    GameClient = require('./game_client');

var veroldApp = new VeroldApp(),
    gameClient = new GameClient(veroldApp);

$(function() {
  VAPI.onReady(function() {
    veroldApp.initialize( {
      container : null,
      projectId : "5130099e21d65002000000f6",
      enablePostProcess: false,
      enablePicking: false,
      handleInput: true,
      clearColor: 0xff0000,
      forceLowEndRendering: veroldApp.isMobile(),
      success: function() {
        gameClient.startup();
      }
    });
  });
});

module.exports = window.gameClient = gameClient;
