var Box2D = require('box2dweb-commonjs').Box2D;

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
  this.friction = 0.05;
  this.density = 0.5;
  this.restitution = 0.9;
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

  setInterval(function() {
    that.update();
  }, 1000 / this.fps);
}

Game.prototype.addPlayer = function(player) {
  this.playing = true;
  if (!this.p1) {
    this.setP1(player);
  } else if (!this.p2) {
    this.setP2(player);
  } else {
    this.spectators.push(player);
  }
}

Game.prototype.removePlayer = function(player) {
  if (this.p1.socket.id == player.socket.id) {
    this.p1 = undefined;

    if (this.spectators.length) {
      this.setP1(this.spectators.pop());
    }
  } else if (this.p2.socket.id == player.socket.id) {
    this.p2 = undefined;

    if (this.spectators.length) {
      this.setP2(this.spectators.pop());
    }
  }
}

Game.prototype.setP1 = function(player) {
  this.p1 = player;

  // fix me, will cause memory leaks?
  this.p1.socket.on('position', this.updatePositionP1());
  this.p1.socket.emit('active', { player: 'p1' });
}

Game.prototype.setP2 = function(player) {
  this.p2 = player;

  // fix me, will cause memory leaks?
  this.p2.socket.on('position', this.updatePositionP2());
  this.p2.socket.emit('active', { player: 'p2' });
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
  //this.p1Body.SetPosition({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
  this.p1MouseJoint.SetTarget({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
}

Game.prototype._updatePositionP2 = function(updateObj) {
  //this.p1Body.SetPosition({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
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
  this.world = new b2World(new b2Vec2(0, 0), true);

  this.createWall(0, 0, 0, this.height);
  this.createWall(this.width, 0, this.width, this.height);

  this.createWall(0, 0, this.width/6, 0);
  this.createWall(this.width/12, 0, 0, this.height / 24);
  this.createWall(this.width - this.width/6, 0, this.width, 0); 
  this.createWall(this.width - this.width/12, 0, this.width, this.height / 24);

  this.createWall(0, this.height, this.width/6, this.height);
  this.createWall(this.width/12, this.height, 0, this.height - this.height / 24);
  this.createWall(this.width - this.width/6, this.height, this.width, this.height);
  this.createWall(this.width - this.width/12, this.height, this.width, this.height - this.height / 24);

  this.createNet(this.width/3 + this.width/6, 0, this.width/6, this.thickness/2);

  this.createNet(this.width/3 + this.width/6, this.height, this.width/6, this.thickness/2);

  this.puckBody = this.createPuck(this.width/2, this.height/2, this.puckDiameter/2);

  this.p1Body = this.createMallet(this.width/2, this.height/8, this.malletDiameter/2);
  this.p2Body = this.createMallet(this.width/2, this.height - this.height/8, this.malletDiameter/2);
}

Game.prototype.reset = function() {
  this.p1Body.SetPosition(this.width/2, this.height/8);
  this.p2Body.SetPosition(this.width/2, this.height - this.height/8);
  this.puckBody.SetPosition(this.width/2, this.height/2);
}

Game.prototype.initContactListener = function() {
  var listener = new b2Listener;

  listener.BeginContact = function(contact) {
    var a = contact.GetFixtureA().GetUserData()
      , b = contact.GetFixtureB().GetUserData();

    if (a && a == 'puck') {
      if (b && b == 'net') {
        this.io.emit('goal');
      }
    } else if (b && b == 'puck') {
      if (a && a == 'net') {
        this.io.emit('goal');
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
  md.maxForce = 600.0 * this.p1Body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 1;
  this.p1MouseJoint = this.world.CreateJoint(md);
  this.p1Body.SetAwake(true);

  // p2
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p2Body;
  md.target.Set(this.p2Body.GetPosition().x, this.p2Body.GetPosition().y);
  md.collideConnected = true;
  md.maxForce = 600.0 * this.p2Body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 1;
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

Game.prototype.createNet = function(x, y, w, h) {
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

  this.world.CreateBody(bodyDef).CreateFixture(fixDef).SetUserData('net');
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

module.exports = Game;
