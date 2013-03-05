var Backbone = require('backbone')
  , _ = require('underscore')
  //, $ = require('jquery');

var GoalView = Backbone.View.extend({
  template: _.template($('#goal-template').html()),
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
