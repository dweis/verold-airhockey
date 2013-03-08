var _ = require('underscore')
  , Physics = require('../common/physics')
  , UI = require('./ui')
  , TweenedCamera = require('./cameras/tweened');

GameClient = function(veroldApp) {
  this.puckEntityId = '513014602fdccc0200000565';
  this.p1PaddleEntityId = '51389aca11cbac0200000951';
  this.p2PaddleEntityId = '5138995dc41a4a0200001923';
  this.tableEntityId = '5130146e21d650020000011b';
  this.surfaceMeshId = '5130146e21d6500200000121';

  this.veroldApp = veroldApp;
  this.mainScene = undefined;
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
  this.forceThreeMaterials = false;
  this.threeMaterials = false;
}

GameClient.prototype.useThreeMaterials = function() {
  var that = this
    , meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

  if (!this.threeMaterials) {
    _.each(meshes, function(mesh) {
      var materialId = mesh.entityModel.get('payload').material || mesh.getSourceObject().entityModel.get('payload').material
        , materialAsset = that.assetRegistry.getAsset(materialId)
        , materialData = (materialAsset && materialAsset.entityModel.get('payload')) || {}
        , parentObjectId = (mesh.getParentObject && mesh.getParentObject().id) || 'ground'
        , params = {};

      params.color = materialData.diffuseColor || 0xff00ff;
      params.ambient = 0x555555;

      if (materialData.diffuseTexture) {
        var textureAsset = that.assetRegistry.getAsset(materialData.diffuseTexture);

        params.map = textureAsset.threeData;
      }

      mesh.threeData.originalMaterial = mesh.threeData.material;
      mesh.threeData.material = new THREE.MeshLambertMaterial(params);
    });

    if (this.mainScene.threeData.ground) {
      this.mainScene.threeData.ground.originalMaterial = this.mainScene.threeData.ground.material;
      this.mainScene.threeData.ground.material = new THREE.MeshLambertMaterial({ color: 0x555555 });
    }

    this.threeMaterials = true;
  }
}

GameClient.prototype.restoreMaterials = function() {
  var that = this
    , meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

  if (!this.forceThreeMaterials && this.threeMaterials) {
    _.each(meshes, function(mesh) {
      if (mesh.threeData.originalMaterial) {
        mesh.threeData.material = mesh.threeData.originalMaterial;
      }
    });

    this.mainScene.threeData.ground.material = this.mainScene.threeData.ground.originalMaterial;

    this.threeMaterials = false;
  }
}

GameClient.prototype.toggleMaterials = function() {
  if (this.threeMaterials) {
    this.restoreMaterials();
  } else {
    this.useThreeMaterials();
  }
}

GameClient.prototype.initScene = function(scene) {
  var that = this
    , models = scene.getAllObjects( { "filter" :{ "model" : true }});

  this.mainScene = window.mainScene = scene;
  this.assetRegistry = this.veroldApp.getAssetRegistry();

  if (this.forceThreeMaterials) {
    this.useThreeMaterials();
  }

  // hide progress indicator
  this.veroldApp.hideLoadingProgress();

  this.inputHandler = this.veroldApp.getInputHandler();
  this.renderer = this.veroldApp.getRenderer();
  this.picker = this.veroldApp.getPicker();

  this.p1Paddle = models[this.p1PaddleEntityId];
  this.p2Paddle = models[this.p2PaddleEntityId];
  this.table = models[this.tableEntityId];
  this.puck = models[this.puckEntityId];
  this.surface = mainScene.getObject(this.surfaceMeshId);

  //Create the camera
  this.camera = new TweenedCamera(this.table.threeData);
  this.camera.setSpectatorView();

  //Tell the engine to use this camera when rendering the scene.
  this.veroldApp.setActiveCamera( this.camera.getCamera() );
}

GameClient.prototype.initSockets = function() {
  var that = this;

  this.socket = io.connect();

  this.socket.on('inactive', function() { 
    that.camera.setSpectatorView();
    that.mode = 'spectator';
  });

  this.socket.on('update', function() {
    that.socketUpdate.apply(that, arguments); 
  });

  this.socket.on('active', function(data) {
    if (data.player == 'p1') {
      that.camera.setPlayer1View();
      that.mode = 'p1';
    } else if (data.player == 'p2') {
      that.camera.setPlayer2View();
      that.mode = 'p2';
    }
  });
}

