var Box2D = require('box2dweb-commonjs').Box2D
  , crypto = require('crypto')
  , uuid = require('node-uuid');

var b2Vec2 = Box2D.Common.Math.b2Vec2
  , b2AABB = Box2D.Collision.b2AABB
  , b2BodyDef = Box2D.Dynamics.b2BodyDef
  , b2Body = Box2D.Dynamics.b2Body
  , b2FixtureDef = Box2D.Dynamics.b2FixtureDef
  , b2Fixture = Box2D.Dynamics.b2Fixture
  , b2World = Box2D.Dynamics.b2World
  , b2MassData = Box2D.Collision.Shapes.b2MassData
  , b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
  , b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
  , b2MouseJointDef = Box2D.Dynamics.Joints.b2MouseJointDef
  , b2Listener = Box2D.Dynamics.b2ContactListener
  , b2DebugDraw = Box2D.Dynamics.b2DebugDraw;

function md5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

var Game = function(io) {
  this.io = io;
  this.world = undefined;
  this.puckBody = undefined;
  this.p1 = undefined;
  this.p2 = undefined;
  this.p1Body = undefined;
  this.p1MouseJoint = undefined;
  this.p2Body = undefined;
  this.p2MouseJoint = undefined;

  this.playing = false;

  this.spectators = [];

  // Constants
  this.fps = 60;
  this.friction = 0.15;
  this.density = 0.8;
  this.restitution = 0.5;
  this.width = 1.25;
  this.height = 2.50;
  this.thickness = 0.01;
  this.malletDiameter = 0.095 * 2;
  this.puckDiameter = 0.048 * 2;
}

Game.prototype.init = function() {
  var that = this;

  this.initPhysics();
  this.initContactListener();
  this.initMouseJoints();
  this.initSocketIO();

  setInterval(function() {
    that.update();
  }, 1000 / this.fps);

  setInterval(function() {
    that.logStatus();
  }, 2000);
}

Game.prototype.logStatus = function() {
  console.log('P1: %s P2: %s #Spectators: %s', (this.p1 && this.p1.name) || '<none>', (this.p2 && this.p2.name) || '<none>', this.spectators.length);
  console.log('Score P1: %s P2: %s', (this.p1 && this.p1.score) || '<none>', (this.p2 && this.p2.score) || '<none>');
  console.log('Puck position: ', this.puckBody.GetPosition());
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
  this.reset();

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
    that._updatePositionP1.apply(that, arguments);
  }
}

Game.prototype.updatePositionP2 = function() {
  var that = this;
  return function() {
    that._updatePositionP2.apply(that, arguments);
  }
}

