var PlayerModel = require('../common/models/player')
  , PlayerCollection = require('../common/collections/player')
  , uuid = require('node-uuid')
  , Physics = require('../common/physics')
  , BISON = require('bison')
  , _ = require('underscore');

var GameServer = function(io) {
  this.physicsFreq = 60;
  this.socketsFreq = 8;
  this.inactivityTime = 20 * 1000;

  this.io = io;
  this.physics = new Physics();

  this.playing = false;

  this.spectators = new PlayerCollection();

}

GameServer.prototype.init = function() {
  var that = this;

  this.physics.init();
  this.initSocketIO();

  this.physics.on('goal', function() {
    that.goal.apply(that, arguments);
  });

  this.spectators.on('remove', function(model) {
    that.io.sockets.emit('spectatorRemove', model.toJSON());
  });

  this.spectators.on('add', function(model) {
    that.io.sockets.emit('spectatorAdd', model.toJSON());
  });

  setInterval(function() {
    that.updateSockets();
  }, 1000 / this.socketsFreq);

  setInterval(function() {
    that.updatePhysics();
  }, 1000 / this.physicsFreq);

  setInterval(function() {
    that.logStatus();
  }, 2000);
}

GameServer.prototype.logStatus = function() {
  console.log('P1: %s (%s) P2: %s (%s) #Spectators: %s Data: %s',
    (this.p1 && this.p1.get('name')) || 'n/a', (this.p1 && this.p1.get('score')) || '0',
    (this.p2 && this.p2.get('score')) || 'n/a', (this.p2 && this.p2.get('score')) || '0',
    this.spectators.length, JSON.stringify(this.physics.getUpdateObject()));
}

GameServer.prototype.addPlayer = function(player) {
  this.playing = true;
  if (!this.p1) {
    this.setPlayer('p1', player);
  } else if (!this.p2) {
    this.setPlayer('p2', player);
  } else {
    this.spectators.add(player);
  }
}

GameServer.prototype.removePlayer = function(player) {
  var that = this, found = false;

  console.log(player.get('name') + ' has left the game');
  _.each(['p1', 'p2'], function(key) {
    if (!found && that[key] && that[key].get('socket') &&
          that[key].get('socket').id == player.get('socket').id) {
      that[key].get('socket').removeListener('position', that[key]._updatePositionFn);

      that[key] = undefined;

      if (that.spectators.length) {
        that.setPlayer(key, that.spectators.pop());
      } else {
        that.io.sockets.emit(key);
      }
    }
  });

  if (!found) {
    this.spectators.each(function(spectator) {
      if (spectator.get('socket').id == player.get('socket').id) {
        that.spectators.remove(spectator);
      }
    });
  }
}

GameServer.prototype.goal = function(net) {
  if (net == 1) {
    if (this.p2) this.p2.score ++;
  } else if (net == 2) {
    if (this.p1) this.p1.score ++;
  }

  console.log('Goal on net: ' + net);
  this.io.sockets.emit('goal', net);
  this.physics.reset();

  this.updateScores();

  if (this.p1 && this.p1.score == 3) {
    this.io.sockets.emit('gameOver', { winner: 'p1' });
    this.resetScores();
    this.updateScores();
    this.swapPlayer('p2');
  } else if (this.p2 && this.p2.score == 3) {
    this.io.sockets.emit('gameOver', { winner: 'p2' });
    this.resetScores();
    this.updateScores();
    this.swapPlayer('p1');
  }
}

GameServer.prototype.updateScores = function() {
  this.io.sockets.emit('score', [ (this.p1 && this.p1.score) || 0, (this.p2 && this.p2.score) || 0 ]);
}

GameServer.prototype.resetScores = function() {
  if (this.p1) this.p1.score = 0;
  if (this.p2) this.p2.score = 0;

  this.updateScores();
}

GameServer.prototype.setPlayer = function(key, player) {
  var that = this;

  if (this[key]) {
    this[key].get('socket').removeListener('position', this[key]._updatePositionFn);
  }

  this[key] = player;
  this[key].lastPositionUpdate = Date.now();

  this[key]._updatePositionFn = function() {
    player.lastPositionUpdate = Date.now();
    that.physics['updatePosition' + key.toUpperCase()].apply(that.physics, arguments);
  }

  this[key].get('socket').on('position', this[key]._updatePositionFn);
  this[key].get('socket').emit('active', { player: key });

  this.physics.reset();
  this.resetScores();

  this.io.sockets.emit(key, player.toJSON());

  console.log(player.get('name') + ' has become ' + key);
}

GameServer.prototype.swapPlayer = function(key) {
  var player = this[key];

  if (player) {
    this.setPlayer(key, this.spectators.pop());

    this.spectators.add(player);

    player
      .get('socket')
      .emit('inactive');
  }
}

GameServer.prototype.handleInactivity = function(key) {
  var timestamp = Date.now();

  if (this.spectators.length) {
    if (this[key] && timestamp - this[key].lastPositionUpdate > this.inactivityTime) {
      this.swapPlayer(key);
    }
  }
}

GameServer.prototype.updateSockets = function() {
  var encoded = BISON.encode(this.physics.getUpdateObject());

  this.handleInactivity('p1');
  this.handleInactivity('p2');

  this.io.sockets.emit('update', encoded);
}

GameServer.prototype.updatePhysics = function() {
  if (this.playing && !Object.keys(this.io.connected).length) {
    this.playing = false;
    this.physics.reset();
  }

  if (this.playing) {
    this.physics.update();
  }
}

GameServer.prototype.initSocketIO = function() {
  var that = this;

  this.io.sockets.on('connection', function (socket) {
    var initialUsers = {
      p1: undefined,
      p2: undefined,
      spectators: []
    };

    if (that.p1) initialUsers.p1 = that.p1.toJSON();
    if (that.p2) initialUsers.p2 = that.p2.toJSON();

    initialUsers.spectators = that.spectators.toJSON();

    socket.emit('initialUsers', initialUsers);

    var player = new PlayerModel();

    player.set({ socket: socket, uuid: uuid.v4() });

    socket.on('playerRegister', function(playerInfo) {
      if (!player.get('name')) {
        player.set(playerInfo);

        console.log('Player registered: %s', player.get('name'));

        socket.emit('playerRegistered', player.toJSON());

        that.addPlayer(player);
      } else {
        player.set(playerInfo);
        console.log('Player modified: %s', player.get('name'));

        that.io.sockets.emit('playerModified', player.toJSON());
      }
    });

    socket.on('disconnect', function() {
      that.removePlayer(player);
    });
  });
}

module.exports = GameServer;

