var Backbone = require('backbone')
  , _ = require('underscore')
  , spectatorTemplate = require('../templates/spectator');

var SpectatorView = Backbone.View.extend({
  template: spectatorTemplate,
  tagName: 'li',
  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
  }
});

module.exports = SpectatorView;
