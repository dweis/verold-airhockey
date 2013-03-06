var crypto = require('crypto')
  , uuid = require('node-uuid')
  , Physics = require('./physics');

function md5(string) {
  return crypto
    .createHash('md5')
    .update(string)
    .digest('hex');
}

var Game = function(io) {
  this.physicsFreq = 60;
  this.socketsFreq = 35;
  this.inactivityTime = 120 * 1000;

  this.io = io;
  this.physics = new Physics();

  this.playing = false;

  this.spectators = [];
}

Game.prototype.init = function() {
  var that = this;

  this.physics.init();
  this.initSocketIO();

  this.physics.on('goal', function() {
    that.goal.apply(that, arguments);
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

Game.prototype.logStatus = function() {
  console.log('P1: %s (%s) P2: %s (%s) #Spectators: %s Data: %s',
    (this.p1 && this.p1.name) || 'n/a', (this.p1 && this.p1.score) || '0',
    (this.p2 && this.p2.score) || 'n/a', (this.p2 && this.p2.score) || '0',
    this.spectators.length, JSON.stringify(this.physics.getUpdateObject()));
}

Game.prototype.addPlayer = function(player) {
  this.playing = true;
  if (!this.p1) {
    this.setP1(player);
  } else if (!this.p2) {
    this.setP2(player);
  } else {
    this.spectators.push(player);
    this.io.sockets.emit('spectatorAdd', { name: player.name
                                         , gravatarHash: player.gravatarHash
                                         , uuid: player.uuid });
  }
}

Game.prototype.spectatorRemoved = function(player) {
  this.io.sockets.emit('spectatorRemove', { name: player.name
                                          , gravatarHash: player.gravatarHash
                                          , uuid: player.uuid });
}

Game.prototype.removePlayer = function(player) {
  console.log(player.name + ' has left the game');
  if (this.p1 && this.p1.socket && this.p1.socket.id == player.socket.id) {
    this.p1.socket.removeListener('position', this.p1._updatePositionFn);

    this.p1 = undefined;

    if (this.spectators.length) {
      this.setP1(this.spectators.pop());
      this.spectatorRemoved(this.p1);

    } else {
      this.io.sockets.emit('p1');
    }
  } else if (this.p2 && this.p2.socket && this.p2.socket.id == player.socket.id) {
    this.p2.socket.removeListener('position', this.p2._updatePositionFn);

    this.p2 = undefined;

    if (this.spectators.length) {
      this.setP2(this.spectators.pop());
      this.spectatorRemoved(this.p2);
    } else {
      this.io.sockets.emit('p2');
    }
  } else {
    for (var i in this.spectators) {
      if (this.spectators[i].socket.id == player.socket.id) {
        this.spectatorRemoved(this.spectators[i]);
        this.spectators.splice(i, 1);
      }
    }
  }
}

Game.prototype.goal = function(net) {
  if (net == 1) {
    if (this.p2) this.p2.score ++;
  } else if (net == 2) {
    if (this.p1) this.p1.score ++;
  }

  console.log('Goal on net: ' + net);
  this.io.sockets.emit('goal', net);
  this.physics.reset();

  this.updateScores();
}

Game.prototype.updateScores = function() {
  this.io.sockets.emit('score', [ (this.p1 && this.p1.score) || 0, (this.p2 && this.p2.score) || 0 ]);
}

Game.prototype.resetScores = function() {
  if (this.p1) this.p1.score = 0;
  if (this.p2) this.p2.score = 0;

  this.updateScores();
}

Game.prototype.setP1 = function(player) {
  this._setPlayer('p1', player);
}

Game.prototype.setP2 = function(player) {
  this._setPlayer('p2', player);
}

Game.prototype._setPlayer = function(key, player) {
  var that = this;

  if (this[key]) {
    this[key].socket.removeListener('position', this[key]._updatePositionFn);
  }

  this[key] = player;

  this[key]._updatePositionFn = function() {
    player.lastPositionUpdate = Date.now(); that.physics['updatePosition' + key.toUpperCase()].apply(that.physics, arguments);
  }

  this[key].socket.on('position', this[key]._updatePositionFn);
  this[key].socket.emit('active', { player: key });

  this.physics.reset();
  this.resetScores();

  this.io.sockets.emit(key, { name: player.name
                            , gravatarHash: player.gravatarHash
                            , uuid: player.uuid
                            , score: this[key].score });

  console.log(player.name + ' has become ' + key);
}

Game.prototype.updateSockets = function() {
  var timestamp = Date.now(), socket;

  if (this.p1 && timestamp - this.p1.lastPositionUpdate > this.inactivityTime) {
    socket = this.p1.socket;

    this.removePlayer(this.p1);
    socket.emit('inactive');
    socket.disconnect();
  }

  if (this.p2 && timestamp - this.p2.lastPositionUpdate > this.inactivityTime) {
    socket = this.p2.socket;

    this.removePlayer(this.p2);
    socket.emit('inactive');
    socket.disconnect();
  }

  this.io.sockets.emit('update', this.physics.getUpdateObject());
}

Game.prototype.updatePhysics = function() {
  if (this.playing && !Object.keys(this.io.connected).length) {
    this.playing = false;
    this.physics.reset();
  }

  if (this.playing) {
    this.physics.update(1 / this.physicsFreq);
  }
}

Game.prototype.initSocketIO = function() {
  var that = this;

  this.io.sockets.on('connection', function (socket) {
    var initialUsers = {
      p1: undefined,
      p2: undefined,
      spectators: []
    };

    if (that.p1) initialUsers.p1 = { name: that.p1.name, gravatarHash: that.p1.gravatarHash, uuid: that.p1.uuid, score: that.p1.score };
    if (that.p2) initialUsers.p2 = { name: that.p2.name, gravatarHash: that.p2.gravatarHash, uuid: that.p2.uuid, score: that.p2.score };

    for (var i in that.spectators) {
      initialUsers.spectators.push({ name: that.spectators[i].name
                                   , gravatarHash: that.spectators[i].gravatarHash
                                   , uuid: that.spectators[i].uuid });
    }

    socket.emit('initialUsers', initialUsers);

    var player = { socket: socket, uuid: uuid.v4() };

    socket.on('playerRegister', function(playerInfo) {
      player.gravatarHash = md5(playerInfo.email.trim() ||
          ('guest+' + Math.floor(Math.random() * 1000)) + '@airhockey.jit.su');

      if (!player.name) {
        player.name = playerInfo.name.trim();

        console.log('Player registered: %s', player.name);

        socket.emit('playerRegistered', {
          name: player.name,
          gravatarHash: player.gravatarHash,
          uuid: player.uuid });

        that.addPlayer(player);
      } else {
        player.name = playerInfo.name.trim();

        console.log('Player modified: %s', player.name);

        that.io.sockets.emit('playerModified', {
          name: player.name,
          gravatarHash: player.gravatarHash,
          uuid: player.uuid });
      }
    });

    socket.on('disconnect', function() {
      that.removePlayer(player);
    });
  });
}

module.exports = Game;

