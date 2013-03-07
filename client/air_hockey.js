var _ = require('underscore')
  , GoalView = require('./ui/views/goal')
  , PlayerModel = require('./ui/models/player')
  , PlayerView = require('./ui/views/player')
  , PlayerSetupView = require('./ui/views/player_setup')
  , MenuView = require('./ui/views/menu')
  , SpectatorsCollection = require('./ui/collections/spectators')
  , SpectatorsView = require('./ui/views/spectators')
  , Physics = require('../common/physics');

AirHockey = function(veroldApp) {
  this.puckEntityId = '513014602fdccc0200000565';
  this.p1PaddleEntityId = '513014612fdccc0200000567';
  this.p2PaddleEntityId = '51301584427fe90200000751';
  this.tableEntityId = '5130146e21d650020000011b';
  this.surfaceMeshId = '5130146e21d6500200000121';

  this.veroldApp = veroldApp;
  this.mainScene = undefined;
  this.camera = undefined;
  this.projector = new THREE.Projector();
  this.p1Paddle = undefined;
  this.p2Paddle = undefined;
  this.puck = undefined;
  this.table = undefined;
  this.surface = undefined;

  this.width = window.innerWidth;
  this.height = window.innerHeight;

  this.tableWidth = 1.25;
  this.tableHeight = 2.5;

  this.mode = 'spectator';

  this.useShadows = true;
  this.forceLowQuality = false;
  this.lowQuality = false;

  this.touching = false;

  this.physics = new Physics();
}

AirHockey.prototype.setSpectatorView = function() {
  this.camera.position.set( -1.0, 1.8, 0 );
  this.lookAtTable();
  this.mode = 'spectator';
}

AirHockey.prototype.setPlayer1View = function() {
  this.camera.position.set( 0, 1.6, -1.15 );
  this.lookAtTable();
  this.mode = 'p1';
}

AirHockey.prototype.setPlayer2View = function() {
  this.camera.position.set( 0, 1.6, 1.15 );
  this.lookAtTable();
  this.mode = 'p2';
}

AirHockey.prototype.lookAtTable = function() {
  var lookAt = new THREE.Vector3();
  lookAt.add( this.table.threeData.center );
  lookAt.multiply( this.table.threeData.scale );
  lookAt.applyQuaternion( this.table.threeData.quaternion );
  lookAt.add( this.table.threeData.position );

  this.camera.lookAt( lookAt );
}

AirHockey.prototype.useLowQualityMaterials = function() {
  var that = this
    , meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

  if (!this.lowQuality) {
    _.each(meshes, function(mesh) {
      var materialId = mesh.getSourceObject().entityModel.get('payload').material;
      var materialAsset = that.assetRegistry.getAsset(materialId);
      var materialData = (materialAsset && materialAsset.entityModel.get('payload')) || {};
      var parentObjectId = (mesh.getParentObject && mesh.getParentObject().id) || 'ground';
      var params = {};

      params.color = materialData.diffuseColor;
      params.ambient = 0x000000;
      //if (materialAsset.threeData.map) {
        //params.map = materialAsset.threeData.map;
      //}

      mesh.threeData.originalMaterial = mesh.threeData.material;
      mesh.threeData.material = new THREE.MeshLambertMaterial(params);
    });

    this.mainScene.threeData.ground.originalMaterial = this.mainScene.threeData.ground.material;
    this.mainScene.threeData.ground.material = new THREE.MeshLambertMaterial({ color: 0x555555 });

    this.lowQuality = true;
  }
}

AirHockey.prototype.restoreMaterials = function() {
  var that = this
    , meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

  if (!this.forceLowQuality && this.lowQuality) {
    _.each(meshes, function(mesh) {
      if (mesh.threeData.originalMaterial) {
        mesh.threeData.material = mesh.threeData.originalMaterial;
      }
    });

    this.mainScene.threeData.ground.material = this.mainScene.threeData.ground.originalMaterial;

    this.lowQuality = false;
  }
}

AirHockey.prototype.toggleMaterials = function() {
  if (this.lowQuality) {
    this.restoreMaterials();
  } else {
    this.useLowQualityMaterials();
  }
}

