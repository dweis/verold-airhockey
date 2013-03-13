var events = require('events')
  , Physics = require('../../common/physics')

function PhysicsWorkerProxy() {
  this.lastUpdate = 0;
}

PhysicsWorkerProxy.prototype = new events.EventEmitter;

PhysicsWorkerProxy.prototype.init = function() {
  var that = this;

  console.log('Initializing phyics worker proxy');

  this.worker = new Worker('/javascripts/worker.js');

  this.worker.postMessage('init');
  this.worker.addEventListener('message', function(e) {
    switch(e.data.event) {
      case 'puckContact':
        that.emit('puckContact');
        break;
      case 'physicsUpdate':
        that.positions = e.data.arguments[0];
        that.updateObject = e.data.arguments[1];
        break;
      case 'console.log':
        console.log(e.data.arguments);
        break;
    }
  });
}

PhysicsWorkerProxy.prototype.updatePositionP1 = function() {
  var ts = Date.now();

  if (ts - this.lastUpdate > 1000 / 60) {
    this.lastUpdate = Date.now();
    this.worker.postMessage({ event: 'updatePositionP1', arguments: arguments });
  }
}

PhysicsWorkerProxy.prototype.updatePositionP2 = function() {
  var ts = Date.now();

  if (ts - this.lastUpdate > 1000 / 60) {
    this.lastUpdate = Date.now();
    this.worker.postMessage({ event: 'updatePositionP2', arguments: arguments });
  }
}

PhysicsWorkerProxy.prototype.setFromUpdateObject = function() {
  this.worker.postMessage({ event: 'setFromUpdateObject', arguments: arguments });
}

PhysicsWorkerProxy.prototype.getUpdateObject = function() {
  return this.updateObject;
}

PhysicsWorkerProxy.prototype.getPositions = function() {
  return this.positions;
}

module.exports = PhysicsWorkerProxy;