Game.prototype._updatePositionP1 = function(updateObj) {
  this.p1MouseJoint.SetTarget({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
}

Game.prototype._updatePositionP2 = function(updateObj) {
  this.p2MouseJoint.SetTarget({ x: (updateObj.x * this.width), y: (this.height/2) + ((updateObj.y * this.height) * 0.5) });
}

Game.prototype.update = function() {
  var p1 = this.puckBody.GetPosition()
    , p2 = this.p1Body.GetPosition()
    , p3 = this.p2Body.GetPosition()
    , updateObj = [ p1.x, p1.y, p2.x, p2.y, p3.x, p3.y ];

  this.io.sockets.emit('update', updateObj);

  if (this.playing && !Object.keys(this.io.connected).length) {
    this.playing = false;
    this.reset();
  }

  if (this.playing) {
    this.world.Step( 1 / this.fps   //frame-rate
                   , 20       //velocity iterations
                   , 20       //position iterations
    );
    this.world.ClearForces();
  }
}

Game.prototype.initPhysics = function() {
  console.log('Initializing physics...');

  this.world = new b2World(new b2Vec2(0, 0), true);

  this.createWall(0, 0, 0, this.height);
  this.createWall(this.width, 0, this.width, this.height);

  this.createWall(0, 0, this.width/3, 0);
  this.createWall(this.width/12, 0, 0, this.height / 24);
  this.createWall(this.width - this.width/3, 0, this.width, 0); 
  this.createWall(this.width - this.width/12, 0, this.width, this.height / 24);

  this.createWall(0, this.height, this.width/3, this.height);
  this.createWall(this.width/12, this.height, 0, this.height - this.height / 24);
  this.createWall(this.width - this.width/3, this.height, this.width, this.height);
  this.createWall(this.width - this.width/12, this.height, this.width, this.height - this.height / 24);

  this.createNet(this.width/3 + this.width/6, -0.05, this.width/6, this.thickness*2, 1);
  this.createNet(this.width/3 + this.width/6, this.height + 0.05, this.width/6, this.thickness*2, 2);

  this.puckBody = this.createPuck(this.width/2, this.height/2, this.puckDiameter/2);

  this.p1Body = this.createMallet(this.width/2, this.height/8, this.malletDiameter/2);
  this.p2Body = this.createMallet(this.width/2, this.height - this.height/8, this.malletDiameter/2);
}

Game.prototype.reset = function() {
  var that = this;

  console.log('Resetting puck and p1/p2 bodies...');

  // If set right away it won't work, have to use setTimeout()
  setTimeout(function() {
    that.puckBody.SetLinearVelocity(new b2Vec2(0, 0));
    that.puckBody.SetAngularVelocity(0);
    that.puckBody.SetPositionAndAngle(new b2Vec2(that.width/2, that.height/2), 0);
  }, 100);
}

Game.prototype.initContactListener = function() {
  var listener = new b2Listener
    , that = this;

  listener.BeginContact = function(contact) {
    var a = contact.GetFixtureA().GetUserData()
      , b = contact.GetFixtureB().GetUserData();

    if (a && a == 'puck') {
      if (b && b.indexOf('net') == 0) {
        that.goal(b.substring(3,4));
      }
    } else if (b && b == 'puck') {
      if (a && a.indexOf('net') == 0) {
        that.goal(a.substring(3,4));
      }
    }
  }

  listener.EndContact = function(contact) { }

  listener.PostSolve = function(contact, impulse) {
  }

  listener.PreSolve = function(contact, oldManifold) { }

  this.world.SetContactListener(listener);
}

Game.prototype.initMouseJoints = function() {
  var md = new b2MouseJointDef();

  // p1
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p1Body;
  md.target.Set(this.p1Body.GetPosition().x, this.p1Body.GetPosition().y);
  md.collideConnected = true;
  md.maxForce = 300.0 * this.p1Body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 0.1;
  this.p1MouseJoint = this.world.CreateJoint(md);
  this.p1Body.SetAwake(true);

  // p2
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p2Body;
  md.target.Set(this.p2Body.GetPosition().x, this.p2Body.GetPosition().y);
  md.collideConnected = true;
  md.maxForce = 300.0 * this.p2Body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 0.1;
  this.p2MouseJoint = this.world.CreateJoint(md);
  this.p2Body.SetAwake(true);
}

Game.prototype.createWall = function(x1, y1, x2, y2) {
  var bodyDef, fixDef;

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_staticBody;
  bodyDef.position.x = 0;
  bodyDef.position.y = 0;

  fixDef = new b2FixtureDef;
  fixDef.shape = new b2PolygonShape.AsEdge(new b2Vec2(x1, y1), new b2Vec2(x2, y2));
  fixDef.density = this.density;
  fixDef.friction = this.friction;
  fixDef.restitution = this.restitution;

  this.world.CreateBody(bodyDef).CreateFixture(fixDef).SetUserData('wall');
}

Game.prototype.createNet = function(x, y, w, h, n) {
  var bodyDef, fixDef;

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_staticBody;
  bodyDef.position.x = x;
  bodyDef.position.y = y;

  fixDef = new b2FixtureDef;
  fixDef.shape = new b2PolygonShape.AsBox(w, h);
  fixDef.density = this.density;
  fixDef.friction = this.friction;
  fixDef.restitution  = this.restitution;
  fixDef.isSensor = true;

  this.world.CreateBody(bodyDef).CreateFixture(fixDef).SetUserData('net' + n);
}

Game.prototype.createPuck = function(x, y, size) {
  var bodyDef, fixDef, body;

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.x = x;
  bodyDef.position.y = y;

  fixDef = new b2FixtureDef;
  fixDef.shape = new b2CircleShape(size);
  fixDef.density = this.density;
  fixDef.friction = this.friction;
  fixDef.restitution  = this.restitution;

  var body = this.world.CreateBody(bodyDef);

  body.CreateFixture(fixDef).SetUserData('puck');

  return body;
}

Game.prototype.createMallet = function(x, y, size) {
  var bodyDef, fixDef, body;

  bodyDef = new b2BodyDef;
  bodyDef.type = b2Body.b2_dynamicBody;
  bodyDef.position.x = x;
  bodyDef.position.y = y;

  fixDef = new b2FixtureDef;
  fixDef.shape = new b2CircleShape(size);
  fixDef.density = this.density;
  fixDef.friction = this.friction;
  fixDef.restitution  = this.restitution;

  body = this.world.CreateBody(bodyDef);

  body.CreateFixture(fixDef).SetUserData('mallet');

  return body;
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
