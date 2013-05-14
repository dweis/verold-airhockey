var TWEEN = require('tween');

var TweenedCamera = function(targetObj) {
  this.targetObj = targetObj;

  this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.1, 10000 );
  this.camera.up.set( 0, 1, 0 );
  this.camera.position.set( -1.0, 1.8, 0 );

  this.lookAt = new THREE.Vector3();
  this.lookAt.add(targetObj.center);
  this.lookAt.multiply(targetObj.scale);
  this.lookAt.applyQuaternion(targetObj.quaternion);
  this.lookAt.add(targetObj.position);
};

TweenedCamera.prototype.getCamera = function() {
  return this.camera;
};

TweenedCamera.prototype.setSpectatorView = function() {
  this.tweenTo({ x: -1.0, y: 1.8, z: 0 });
};

TweenedCamera.prototype.setPlayer1View = function() {
  this.tweenTo({ x: 0, y: 1.5, z: -1.25 });
};

TweenedCamera.prototype.setPlayer2View = function() {
  this.tweenTo({ x: 0, y: 1.5, z: 1.25 });
};

TweenedCamera.prototype.tweenTo = function(position) {
  var that = this,
      to = { x: position.x * 1000, y: position.y * 1000, z: position.z * 1000 },
      from = { x: this.camera.position.x * 1000, y: this.camera.position.y * 1000, z: this.camera.position.z * 1000 };

  var tween = new TWEEN.Tween(from)
    .to(to, 1500)
    .easing(TWEEN.Easing.Elastic.InOut)
    .onUpdate(function() {
      that.camera.position.set(from.x / 1000, from.y / 1000, from.z / 1000);
      that.camera.lookAt(that.lookAt);
    })
    .start();

  this.tween = tween;
};

TweenedCamera.prototype.update = function() {
  if (this.tween) {
    TWEEN.update();
  }
};

module.exports = TweenedCamera;
