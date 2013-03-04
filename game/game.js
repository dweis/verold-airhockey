var crypto = require('crypto')
  , uuid = require('node-uuid')
  , Physics = require('./physics');

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

var Game = function(io) {
  this.fps = 60;

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
    that.update();
  }, 1000 / this.fps);

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
    this.io.sockets.emit('spectatorAdd', { name: player.name, gravatarHash: player.gravatarHash, uuid: player.uuid });
  }
}

Game.prototype.spectatorRemoved = function(player) {
  this.io.sockets.emit('spectatorRemove', {
        name: player.name
      , gravatarHash: player.gravatarHash
      , uuid: player.uuid });
}

Game.prototype.removePlayer = function(player) {
  console.log(player.name + ' has left the game');
  if (this.p1 && this.p1.socket && this.p1.socket.id == player.socket.id) {
    this.p1 = undefined;

    if (this.spectators.length) {
      this.setP1(this.spectators.pop());
      this.spectatorRemoved(this.p1);

    } else {
      this.io.sockets.emit('p1');
    }
  } else if (this.p2 && this.p2.socket && this.p2.socket.id == player.socket.id) {
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
  if (this.p1)
    this.p1.score = 0;

  if (this.p2)
    this.p2.score = 0;

  this.updateScores();
}

Game.prototype.setP1 = function(player) {
  this.p1 = player;

  // fix me, will cause memory leaks?
  this.p1.socket.on('position', this.updatePositionP1());
  this.p1.socket.emit('active', { player: 'p1' });

  this.resetScores();

  this.io.sockets.emit('p1', { name: player.name, gravatarHash: player.gravatarHash, uuid: player.uuid, score: this.p1.score });

  console.log(this.p1.name + ' has become player 1');
}

Game.prototype.setP2 = function(player) {
  this.p2 = player;

  // fix me, will cause memory leaks?
  this.p2.socket.on('position', this.updatePositionP2());
  this.p2.socket.emit('active', { player: 'p2' });

  this.resetScores();

  this.io.sockets.emit('p2', { name: player.name, gravatarHash: player.gravatarHash, uuid: player.uuid, score: this.p2.score });

  console.log(this.p2.name + ' has become player 2');
}

Game.prototype.updatePositionP1 = function() {
  var that = this;
  return function() {
    that.physics.updatePositionP1.apply(that.physics, arguments);
  }
}

Game.prototype.updatePositionP2 = function() {
  var that = this;
  return function() {
    that.physics.updatePositionP2.apply(that.physics, arguments);
  }
}

Game.prototype.update = function() {
  this.io.sockets.emit('update', this.physics.getUpdateObject());

  if (this.playing && !Object.keys(this.io.connected).length) {
    this.playing = false;
    this.physics.reset();
  }

  if (this.playing) {
    this.physics.update(1 / this.fps);
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
      player.name = playerInfo.name.trim();
      player.gravatarHash = md5(playerInfo.email.trim() ||
          ('guest+' + Math.floor(Math.random() * 1000)) + '@airhockey.jit.su');

      console.log('Player registered: %s', player.name);

      socket.emit('playerRegistered', { name: player.name, gravatarHash: player.gravatarHash, uuid: player.uuid });

      that.addPlayer(player);
    });

    socket.on('disconnect', function() {
      that.removePlayer(player);
    });
  });
}

module.exports = Game;

