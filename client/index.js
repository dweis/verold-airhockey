var _ = require('underscore')
  , VeroldApp = require('./verold_app')
  , AirHockey = require('./air_hockey');

var veroldApp = new VeroldApp()
  , airHockey = new AirHockey(veroldApp);

VAPI.onReady(function() {
  veroldApp.initialize( {
    container : null,
    projectId : "5130099e21d65002000000f6",
    enablePostProcess: false,
    enablePicking: true,
    handleInput: true,
    clearColor: 0xff0000,
    success: function() {
      airHockey.startup();
    }
  });
});

module.exports = window.airHockey = airHockey;