AirHockey.prototype.initScene = function(scene) {
  var that = this
    , models = scene.getAllObjects( { "filter" :{ "model" : true }})
    , lights = scene.getAllObjects( { "filter" : { "light" : true }});

  this.mainScene = window.mainScene = scene;
  this.assetRegistry = this.veroldApp.getAssetRegistry();

  this.physics.init();

  if (this.forceLowQuality) {
    this.useLowQualityMaterials();
  }
  //this.toggleMaterials();

  // hide progress indicator
  this.veroldApp.hideLoadingProgress();

  this.inputHandler = this.veroldApp.getInputHandler();
  this.renderer = this.veroldApp.getRenderer();
  this.picker = this.veroldApp.getPicker();

  //Bind to input events to control the camera
  this.veroldApp.on('keyDown', this.onKeyPress, this);
  this.veroldApp.on('mouseUp', this.onMouseUp, this);
  this.veroldApp.on('mouseMove', this.onMouseMove, this);
  this.veroldApp.on('update', this.update, this );
  this.veroldApp.on('fixedUpdate', this.fixedUpdate, this );

  document.addEventListener("touchmove", $.proxy(this.onTouchMove, this), true);

  scene.removeChildObject(lights[_.keys(lights)[1]]);
  //scene.removeChildObject(lights[_.keys(lights)[2]]);
  scene.removeChildObject(lights[_.keys(lights)[3]]);

  this.p1Paddle = models[this.p1PaddleEntityId];
  this.p2Paddle = models[this.p2PaddleEntityId];
  this.table = models[this.tableEntityId];
  this.puck = models[this.puckEntityId];
  this.surface = mainScene.getObject(this.surfaceMeshId);

  //Create the camera
  this.camera = new THREE.PerspectiveCamera( 70, this.width / this.height, 0.1, 10000 );
  this.camera.up.set( 0, 1, 0 );
  this.setSpectatorView();

  //Tell the engine to use this camera when rendering the scene.
  this.veroldApp.setActiveCamera( this.camera );

  this.socket = io.connect();

  this.socket.on('inactive', function() { alert('You have been booted due to inactivity'); });
  this.socket.on('update', function() { that.socketUpdate.apply(that, arguments); });
  this.socket.on('goal', function(net) { 
    var goalView = new GoalView({ model: (net == 1) ? that.p2View.model : that.p1View.model });

    setTimeout(function() {
      goalView.remove();
    }, 1000);
  });
  this.socket.on('active', function(data) {
    if (data.player == 'p1') {
      that.setPlayer1View();
    } else if (data.player == 'p2') {
      that.setPlayer2View();
    }
  });

  this.socket.on('initialUsers', function(initialUsers) {
    if (initialUsers.p1) {
      that.p1View.model.set(initialUsers.p1);
    }
    if (initialUsers.p2) {
      that.p2View.model.set(initialUsers.p2);
    }
    _.each(initialUsers.spectators, function(playerInfo) {
      that.spectatorsCollection.add(new PlayerModel(playerInfo));
    });
  });

  this.socket.on('p1', function(playerInfo) {
    if (playerInfo) {
      that.p1View.model.set(playerInfo);
    } else {
      that.p1View.model.set({ name: '', gravatarHash: '', score: 0 });
    }
  });

  this.socket.on('p2', function(playerInfo) {
    if (playerInfo) {
      that.p2View.model.set(playerInfo);
    } else {
      that.p2View.model.set({ name: '', gravatarHash: '', score: 0 });
    }
  });

  this.socket.on('spectatorAdd', function(playerInfo) {
    that.spectatorsCollection.add(new PlayerModel(playerInfo));
  });

  this.socket.on('spectatorRemove', function(playerInfo) {
    _.each(that.spectatorsCollection.models,function(model) {
      if (model.get('uuid') == playerInfo.uuid) {
        that.spectatorsCollection.remove(model);
      }
    });
  });

  this.socket.on('score', function(score) {
    if (score[0] != that.p1View.model.get('score')) {
      that.p1View.model.set('score', score[0]);
    }
    if (score[1] != that.p2View.model.get('score')) {
      that.p2View.model.set('score', score[1]);
    }
  });
}

AirHockey.prototype.initUI = function() {
  var that = this;

  this.spectatorsCollection = new SpectatorsCollection();
  this.p1View = new PlayerView({ el: '#player1', socket: this.socket });
  this.p2View = new PlayerView({ el: '#player2', socket: this.socket });
  this.spectatorsView = new SpectatorsView({ collection: this.spectatorsCollection, socket: this.socket });

  this.playerSetupView = new PlayerSetupView({ socket: this.socket });
  this.menuView = new MenuView({ playerSetupView: this.playerSetupView });

  this.socket.on('connect', function() {
    that.playerSetupView.show();
  });
}

