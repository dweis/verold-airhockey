var _ = require('underscore'),
    GoalView = require('./views/goal'),
    PlayerModel = require('../../common/models/player'),
    PlayerView = require('./views/player'),
    PlayerSetupView = require('./views/player_setup'),
    MenuView = require('./views/menu'),
    PlayerCollection = require('../../common/collections/player'),
    SpectatorsView = require('./views/spectators');

var UI = function(options) {
  this.socket = options.socket;
};

UI.prototype.init = function() {
  var that = this;

  this.spectators = new PlayerCollection();
  this.p1View = new PlayerView({ el: '#player1', socket: this.socket });
  this.p2View = new PlayerView({ el: '#player2', socket: this.socket });
  this.spectatorsView = new SpectatorsView({ collection: this.spectators, socket: this.socket });

  this.playerSetupView = new PlayerSetupView({ socket: this.socket });
  this.menuView = new MenuView({ playerSetupView: this.playerSetupView });

  this.socket.on('connect', function() {
    that.playerSetupView.show();
  });

  this.socket.on('goal', function(net) {
    var goalView = new GoalView({ model: (net === 1) ? that.p2View.model : that.p1View.model });

    setTimeout(function() {
      goalView.remove();
    }, 1000);
  });

  this.socket.on('initialUsers', function(initialUsers) {
    if (initialUsers.p1) {
      that.p1View.model.set(initialUsers.p1);
    }
    if (initialUsers.p2) {
      that.p2View.model.set(initialUsers.p2);
    }
    _.each(initialUsers.spectators, function(playerInfo) {
      that.spectators.add(new PlayerModel(playerInfo));
    });
  });

  this.socket.on('p1', function(playerInfo) {
    if (playerInfo) {
      that.p1View.model.set(playerInfo);
    } else {
      that.p1View.model.set({ name: '', gravatar: '', score: 0 });
    }
  });

  this.socket.on('p2', function(playerInfo) {
    if (playerInfo) {
      that.p2View.model.set(playerInfo);
    } else {
      that.p2View.model.set({ name: '', gravatar: '', score: 0 });
    }
  });

  this.socket.on('spectatorAdd', function(playerInfo) {
    that.spectators.add(new PlayerModel(playerInfo));
  });

  this.socket.on('spectatorRemove', function(playerInfo) {
    _.each(that.spectators.models,function(model) {
      if (model.get('uuid') === playerInfo.uuid) {
        that.spectators.remove(model);
      }
    });
  });

  this.socket.on('score', function(score) {
    if (score[0] !== that.p1View.model.get('score')) {
      that.p1View.model.set('score', score[0]);
    }
    if (score[1] !== that.p2View.model.get('score')) {
      that.p2View.model.set('score', score[1]);
    }
  });

  $('#headers').hide();
  $('#game-ui').show();
};

module.exports = UI;
