var Backbone = require('backbone'),
    spectatorTemplate = require('../templates/spectator.hbs');

var SpectatorView = Backbone.View.extend({
  template: spectatorTemplate,
  tagName: 'li',

  initialize: function(options) {
    this.socket = options.socket;

    this._playerModified = $.proxy(this.playerModified, this);

    this.socket.on('playerModified', this._playerModified);

    this.model.on('change', this.render, this);
  },

  close: function() {
    this.socket.removeListener('playerModified', this._playerModified, this);
    this.unbind();
    this.remove();
  },

  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
  },

  playerModified: function(playerInfo) {
    if (this.model && this.model.get('uuid') === playerInfo.uuid) {
      this.model.set(playerInfo);
    }
  }
});

module.exports = SpectatorView;
