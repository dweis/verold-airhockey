var Backbone = require('backbone')
  , _ = require('underscore');

var MenuView = Backbone.View.extend({
  el: 'body',

  initialize: function(options) {
    this.playerSetupView = options.playerSetupView;
  },

  events: {
    'click .about-button': 'showAbout',
    'click .about-close': 'hideAbout',
    'click .credits-button': 'showCredits',
    'click .credits-close': 'hideCredits',
    'click .settings-button': 'showSettings',
    'click .settings-close': 'hideSettings'
  },

  showAbout: function() {
    $('.dialog').hide();
    $('#about-dialog').show();
  },

  hideAbout: function() {
    $('#about-dialog').hide();
  },

  showCredits: function() {
    $('.dialog').hide();
    $('#credits-dialog').show();
  },

  hideCredits: function() {
    $('#credits-dialog').hide();
  },

  showSettings: function() {
    $('.dialog').hide();
    this.playerSetupView.show();
  },

  hideSettings: function() {
    this.playerSetupView.hide();
  }
});

module.exports = MenuView;
