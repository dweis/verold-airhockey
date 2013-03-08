var _ = require('underscore')
  , VeroldApp = require('../vendor/verold/VeroldApp')
  , GameClient = require('./game_client');

var veroldApp = new VeroldApp()
  , gameClient = new GameClient(veroldApp);

$(function() {
  VAPI.onReady(function() {
    veroldApp.initialize( {
      container : null,
      projectId : "5130099e21d65002000000f6",
      enablePostProcess: false,
      enablePicking: true,
      handleInput: true,
      clearColor: 0xff0000,
      success: function() {
        gameClient.startup();
      }
    });
  });
});

module.exports = window.gameClient = gameClient;
