var Backbone = require('backbone')
  , _ = require('underscore')
  , PlayerModel = require('../models/player')
  , playerTemplate = require('../templates/player');

var PlayerView = Backbone.View.extend({
  template: playerTemplate,

  initialize: function() {
    this.model = new PlayerModel();

    this.model.on('change', this.render, this);
  },

  setPlayerNumber: function(playerNumber) {
    this.playerNumber = playerNumber;
  },

  render: function() {
    if (this.model.get('name')) {
      var data = this.model.toJSON();
      data.playerNumber = this.playerNumber;
      data.score = '';
      for (var i = 0; i < this.model.get('score'); i++) {
        data.score += '&#9733';
      }
      console.log(data);

      $(this.el).html(this.template(data));
    } else {
      $(this.el).html('');
    }
  }
});

module.exports = PlayerView;
