var Backbone = require('backbone')
  , _ = require('underscore')
  , SpectatorView = require('./spectator');

var SpectatorsView = Backbone.View.extend({
  el: '#spectators',

  initialize: function() {
    this.collection.on('add', this.spectatorAdded, this);
    this.collection.on('remove', this.spectatorRemoved, this);
    this.subViews = [];
  },

  spectatorAdded: function(model) {
    var view = new SpectatorView({ model: model });
    this.subViews.push(view);
    view.render();
    model.view = view;

    $(view.el).appendTo(this.el);
  },

  spectatorRemoved: function(model) {
    model.view.remove();
  }
});

module.exports = SpectatorsView;
