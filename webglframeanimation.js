/* Copyright Sborka Project         */
/* http://sborkaproject.com         */
/* Created by Hauts                 */
/* If u want to use it - contact me */

//****************************
// WebGLFrameAnimation (Experimental WebGL animation renderer)
var WebGLFrameAnimation = FrameAnimation.extend(CanvasFrameAnimation, function(element, path, totalFrames, settings){
    var element = FrameAnimation.utils.getDOMElement(element);
    if(element == null){
        FrameAnimation.error("Not a DOM element passed to WebGLFrameAnimation: " + element);
        return;
    }

    this._name = "WebGLFrameAnimation";
    this._version = WebGLFrameAnimation.version;

    this._available = WebGLFrameAnimation.available();
    this.element = element;
    this._elementStyle = this.element.style;
    this.element.webGLFrameAnimation = this;

    var settings = settings || {};
    this._init(settings);

    if(this.element.tagName.toLowerCase() != "canvas"){
        FrameAnimation.error("Usupported element for WebGLFrameAnimation: " + element);
        return;
    }
    
    this._gl = WebGLFrameAnimationUtils.create3DContext( element )
    if(!this._gl){
        FrameAnimation.error("Unable to start WebGL rendering of element " + this.element);
        if(typeof settings.fallback == "function"){
            settings.fallback();
        }
    } else {
        this._available = true;
    }
    this._uploadedCounter = 0;
    this._imageLoadedRatio = 0;
    this._textureUploadRatio = 0;
    this._uploadDelayTime = 1000 / 60;
    this._nextUploadTime = 0;

    if(this._available){
        this._textures = [];
        this._initGL( this._gl );
        this._initFramesAnimation(path, totalFrames, settings)
    }
})
WebGLFrameAnimation.available = function(){
    if(!this._availabilityTested){
        this._availabilityTested = true;
        this._available = WebGLFrameAnimationUtils.checkAvailability() ? true : false;
    }
    return this._available;
}
WebGLFrameAnimation.prototype.available = function(){
    return this._available;
}
WebGLFrameAnimation.create = function(path, totalFrames, settings){
    return new WebGLFrameAnimation(document.createElement("canvas"), path, totalFrames, settings)
}
WebGLFrameAnimation.prototype._onBeforeReadyUpdate = function(delta){
    // Do nothing
}
WebGLFrameAnimation.prototype._imageLoadedHandler = function( image, index ){
    this._loadedCounter++;
    this._imageLoadedRatio = this._loadedCounter / this._totalFrames;
    this._updateProgress( );

    var currentTime = (new Date()).getTime();
    var delta = currentTime - this._nextUploadTime
    var lastImage = this._loadedCounter == this._totalFrames;

    if(delta > 0){
        this._nextUploadTime = currentTime + this._uploadDelayTime;
        this._uploadTexture( image , 0, index, lastImage);
    } else {
        this._nextUploadTime += this._uploadDelayTime;
        this._uploadTexture( image , -delta , index, lastImage);
    }
}
WebGLFrameAnimation.prototype._updateProgress = function( ){
    var progress = (this._textureUploadRatio + this._imageLoadedRatio) / 2;
    if(typeof this._loadingCallback == "function"){
        this._loadingCallback.apply(this, [progress, this._imageLoadedRatio, this._textureUploadRatio])
    }        
}
WebGLFrameAnimation.prototype._uploadTexture = function( image, delay, index, callReady ){
    var self = this;
    setTimeout(function(){

        var texture = self._gl.createTexture();
        self._gl.bindTexture(self._gl.TEXTURE_2D, texture);
        self._gl.texImage2D(self._gl.TEXTURE_2D, 0, self._gl.RGBA, self._gl.RGBA, self._gl.UNSIGNED_BYTE, image);
        
        self._gl.texParameteri(self._gl.TEXTURE_2D, self._gl.TEXTURE_WRAP_S, self._gl.CLAMP_TO_EDGE);
        self._gl.texParameteri(self._gl.TEXTURE_2D, self._gl.TEXTURE_WRAP_T, self._gl.CLAMP_TO_EDGE);
        self._gl.texParameteri(self._gl.TEXTURE_2D, self._gl.TEXTURE_MIN_FILTER, self._gl.NEAREST);
        self._gl.texParameteri(self._gl.TEXTURE_2D, self._gl.TEXTURE_MAG_FILTER, self._gl.NEAREST);

        self._textures[index] = texture;

        self._uploadedCounter++;
        self._textureUploadRatio = self._uploadedCounter / self._totalFrames;
        self._updateProgress();

        if(callReady){
            self._ready = true;
            self._launchCallback( self._readyCallback )
        }

    }, delay )
}    
WebGLFrameAnimation.prototype._initGL = function( gl ){
    var vertexShaderSource = "attribute vec2 a_position;" + "\n";
        vertexShaderSource += "attribute vec2 a_texCoord;" + "\n";
        vertexShaderSource += "uniform vec2 u_resolution;" + "\n";
        vertexShaderSource += "varying vec2 v_texCoord;" + "\n";
        vertexShaderSource += "void main() {" + "\n";
        vertexShaderSource += "  vec2 zeroToOne = a_position / u_resolution;" + "\n";
        vertexShaderSource += "  vec2 zeroToTwo = zeroToOne * 2.0;" + "\n";
        vertexShaderSource += "  vec2 clipSpace = zeroToTwo - 1.0;" + "\n";
        vertexShaderSource += "  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);" + "\n";
        vertexShaderSource += "  v_texCoord = a_texCoord;" + "\n";
        vertexShaderSource += "}" + "\n";

    var fragmentShaderSource = "precision mediump float;" + "\n";
        fragmentShaderSource += "uniform sampler2D u_image;" + "\n";
        fragmentShaderSource += "varying vec2 v_texCoord;" + "\n";
        fragmentShaderSource += "void main() {" + "\n";
        fragmentShaderSource += "  gl_FragColor = texture2D(u_image, v_texCoord);" + "\n";
        fragmentShaderSource += "}" + "\n";


    var vertexShader = WebGLFrameAnimationUtils.loadShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
    var fragmentShader = WebGLFrameAnimationUtils.loadShader(gl, fragmentShaderSource, gl.FRAGMENT_SHADER);

    this._program = WebGLFrameAnimationUtils.createProgram(gl, [vertexShader, fragmentShader]);
    gl.useProgram(this._program);

    this._positionLocation = gl.getAttribLocation(this._program, "a_position");
    this._texCoordLocation = gl.getAttribLocation(this._program, "a_texCoord");

    var texCoordBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([ 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]), gl.STATIC_DRAW);

    gl.enableVertexAttribArray(this._texCoordLocation);
    gl.vertexAttribPointer(this._texCoordLocation, 2, gl.FLOAT, false, 0, 0);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(this._positionLocation);
    gl.vertexAttribPointer(this._positionLocation, 2, this._gl.FLOAT, false, 0, 0);

    var resolutionLocation = gl.getUniformLocation(this._program, "u_resolution");

    gl.uniform2f( resolutionLocation, this.element.width, this.element.height);
}
WebGLFrameAnimation.prototype._render = function( prevFrame, newFrame ){
    this._gl.bindTexture(this._gl.TEXTURE_2D, this._textures[newFrame]);
    WebGLFrameAnimationUtils.setRectangle(this._gl, 0, 0, this.element.width, this.element.height);
    this._gl.drawArrays(this._gl.TRIANGLES, 0, 6);
}
WebGLFrameAnimation.prototype.die = function(){
    // TODO: Clear references
    this._die();
}    
var WebGLFrameAnimationUtils = {
    checkAvailability : function(){
        // http://stackoverflow.com/questions/11871077/proper-way-to-detect-webgl-support
        try{
            var canvas = document.createElement( 'canvas' ); 
            return !!window.WebGLRenderingContext && ( canvas.getContext( 'webgl' ) || canvas.getContext( 'experimental-webgl' ) );
        } catch ( e ) {
            return false;
        }
    },        
    create3DContext : function(canvas, attributes) {
        var names = ["webgl", "experimental-webgl"];
        var context = null;
        for (var ii = 0; ii < names.length; ++ii) {
            try {
                context = canvas.getContext(names[ii], attributes);
            } catch(e){}
            if (context) {
                break;
            }
        }
        return context;
    },
    loadShader : function(gl, shaderSource, shaderType, errorCallback) {
        var errFn = errorCallback || FrameAnimation.error;
        var shader = gl.createShader(shaderType);
        gl.shaderSource(shader, shaderSource);
        gl.compileShader(shader);
        var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
        if (!compiled) {
            lastError = gl.getShaderInfoLog(shader);

            FrameAnimation.error("Error compiling shader '" + shader + "':" + lastError);

            gl.deleteShader(shader);
            return null;
        }
        return shader;
    },
    createProgram : function(gl, shaders, attributes, locations) {
        var program = gl.createProgram();
        for (var i = 0; i < shaders.length; ++i) {
            gl.attachShader(program, shaders[i]);
        }
        if (attributes) {
            for (var i = 0; i < attributes.length; ++i) {
                gl.bindAttribLocation( program, locations ? locations[i] : i, attributes[i] );
            }
        }
        gl.linkProgram(program);

        var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
        if (!linked) {
            lastError = gl.getProgramInfoLog(program);

            FrameAnimation.error("Error in program linking:" + lastError);

            gl.deleteProgram(program);
            return null;
        }
        return program;
    },
    setRectangle : function(gl, x, y, width, height) {
        var x1 = x;
        var x2 = x + width;
        var y1 = y;
        var y2 = y + height;
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([x1, y1, x2, y1, x1, y2, x1, y2, x2, y1, x2, y2]), gl.STATIC_DRAW);
    } 
}
WebGLFrameAnimation.version = 1.9;
window.WebGLFrameAnimation = WebGLFrameAnimation;

// Extra: jQuery plugins
if( window.jQuery && window.jQuery.fn ){
    (function($) {
        $.fn.webGLFrameAnimation = function( path, totalFrames, settings, initMethod ) {
            var totalElements = this.length;
            for(var k=0; k<totalElements; k++){
                var $element = this.eq(k);
                var animation = new WebGLFrameAnimation($element[0], path, totalFrames, settings)
                $element.data("webGLFrameAnimation", animation);
                if(typeof initMethod == 'function'){
                    initMethod(this[k], animation)
                }
            }
            return this;
        };
    }( jQuery ));
}