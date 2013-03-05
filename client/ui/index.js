var _ = require('underscore')
  , SpectatorsCollection = require('./collection/spectators');

window.GameUI = {}
window.GameUI.player1 = undefined;
window.GameUI.player2 = undefined;
window.GameUI.specators = new SpectatorsCollection();
