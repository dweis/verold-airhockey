var Backbone = require('backbone')
  , _ = require('underscore')
  , SpectatorView = require('./spectator');

var SpectatorsView = Backbone.View.extend({
  el: '#spectators',

  initialize: function(options) {
    this.collection.on('add', this.spectatorAdded, this);
    this.collection.on('remove', this.spectatorRemoved, this);
    this.socket = options.socket;
  },

  spectatorAdded: function(model) {
    var view = new SpectatorView({ model: model, socket: this.socket });
    view.render();
    model.view = view;

    $(view.el).appendTo(this.el);
  },

  spectatorRemoved: function(model) {
    model.view.close();
  }
});

module.exports = SpectatorsView;
