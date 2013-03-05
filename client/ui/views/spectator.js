var Backbone = require('backbone')
  , _ = require('underscore')
  //, $ = require('jquery');

var SpectatorView = Backbone.View.extend({
  template: _.template($('#spectator-template').html()),
  tagName: 'li',
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
  }
});

module.exports = SpectatorView;
