var _ = require('underscore'),
    Physics = require('../common/physics'),
    UI = require('./ui'),
    TweenedCamera = require('./cameras/tweened'),
    buzz = require('../vendor/buzz'),
    $ = require('jquery-browser');

var GameClient = window.VAPI.VeroldApp.extend({
  initialize: function() {
    this.puckEntityId = '513014602fdccc0200000565';
    this.p1PaddleEntityId = '51389aca11cbac0200000951';
    this.p2PaddleEntityId = '5138995dc41a4a0200001923';
    this.tableEntityId = '5130146e21d650020000011b';
    this.surfaceMeshId = '5130146e21d6500200000121';

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

    this.puckVelocity = new THREE.Vector3();

    this.positionDirty = false;
  },

  useThreeMaterials: function() {
    var that = this,
        meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

    if (!this.threeMaterials) {
      _.each(meshes, function(mesh) {
        var materialId = mesh.entityModel.get('payload').material || mesh.getSourceObject().entityModel.get('payload').material,
            materialAsset = that.assetRegistry.getAsset(materialId),
            materialData = (materialAsset && materialAsset.entityModel.get('payload')) || {},
            params = {};

        params.color = materialData.diffuseColor || 0xff00ff;
        params.ambient = 0x555555;

        if (materialData.diffuseTexture) {
          params.map = that.textureAsset.threeData;
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
  },

  initPuckMaterial: function() {
    console.log('initializing puck materials');

    var puck_vs = require('./shaders/puck.vert'),
        puck_fs = require('./shaders/puck.frag');

    var puckMat = new THREE.ShaderMaterial( {
      uniforms: {
        uVelocity: { type: 'v3', value: new THREE.Vector3(0, 0, 0) }
      },
      vertexShader: puck_vs,
      fragmentShader: puck_fs
    } );

    this.puck.traverse(function(obj) {
      if (obj instanceof MeshObject) {
        obj.load({ success: function(mesh) {
          mesh.threeData.material = puckMat;
        }});
      }
    });
  },

  restoreMaterials: function() {
    var meshes = this.mainScene.getAllObjects( { "filter" : { "mesh": true }});

    if (!this.forceThreeMaterials && this.threeMaterials) {
      _.each(meshes, function(mesh) {
        if (mesh.threeData.originalMaterial) {
          mesh.threeData.material = mesh.threeData.originalMaterial;
        }
      });

      this.mainScene.threeData.ground.material = this.mainScene.threeData.ground.originalMaterial;

      this.threeMaterials = false;
    }
  },

  toggleMaterials: function() {
    if (this.threeMaterials) {
      this.restoreMaterials();
    } else {
      this.useThreeMaterials();
    }
  },

  initScene: function(scene) {
    var models = scene.getAllObjects( { "filter" :{ "model" : true }});

    this.mainScene = scene;

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
    this.surface = this.mainScene.getObject(this.surfaceMeshId);

    //Create the camera
    this.camera = new TweenedCamera(this.table.threeData);
    this.camera.setSpectatorView();

    //Tell the engine to use this camera when rendering the scene.
    this.veroldApp.setActiveCamera( this.camera.getCamera() );

    var material = new THREE.MeshBasicMaterial({ color: 0xcc000 });
    var planeGeo = new THREE.PlaneGeometry( 5.0, 1.75, 1, 1 );
    planeGeo.applyMatrix( new THREE.Matrix4().makeRotationX( - Math.PI / 2 ) );
    planeGeo.computeTangents();

    this.mousePlane = new THREE.Mesh(planeGeo, material);
    this.mousePlane.position.y = 0.81;
    this.mousePlane.visible = false;

    scene.threeData.add(this.mousePlane);

    this.initPuckMaterial();
  },

  initSockets: function() {
    var that = this;

    this.socket = window.io.connect();

    this.socket.on('inactive', function() {
      that.camera.setSpectatorView();
      that.mode = 'spectator';
    });

    this.socket.on('update', function() {
      that.socketUpdate.apply(that, arguments);
    });

    this.socket.on('active', function(data) {
      if (data.player === 'p1') {
        that.camera.setPlayer1View();
        that.mode = 'p1';
      } else if (data.player === 'p2') {
        that.camera.setPlayer2View();
        that.mode = 'p2';
      }
    });

    setInterval(function() {
      that.fixedUpdate();
    }, 1000/60);

    setInterval(function() {
      if (that.positionDirty) {
        that.socket.emit('position', that.dirtyPosition);
        that.positionDirty = false;
      }
    }, 1000/30);
  },

  initInput: function() {
    this.veroldApp.on('keyDown', this.onKeyPress, this);
    this.veroldApp.on('mouseMove', this.onMouseMove, this);
    this.veroldApp.on('update', this.update, this );

    document.addEventListener('touchmove', $.proxy(this.onTouchMove, this), true);
  },

  initUI: function() {
    this.ui = new UI({ socket: this.socket });

    this.ui.init();
  },

  socketUpdate: function(updateObj) {
    var realUpdate = _.clone(updateObj),
        current = this.physics.getUpdateObject();

    if (this.mode === 'p1') {
      realUpdate[6] = current[6];
      realUpdate[7] = current[7];
    } else if (this.mode === 'p2') {
      realUpdate[8] = current[8];
      realUpdate[9] = current[9];
    }

    this.physics.setFromUpdateObject(realUpdate);
  },

  detectCapabilities: function() {
    var ua = navigator.userAgent.toLowerCase();

    if (ua.indexOf('android') >= 0) {
      //this.forceThreeMaterials = true;
      this.forceThreeMaterials = true;
      this.useShadows = false;
    } else if (ua.match(/ipad|iphone|ipod/g)) {
      //this.forceThreeMaterials = true;
      this.forceThreeMaterials = true;
      this.useShadows = false;
    } else if (ua.match(/bb10/g)) {
      this.forceThreeMaterials = true;
      this.useShadows = false;
    }
  },

  initPhysics: function() {
    this.physics = new Physics();
    this.physics.init();
  },

  initAudio: function() {
    var that = this;

    this.thump = new buzz.sound('/sounds/164585__adam-n__thump-1', { formats: [ 'mp3' ] });
    this.thump.setVolume(90);

    this.fanfare = new buzz.sound('/sounds/156515__jobro__hockey-fanfare-1', { formats: [ 'mp3' ] });
    this.fanfare.setVolume(10);

    this.horn = new buzz.sound('/sounds/170825__santino-c__sirene-horn', { formats: [ 'mp3' ] });
    this.horn.setVolume(100);

    this.physics.on('puckContact', function() {
      that.thump.stop();
      that.thump.play();
    });

    this.socket.on('goal', function() {
      that.horn.stop();
      that.horn.play();
    });

    this.socket.on('active', function() {
      //that.fanfare.stop();
      //that.fanfare.play();
    });
  },

  startup: function() {
    var that = this;

    this.detectCapabilities();

    this.veroldApp.getRenderer().shadowMapEnabled = this.useShadows;

    //this.veroldApp.getRenderer().shadowMapType = THREE.BasicShadowMap;

    this.veroldApp.loadScene( null, {
      success_hierarchy: function( scene ) {
        that.assetRegistry = that.veroldApp.getAssetRegistry();

        that.textureAsset = that.assetRegistry.getAsset('5130145701395c872300058a');

        that.textureAsset.load({ success: function() {
          that.initScene(scene);
          that.initInput();
          that.initSockets();
          that.initPhysics();
          that.initUI();
          that.initAudio();
        }});
      },

      progress: function(sceneObj) {
        var percent = Math.floor((sceneObj.loadingProgress.loaded_hierarchy / sceneObj.loadingProgress.total_hierarchy)*100);
        that.veroldApp.setLoadingProgress(percent);
      }
    });
  },

  shutdown: function() {
    this.veroldApp.off('keyDown', this.onKeyPress, this);
    this.veroldApp.off('mouseMove', this.onMouseMove, this);
    this.veroldApp.off('update', this.update, this );
  },

  translateObj: function(obj, x, y) {
    obj.threeData.position.x = (x - (this.tableWidth * 0.5)) * 0.71;
    obj.threeData.position.z = (y - (this.tableHeight * 0.5)) * 0.71;
  },

  update: function() {
    var that = this,
        puckVelocity;

    var positions = this.physics.getPositions();

    if (this.table) {
      puckVelocity = this.physics.getPuckVelocity();
      this.puckVelocity.set(puckVelocity.x, 0, puckVelocity.y);

      this.puck.traverse(function(obj) {
        if (obj instanceof MeshObject) {
          obj.threeData.material.uniforms.uVelocity.value = that.puckVelocity;
        }
      });

      this.translateObj(this.puck, positions.puck.x, positions.puck.y, true);
      this.translateObj(this.p1Paddle, positions.p1.x, positions.p1.y, this.mode === 'p1' ? false : true);
      this.translateObj(this.p2Paddle, positions.p2.x, positions.p2.y, this.mode === 'p2' ? false : true);
    }

    if (this.camera) {
      this.camera.update();
    }
  },

  fixedUpdate: function() {
    this.physics.update();
  },

  onMouseMove: function(event) {
    var vector, raycaster, intersects, pos;

    if (this.mode === 'p1' || this.mode === 'p2') {
      vector = new THREE.Vector3( ( event.clientX / window.innerWidth ) * 2 - 1, - ( event.clientY / window.innerHeight ) * 2 + 1, 0.5 );
      this.projector.unprojectVector( vector, this.camera.getCamera() );
      raycaster = new THREE.Raycaster( this.camera.getCamera().position, vector.sub( this.camera.getCamera().position ).normalize() );

      intersects = raycaster.intersectObjects(/*[this.surface.threeData]*/ [this.mousePlane]);

      if (intersects[0]) {
        pos = {
          x: (this.tableWidth / 2) + intersects[0].point.x,
          y: intersects[0].point.z
        };

        if (this.mode === 'p1') {
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

        this.positionDirty = true;
        this.dirtyPosition = pos;
      }
    }
  },

  onTouchMove: function(event){
    event.preventDefault();

    var touches = event.changedTouches, first = touches[0];

    this.onMouseMove({ clientX: first.clientX, clientY: first.clientY });
  },

  onKeyPress: function(event) {
    var keyCodes = this.inputHandler.keyCodes;
    if (event.keyCode === keyCodes.B) {
      var that = this;
      this.boundingBoxesOn = !this.boundingBoxesOn;
      var scene = this.veroldApp.getActiveScene();

      scene.traverse( function( obj ) {
        if ( obj.isBB ) {
          obj.visible = that.boundingBoxesOn;
        }
      });
    } else if (event.keyCode === keyCodes.M) {
      this.toggleMaterials();
    }
  }
});

module.exports = GameClient;
