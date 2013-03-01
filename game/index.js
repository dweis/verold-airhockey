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

  // Constants
  this.fps = 60;
  this.friction = 0.2;
  this.density = 0.8;
  this.restitution = 0.7;
  this.width = 1.25;
  this.height = 2.50;
  this.thickness = 0.01;
  this.malletDiameter = 0.095;
  this.puckDiameter = 0.073125;
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

Game.prototype.setP1 = function(player) {
  this.p1 = player;

  this.p1.socket.on('position', this.updatePositionP1());
}

Game.prototype.setP2 = function(player) {
  this.p2 = player;
}

Game.prototype.updatePositionP1 = function() {
  var that = this;
  return function() {
    that._updatePositionP1.apply(that, arguments);
  }
}

Game.prototype._updatePositionP1 = function(updateObj) {
  //this.p1Body.SetPosition({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
  this.p1MouseJoint.SetTarget({ x: this.width - (updateObj.x * this.width), y: (this.height/2) -((updateObj.y * this.height) * 0.5) });
}

Game.prototype.update = function() {
  var updateObj = [
    { p: this.puckBody.GetPosition(), a: this.puckBody.GetAngle() },
    { p: this.p1Body.GetPosition(), a: this.p1Body.GetAngle() },
    { p: this.p2Body.GetPosition(), a: this.p2Body.GetAngle() }
  ];

  this.io.sockets.emit('update', updateObj);

  this.world.Step( 1 / this.fps   //frame-rate
                 , 10       //velocity iterations
                 , 10       //position iterations
  );

  this.world.ClearForces();
}

Game.prototype.initPhysics = function() {
  this.world = new b2World(new b2Vec2(0, 0), true);

  //left
  this.createWall(0, this.height/2, this.thickness, this.height/2);

  //right
  this.createWall(this.width, this.height/2, this.thickness, this.height/2);

  // top left
  this.createWall(this.width/6, 0, this.width/6, this.thickness);
  // top right
  this.createWall(this.width - this.width/6, 0, this.width/6, this.thickness);

  // bottom left
  this.createWall(this.width/6, this.height, this.width/6, this.thickness);
  // bottom right
  this.createWall(this.width - this.width/6, this.height, this.width/6, this.thickness);

  // top net
  this.createNet(this.width/3 + this.width/6, 0, this.width/6, this.thickness/2);

  // bottom net
  this.createNet(this.width/3 + this.width/6, this.height, this.width/6, this.thickness/2);

  this.puckBody = this.createPuck(this.width/2, this.height/2, 0.073125/2);

  this.p1Body = this.createMallet(this.width/2, this.height/8, 0.095/2);
  this.p2Body = this.createMallet(this.width/2, this.height - this.height/8, 0.095/2);
}

Game.prototype.initContactListener = function() {
  var listener = new b2Listener;

  listener.BeginContact = function(contact) {
    var a = contact.GetFixtureA().GetUserData()
      , b = contact.GetFixtureB().GetUserData();

    if (a && a == 'puck') {
      if (b && b == 'net') {
        console.log('GOAL!');
      }
    } else if (b && b == 'puck') {
      if (a && a == 'net') {
        console.log('GOAL!');
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
  this.p1MouseJoint = this.world.CreateJoint(md);
  this.p1Body.SetAwake(true);

  // p2
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p2Body;
  md.target.Set(this.p2Body.GetPosition().x, this.p2Body.GetPosition().y);
  md.collideConnected = true;
  md.maxForce = 300.0 * this.p2Body.GetMass();
  this.p2MouseJoint = this.world.CreateJoint(md);
  this.p2Body.SetAwake(true);
}

Game.prototype.createWall = function(x, y, w, h) {
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