GameClient.prototype.initInput = function() {
  this.veroldApp.on('keyDown', this.onKeyPress, this);
  this.veroldApp.on('mouseUp', this.onMouseUp, this);
  this.veroldApp.on('mouseMove', this.onMouseMove, this);
  this.veroldApp.on('update', this.update, this );
  this.veroldApp.on('fixedUpdate', this.fixedUpdate, this );

  document.addEventListener("touchmove", $.proxy(this.onTouchMove, this), true);
}

GameClient.prototype.initUI = function() {
  this.ui = new UI({ socket: this.socket });

  this.ui.init();
}

GameClient.prototype.socketUpdate = function(updateObj) {
  var realUpdate = _.clone(updateObj)
    , current = this.physics.getUpdateObject();

  if (this.mode == 'p1') {
    realUpdate[6] = current[6];
    realUpdate[7] = current[7];
  } else if (this.mode == 'p2') {
    realUpdate[8] = current[8];
    realUpdate[9] = current[9];
  }

  this.physics.setFromUpdateObject(realUpdate);
}

GameClient.prototype.detectCapabilities = function() {
  var ua = navigator.userAgent.toLowerCase();

  if (ua.indexOf('android') >= 0) {
    //this.forceThreeMaterials = true;
    this.useShadows = false;
  } else if (ua.match(/ipad|iphone|ipod/g)) {
    this.forceThreeMaterials = true;
    this.useShadows = false;
  }
}

GameClient.prototype.initPhysics = function() {
  this.physics = new Physics();
  this.physics.init();
}

GameClient.prototype.startup = function() {
  var that = this;

  this.detectCapabilities();

  this.veroldApp.getRenderer().shadowMapEnabled = this.useShadows;

  //this.veroldApp.getRenderer().shadowMapEnabled = true;
  //this.veroldApp.getRenderer().shadowMapType = THREE.BasicShadowMap;

	this.veroldApp.loadScene( null, {
    success_hierarchy: function( scene ) {
      that.initScene(scene);
      that.initInput();
      that.initSockets();
      that.initPhysics();
      that.initUI();
    },

    progress: function(sceneObj) {
      var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
      that.veroldApp.setLoadingProgress(percent);
    }
  });
}

GameClient.prototype.shutdown = function() {
  this.veroldApp.off('keyDown', this.onKeyPress, this);
  this.veroldApp.off('mouseUp', this.onMouseUp, this);
  this.veroldApp.off('mouseMove', this.onMouseMove, this);
  this.veroldApp.off('update', this.update, this );
  this.veroldApp.off('fixedUpdate', this.fixedUpdate, this);
}

GameClient.prototype.update = function( delta ) {
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

GameClient.prototype.fixedUpdate = function( delta ) {
  this.physics.update();
  this.camera.update();
}

GameClient.prototype.onMouseUp = function( event ) {
  if ( event.button == this.inputHandler.mouseButtons[ "left" ] &&
    !this.inputHandler.mouseDragStatePrevious[ event.button ] ) {

    var mouseX = event.sceneX / this.veroldApp.getRenderWidth();
    var mouseY = event.sceneY / this.veroldApp.getRenderHeight();
    var pickData = this.picker.pick( this.mainScene.threeData, this.camera.getCamera(), mouseX, mouseY );
    if ( pickData ) {
      //Bind 'pick' event to an asset or just let user do this how they want?
      if ( pickData.meshID == "51125eb50a4925020000000f") {
        //Do stuff
      }
    }
  }
}

GameClient.prototype.onMouseMove = function(event) {
  if (this.mode == 'p1' || this.mode == 'p2') {
    var vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
    this.projector.unprojectVector( vector, this.camera.getCamera() );
    var raycaster = new THREE.Raycaster( this.camera.getCamera().position, vector.sub( this.camera.getCamera().position ).normalize() );

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

GameClient.prototype.onTouchMove = function(event){
  event.preventDefault();
  var touches = event.changedTouches, first = touches[0];

  this.onMouseMove({ clientX: first.clientX, clientY: first.clientY });
}

GameClient.prototype.onKeyPress = function( event ) {
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

module.exports = GameClient;
