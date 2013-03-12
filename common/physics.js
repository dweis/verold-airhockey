var events = require('events')
  , Box2D = require('box2dweb-commonjs').Box2D
  , b2Vec2 = Box2D.Common.Math.b2Vec2
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

var Physics = function() {
  this.delta = 0;
  this.lastTs = 0;
  this.world = undefined;
  this.puckBody = undefined;
  this.p1 = undefined;
  this.p2 = undefined;
  this.p1Body = undefined;
  this.p1MouseJoint = undefined;
  this.p2Body = undefined;
  this.p2MouseJoint = undefined;

  // Constants
  this.friction = 0.15;
  this.density = 1;
  this.restitution = 0.4;
  this.width = 1.25;
  this.height = 2.50;
  this.thickness = 0.01;
  this.malletDiameter = 0.095 * 2;
  this.puckDiameter = 0.048 * 2;

  this.velocityIterations = 8;
  this.positionIterations = 3;
}


Physics.prototype = new events.EventEmitter;

Physics.prototype.init = function() {
  this.initPhysics();

  this.initContactListener();
  this.initMouseJoints();
}

Physics.prototype.initPhysics = function() {
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

Physics.prototype.reset = function() {
  var that = this;

  console.log('Resetting puck and p1/p2 bodies...');

  // If set right away it won't work, have to use setTimeout()
  setTimeout(function() {
    that.puckBody.SetLinearVelocity(new b2Vec2(0, 0));
    that.puckBody.SetAngularVelocity(0);
    that.puckBody.SetPositionAndAngle(new b2Vec2(that.width/2, that.height/2), 0);
  }, 100);
}

Physics.prototype.initContactListener = function() {
  var listener = new b2Listener
    , that = this;

  listener.BeginContact = function(contact) {
    var a = contact.GetFixtureA().GetUserData()
      , b = contact.GetFixtureB().GetUserData();

    if (a == 'puck' || b == 'puck') {
      that.emit('puckContact');
    }

    if (a && a == 'puck') {
      if (b && b.indexOf('net') == 0) {
        that.emit('goal', b.substring(3,4));
      }
    } else if (b && b == 'puck') {
      if (a && a.indexOf('net') == 0) {
        that.emit('goal', a.substring(3,4));
      }
    }
  }

  listener.EndContact = function(contact) { }

  listener.PostSolve = function(contact, impulse) {
  }

  listener.PreSolve = function(contact, oldManifold) { }

  this.world.SetContactListener(listener);
}

Physics.prototype.initMouseJoints = function() {
  var md = new b2MouseJointDef();
  md.maxForce = 200.0 * this.p1Body.GetMass();
  md.frequencyHz = 60;
  md.dampingRatio = 5.0;
  md.collideConnected = true;

  // p1
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p1Body;
  md.target.Set(this.p1Body.GetPosition().x, this.p1Body.GetPosition().y);
  this.p1MouseJoint = this.world.CreateJoint(md);
  this.p1Body.SetAwake(true);

  // p2
  md.bodyA = this.world.GetGroundBody();
  md.bodyB = this.p2Body;
  md.target.Set(this.p2Body.GetPosition().x, this.p2Body.GetPosition().y);
  this.p2MouseJoint = this.world.CreateJoint(md);
  this.p2Body.SetAwake(true);
}

Physics.prototype.createWall = function(x1, y1, x2, y2) {
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

Physics.prototype.createNet = function(x, y, w, h, n) {
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

Physics.prototype.createPuck = function(x, y, size) {
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

Physics.prototype.createMallet = function(x, y, size) {
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

Physics.prototype.update = function(delta) {
  if (!this.lastTs) this.lastTs = Date.now();

  this.delta = Date.now() - this.lastTs;

  this.world.Step(this.delta / 1000, this.velocityIterations, this.positionIterations);

  this.lastTs = Date.now();
}

Physics.prototype.getPositions = function() {
  return { puck: this.puckBody.GetPosition(), p1: this.p1Body.GetPosition(), p2: this.p2Body.GetPosition() };
}

Physics.prototype.getUpdateObject = function() {
  var p1 = this.puckBody.GetPosition()
    , lv1 = this.puckBody.GetLinearVelocity()
    , a1 = this.puckBody.GetAngle()
    , av1 = this.puckBody.GetAngularVelocity()
    , mjt1 = this.p1MouseJoint.GetTarget()
    , mjt2 = this.p2MouseJoint.GetTarget();

  return [
     p1.x, p1.y, a1, lv1.x, lv1.y, av1, // 0, 1, 2, 3, 4, 5
     mjt1.x, mjt1.y, mjt2.x, mjt2.y   // 6, 7, 8, 9
  ];
}

Physics.prototype.setFromUpdateObject = function(updateObj) {
  this.puckBody.SetPositionAndAngle(new b2Vec2(updateObj[0], updateObj[1]), updateObj[2]);
  this.puckBody.SetLinearVelocity(new b2Vec2(updateObj[3], updateObj[4]));
  this.puckBody.SetAngularVelocity(updateObj[5]);

  this.p1MouseJoint.SetTarget(new b2Vec2(updateObj[6], updateObj[7]));
  this.p2MouseJoint.SetTarget(new b2Vec2(updateObj[8], updateObj[9]));
}

Physics.prototype.updatePositionP1 = function(updateObj) {
  var target = { x: (updateObj.x * this.width), y: (this.height/2) + ((updateObj.y * this.height) * 0.5) };

  this.p1MouseJoint.SetTarget(target);
}

Physics.prototype.updatePositionP2 = function(updateObj) {
  var target = { x: (updateObj.x * this.width), y: (this.height/2) + ((updateObj.y * this.height) * 0.5) };

  this.p2MouseJoint.SetTarget(target);
}

module.exports = Physics;
