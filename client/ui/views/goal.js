var Backbone = require('backbone'),
    goalTemplate = require('../templates/goal.hbs');

var GoalView = Backbone.View.extend({
  template: goalTemplate,
  tagName: 'div',
  className: 'goal',

  initialize: function() {
    this.render();
  },

  render: function() {
    $(this.el).html(this.template(this.model.toJSON()));
    $(this.el).appendTo('body');
  }
});

module.exports = GoalView;
