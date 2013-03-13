console = {
  log: function() {
    self.postMessage({ event: 'console.log', arguments: arguments });
  }
}

var Physics = require('../common/physics');

var physics = new Physics();

physics.init();

physics.on('puckContact', function() {
  self.postMessage({ event: 'puckContact', arguments: [] });
});

setInterval(function() {
  physics.update();
}, 1000/60);


setInterval(function() {
  self.postMessage({ event: 'physicsUpdate', arguments: [physics.getPositions(), physics.getUpdateObject()] });
}, 1000/45);

self.addEventListener('message', function(e) {

  switch (e.data.event) {
    case 'updatePositionP1':
      physics.updatePositionP1(e.data.arguments[0]);
      break;

    case 'updatePositionP2':
      physics.updatePositionP2(e.data.arguments[0]);
      break;

    case 'setFromUpdateObject':
      physics.setFromUpdateObject(e.data.arguments[0]);
      break;
  }
});
