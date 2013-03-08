var Backbone = require('backbone')
  , _ = require('underscore')
  , PlayerModel = require('../../../common/models/player')
  , playerTemplate = require('../templates/player.hbs');

var PlayerView = Backbone.View.extend({
  template: playerTemplate,

  initialize: function(options) {
    var that = this;

    this.model = new PlayerModel();
    this.socket = options.socket;

    this.model.on('change', this.render, this);

    this.socket.on('playerModified', $.proxy(this.playerModified, this));
  },

  render: function() {
    if (this.model.get('name')) {
      var data = this.model.toJSON();
      data.score = '';
      for (var i = 0; i < this.model.get('score'); i++) {
        data.score += '&#9733';
      }

      $(this.el).html(this.template(data));
    } else {
      $(this.el).html('');
    }
  },

  playerModified: function(playerInfo) {
    if (this.model && this.model.get('uuid') == playerInfo.uuid) {
      this.model.set(playerInfo);
    }
  }
});

module.exports = PlayerView;