AirHockey.prototype.socketUpdate = function(updateObj) {
  this.physics.setFromUpdateObject(updateObj);
}

AirHockey.prototype.detectCapabilities = function() {
  var ua = navigator.userAgent.toLowerCase();

  if (ua.indexOf('android') >= 0) {
    this.forceLowQuality = true;
    this.useShadows = false;
  } else if (ua.match(/ipad|iphone|ipod/g)) {
    this.forceLowQuality = true;
    this.useShadows = false;
  }
}

AirHockey.prototype.startup = function() {
  var that = this;

  this.detectCapabilities();

  this.veroldApp.getRenderer().shadowMapEnabled = this.useShadows;

  //this.veroldApp.getRenderer().shadowMapEnabled = true;
  //this.veroldApp.getRenderer().shadowMapType = THREE.BasicShadowMap;

	this.veroldApp.loadScene( null, {
    success_hierarchy: function( scene ) {
      that.initScene(scene);
      that.initUI();
    },

    progress: function(sceneObj) {
      var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
      that.veroldApp.setLoadingProgress(percent);
    }
  });
}

AirHockey.prototype.shutdown = function() {
  this.veroldApp.off('keyDown', this.onKeyPress, this);
  this.veroldApp.off('mouseUp', this.onMouseUp, this);
  this.veroldApp.off('mouseMove', this.onMouseMove, this);
  this.veroldApp.off('update', this.update, this );
  this.veroldApp.off('fixedUpdate', this.fixedUpdate, this);
}

AirHockey.prototype.update = function( delta ) {
  var that = this;
  var translate = function(obj, x, y, angle) {
    obj.threeData.position.x = (x - (that.tableWidth * 0.5)) * 0.71;
    obj.threeData.position.z = (y - (that.tableHeight * 0.5)) * 0.71;
  }

  //var updateObj = this.physics.getUpdateObject();
  var positions = this.physics.getPositions();

  if (this.table) {
    translate(this.puck, positions.puck.x, positions.puck.y);
    translate(this.p1Paddle, positions.p1.x, positions.p1.y);
    translate(this.p2Paddle, positions.p2.x, positions.p2.y);
  }
}

AirHockey.prototype.fixedUpdate = function( delta ) {
  this.physics.update(1/60);
}

AirHockey.prototype.onMouseUp = function( event ) {
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

AirHockey.prototype.onMouseMove = function(event) {
  if (this.mode == 'p1' || this.mode == 'p2') {
    var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
    this.projector.unprojectVector( vector, this.camera );
    var raycaster = new THREE.Raycaster( this.camera.position, vector.sub( this.camera.position ).normalize() );

    var intersects = raycaster.intersectObjects([this.surface.threeData])
    var x, y;

    if (intersects[0]) {
      var pos = {
        x: (this.tableWidth / 2) + intersects[0].point.x
      , y: intersects[0].point.z };

      if (this.mode == 'p1') {
        pos.x -= 0.1;
        pos.y -= 0.1;
        pos.y = (pos.y <= 0) ? pos.y : 0;

        this.physics.updatePositionP1(pos);
      } else {
        pos.x -= 0.1;
        pos.y += 0.1;
        pos.y = (pos.y >= 0) ? pos.y : 0;

        this.physics.updatePositionP2(pos);
      }

      this.socket.emit('position', pos);
    }
  }
}

AirHockey.prototype.onTouchMove = function(event){
  event.preventDefault();
  var touches = event.changedTouches, first = touches[0];

  this.onMouseMove({ clientX: first.clientX, clientY: first.clientY });
}

AirHockey.prototype.onKeyPress = function( event ) {
	var keyCodes = this.inputHandler.keyCodes;
  if ( event.keyCode === keyCodes['B'] ) {
    var that = this;
    this.boundingBoxesOn = !this.boundingBoxesOn;
    var scene = this.veroldApp.getActiveScene();

    scene.traverse( function( obj ) {
      if ( obj.isBB ) {
        obj.visible = that.boundingBoxesOn;
      }
    });
  } else if (event.keyCode == keyCodes['M'] ) {
    this.toggleMaterials();
  }
}

module.exports = AirHockey;
