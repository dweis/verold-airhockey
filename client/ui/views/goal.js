var Backbone = require('backbone')
  , _ = require('underscore')
  , goalTemplate = require('../templates/goal');

var GoalView = Backbone.View.extend({
  template: goalTemplate,
  tagName: 'div',
  className: 'goal',

  initialize: function() {
    this.render();
  },

  render: function() {
    console.log('goal template: ', this.template);
    $(this.el).html(this.template(this.model.toJSON()));
    $(this.el).appendTo('body');
  }
});

module.exports = GoalView;
