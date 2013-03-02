MyApp = function( veroldApp ) {
  this.puckEntityId = '513014602fdccc0200000565';
  this.p1PaddleEntityId = '513014612fdccc0200000567';
  this.p2PaddleEntityId = '51301584427fe90200000751';
  this.tableEntityId = '5130146e21d650020000011b';

  this.veroldApp = veroldApp;
  this.mainScene = undefined;
  this.camera = undefined;
  this.p1Paddle = undefined;
  this.p2Paddle = undefined;
  this.puck = undefined;
  this.table = undefined;

  this.width = window.innerWidth;
  this.height = window.innerHeight;

  this.tableWidth = 1.25;
  this.tableHeight = 2.5;

  this.mode = 'spectator';
}

MyApp.prototype.setSpectatorView = function() {
  this.camera.position.set( -1.0, 1.8, 0 );
  this.lookAtTable();
  this.mode = 'spectator';
}

MyApp.prototype.setPlayer1View = function() {
  this.camera.position.set( 0, 1.6, -1.15 );
  this.lookAtTable();
  this.mode = 'p1';
}

MyApp.prototype.setPlayer2View = function() {
  this.camera.position.set( 0, 1.6, 1.15 );
  this.lookAtTable();
  this.mode = 'p2';
}

MyApp.prototype.lookAtTable = function() {
  var lookAt = new THREE.Vector3();
  lookAt.add( this.table.threeData.center );
  lookAt.multiply( this.table.threeData.scale );
  lookAt.applyQuaternion( this.table.threeData.quaternion );
  lookAt.add( this.table.threeData.position );

  this.camera.lookAt( lookAt );
}

MyApp.prototype.initScene = function(scene) {
  var that = this;

  // hide progress indicator
  this.veroldApp.hideLoadingProgress();

  this.inputHandler = this.veroldApp.getInputHandler();
  this.renderer = this.veroldApp.getRenderer();
  this.picker = this.veroldApp.getPicker();

  //Bind to input events to control the camera
  this.veroldApp.on("keyDown", this.onKeyPress, this);
  this.veroldApp.on("mouseUp", this.onMouseUp, this);
  this.veroldApp.on("mouseMove", this.onMouseMove, this);
  this.veroldApp.on("update", this.update, this );

  //Store a pointer to the scene
  this.mainScene = scene;

  var models = this.mainScene.getAllObjects( { "filter" :{ "model" : true }});

  var lights = this.mainScene.getAllObjects( { "filter" : { "light" : true }});

  this.mainScene.removeChildObject(lights[_.keys(lights)[1]]);
  //this.mainScene.removeChildObject(lights[_.keys(lights)[2]]);
  this.mainScene.removeChildObject(lights[_.keys(lights)[3]]);

  this.p1Paddle = models[this.p1PaddleEntityId];
  this.p2Paddle = models[this.p2PaddleEntityId];
  this.table = models[this.tableEntityId];
  this.puck = models[this.puckEntityId];

  //Create the camera
  this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.1, 10000 );
  this.camera.up.set( 0, 1, 0 );
  this.setSpectatorView();

  //Tell the engine to use this camera when rendering the scene.
  this.veroldApp.setActiveCamera( this.camera );

  this.socket = io.connect();

  this.socket.on('update', function() { that.socketUpdate.apply(that, arguments); });
  this.socket.on('goal', function() { alert('goal'); });
  this.socket.on('active', function(data) {
    if (data.player == 'p1') {
      that.setPlayer1View();
    } else if (data.player == 'p2') {
      that.setPlayer2View();
    }
  });
}

MyApp.prototype.socketUpdate = function(updateObj) {
  var that = this;
  var translate = function(obj, x, y, angle) {
    obj.threeData.position.x = (x - (that.tableWidth * 0.5)) * 0.71;
    obj.threeData.position.z = (y - (that.tableHeight * 0.5)) * 0.72;
  }

  if (this.table) {
    translate(this.puck, updateObj[0], updateObj[1]);
    translate(this.p1Paddle, updateObj[2], updateObj[3]);
    translate(this.p2Paddle, updateObj[4], updateObj[5]);
  }
}

MyApp.prototype.startup = function() {
  var that = this;

	this.veroldApp.loadScene( null, {
    success_hierarchy: function( scene ) {
      that.initScene(scene);
    },

    progress: function(sceneObj) {
      var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
      that.veroldApp.setLoadingProgress(percent);
    }
  });
}

MyApp.prototype.shutdown = function() {
  this.veroldApp.off("keyDown", this.onKeyPress, this);
  this.veroldApp.off("mouseUp", this.onMouseUp, this);
  this.veroldApp.off("mouseMove", this.onMouseMove, this);
  this.veroldApp.off("update", this.update, this );
}

MyApp.prototype.update = function( delta ) {
}

MyApp.prototype.onMouseUp = function( event ) {
  if ( event.button == this.inputHandler.mouseButtons[ "left" ] &&
    !this.inputHandler.mouseDragStatePrevious[ event.button ] ) {

    var mouseX = event.sceneX / this.veroldApp.getRenderWidth();
    var mouseY = event.sceneY / this.veroldApp.getRenderHeight();
    var pickData = this.picker.pick( this.mainScene.threeData, this.camera, mouseX, mouseY );
    if ( pickData ) {
      //Bind 'pick' event to an asset or just let user do this how they want?
      if ( pickData.meshID == "51125eb50a4925020000000f") {
        //Do stuff
      }
    }
  }
}

MyApp.prototype.onMouseMove = function(event) {
  if (this.mode == 'p1' || this.mode == 'p2') {
    var minX = this.width / 3
      , maxX = this.width - (this.width / 3)
      , minY = (this.height / 4)
      , maxY = this.height - (this.height / 4)
      , rangeX = maxX - minX
      , rangeY = maxY - minY
      , x = event.clientX
      , y = event.clientY
      , targetX
      , targetY
      , update;

    if (x > maxX) x = maxX;
    if (x < minX) x = minX;
    if (y > maxY) y = maxY;
    if (y < minY) y = minY;

    targetX = ((x - minX) / rangeX);
    targetY = ((y - minY) / rangeY);

    update = { x: targetX, y: targetY };

    this.socket.emit('position', update);
  }
}

MyApp.prototype.onKeyPress = function( event ) {
	var keyCodes = this.inputHandler.keyCodes;
  if ( event.keyCode === keyCodes['B'] ) {
    var that = this;
    this.boundingBoxesOn = !this.boundingBoxesOn;
    var scene = veroldApp.getActiveScene();

    scene.traverse( function( obj ) {
      if ( obj.isBB ) {
        obj.visible = that.boundingBoxesOn;
      }
    });
  }
}
