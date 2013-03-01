function VeroldApp( properties ) {
  this.el = undefined;

  this.veroldEngine = undefined;

}

VeroldApp.prototype = {
  // DOM element

  constructor: VeroldApp,

  // Options:
  //  container - the container that WebGL will be rendered into.
  //  projectId - the ID of the project whose assets will be used by this app.
  //  mainUpdateFunction - the function to call every frame
  //  mainProgramContext - the context to use when calling the mainUpdateFunction (probably 'this')
  //  enablePostProcess - true or false - enables the THREE.JS post process chain.
  //  clearColor - sets the clear color of the renderer.
  initialize: function( options ) {

    //Get the container element to use for WebGL.
    var el;
    if ( !!options.container ) {
      el = options.container;
    }
    else {
      el = $("<div>").css({ "height" : "100%", "width": "100%"}).appendTo("body");
      
    }

    var that = this;


    //Get the project assets from the given project ID.
    //If it's not passed in, get a default project.
    options.projectId;
    VAPI.loadProject( options.projectId, function( param1, project, entities ) {

      //Create the Verold Engine from the given information.
      that.veroldEngine = new VAPI.VeroldEngine( { 
        "engineName" : "Default", 
        "el" : el
      });

      that.defaultSceneID = project.get("entityId");

      that.veroldEngine.on( "resize", that.onResize, that );

      window.addEventListener( 'resize', function() {
        that.veroldEngine.trigger('resize');
      } );
      
      that.veroldEngine.initialize( {
        "entities": arguments[2], 
        "mainProgramContext" : that, 
        "mainUpdateFunction" : that.update,
        "handleInput" : options.handleInput,
        "projectId" : options.projectId, 
        "enablePostProcess" : options.enablePostProcess,
        "enablePicking" : options.enablePicking,
        "clearColor" : options.clearColor ? options.clearColor : 0x000000,
        // "isWritable" : this.isWritable,
        // "isEmbedded" : this.isEmbedded,
      });

      //Call callback passed into the boiler plate
      if ( options.success ) options.success();
    });

  },

  uninitialize: function() {

    this.veroldEngine.off( "resize", this.onResize, this );
    this.veroldEngine.uninitialize();
    this.veroldEngine = undefined;

  },

  on: function( eventName, callback, context ) {
    if (this.veroldEngine) {
      this.veroldEngine.on( eventName, callback, context );
    }
    else {
      console.warn("VeroldApp.on() called before the application has been initialized. Call initialize() first.")
    }
  },

  off: function( eventName, callback ) {
    if (this.veroldEngine) {
      this.veroldEngine.off( eventName, callback );
    }
    else {
      console.warn("VeroldApp.off() called before the application has been initialized. Call initialize() first.")
    }
  },

  trigger: function( eventName, parameter ) {
    if (this.veroldEngine) {
      this.veroldEngine.trigger( eventName, parameter );
    }
    else {
      console.warn("VeroldApp.trigger() called before the application has been initialized. Call initialize() first.")
    }
  },

  // Events
  onResize: function() {
    
    if (this.veroldEngine) {
      this.veroldEngine.onResize();
    }
  },

  getAssetRegistry: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.assetRegistry;
    }
    else {
      console.warn("VeroldApp.getAssetRegistry() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  //Return the main THREE.WebGLRenderer
  getRenderer: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.Renderer.renderer;
    }
    else {
      console.warn("VeroldApp.getRenderer() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  //If post-processing is enabled, return the main THREE.EffectComposer with this method.
  getEffectComposer: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.Renderer.renderSceneComposer;
    }
    else {
      console.warn("VeroldApp.getEffectComposer() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getPicker: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.geometryPicker;
    }
    else {
      console.warn("VeroldApp.getPicker() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getInputHandler: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.Input;
    }
    else {
      console.warn("VeroldApp.getInputHandler() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getActiveCamera: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.getActiveCamera();
    }
    else {
      console.warn("VeroldApp.getActiveCamera() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  setActiveCamera: function( camera ) {
    if ( this.veroldEngine ) {
      this.veroldEngine.setActiveCamera( camera );
    }
    else {
      console.warn("VeroldApp.setActiveCamera() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getActiveScene: function() {
    if (this.veroldEngine) {
      return this.veroldEngine.getActiveScene().threeData;
    }
    else {
      console.warn("VeroldApp.getActiveScene() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  loadScene: function( sceneID, options ) {
    if ( this.veroldEngine ) {
      if ( sceneID ) {
        this.veroldEngine.loadScene( sceneID, options );
      }
      //Otherwise, get the default scene and load it.
      else {
        this.veroldEngine.loadScene( this.defaultSceneID, options );
      }
    }
    else {
      console.warn("VeroldApp.loadScene() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getRenderWidth: function() {
    if ( this.veroldEngine ) {
      return this.veroldEngine.Renderer.getWidth();
    }
    else {
      console.warn("VeroldApp.getRenderWidth() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  getRenderHeight: function() {
    if ( this.veroldEngine ) {
      return this.veroldEngine.Renderer.getHeight();
    }
    else {
      console.warn("VeroldApp.getRenderHeight() called before the application has been initialized. Call initialize() first.")
      return null;
    }
  },

  loadScript: function(path, callback) {
    var head= document.getElementsByTagName('head')[0];
    var script= document.createElement('script');
    script.type= 'text/javascript';
    script.src= path
    head.appendChild(script);
    script.onload = callback;
  },

  setLoadingProgress : function(percent) {
    if(!this.loadingProgress) {
      this.createLoadingProgress();
    }
    this.loadingProgress.setProgress(percent); 
  },

  hideLoadingProgress : function() {
    if(!this.loadingProgress) {
      this.createLoadingProgress();
    }
    this.loadingProgress.hide(); 
  },

  createLoadingProgress: function() {
    var LoadingProgress = function() {
      this.progressContainer = $('#loading-progress-container');
      this.progressIndicator = this.progressContainer.find('.loading-progress div');
    };

    LoadingProgress.prototype.setProgress = function(percent) {
      this.progressIndicator.css({width:percent+'%'});
    };

    LoadingProgress.prototype.hide = function() {
      this.progressContainer.hide();
    };

    this.loadingProgress = new LoadingProgress();
  },

  hasGL : (function() {
    try {
      return !!window.WebGLRenderingContext && !! document.createElement('canvas').getContext('experimental-webgl');
    } catch (e) {
      return false;
    }
  })(),

  webGLsupported : function() {
    if(!this.hasGL) {
      this.hideLoadingProgress();
      var unsupportedUI = $('#webGLunsupported');
      unsupportedUI.show();
      return false;
    } else {
      return true;
    }
  }
}
