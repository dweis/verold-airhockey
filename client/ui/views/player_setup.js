// globals alert, console

var Backbone = require('backbone');

var PlayerSetupView = Backbone.View.extend({
  el: '#player-setup',

  initialize: function(options) {
    var that = this,
        name = localStorage.name || 'Guest' + Math.floor(Math.random() * 1000),
        email = localStorage.email || '';

    this.socket = options.socket;

    this.socket.on('playerRegistered', function() {
      that.onRegistered.apply(that, arguments);
    });

    $('#input-name').val(name);
    $('#input-email').val(email);
  },

  events: {
    'submit #player-setup-form': 'save'
  },

  save: function(e) {
    e.preventDefault();

    var name = $('#input-name').val(),
        email = $('#input-email').val();

    if (!name.length) {
      return alert('invalid name!');
    }

    localStorage.name = name;
    localStorage.email = email;
    console.log('registering...');

    this.socket.emit('playerRegister', { name: name, email: email });
  },

  show: function() {
    $(this.el).show();
  },

  hide: function() {
    $(this.el).hide();
  },

  onRegistered: function() {
    console.log('Registered, hiding dialog...');
    $(this.el).hide();
  }
});

module.exports = PlayerSetupView;
