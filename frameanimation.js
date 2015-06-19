/* Copyright Sborka Project         */
/* http://sborkaproject.com         */
/* Created by Hauts                 */
/* If u want to use it - contact me */

;(function(window) {
    var FrameAnimation = function() {
        this._name = "FrameAnimation"
    }
    FrameAnimation.prototype._init = function(settings) {
        var settings = settings || {};

        this._direction = 1;
        this._realFrame = this._roundFrame = this._maxRepeats = this._totalFrames = this._renderedFrame = 0;
        this._prerenderUpdated = this._ready = this._playing = false;

        this._stopFrames = [];
        this._frameCallbacks = [];

        this.alwaysRender(settings.alwaysRender || false)
        this.useUpdateSpeed(settings.useUpdateSpeed || false);

        this.fps(typeof settings.fps == "number" ? settings.fps : 31);

        this._id = FrameAnimation._addInstance(this);
        this._name += "#" + this._id;
    }
    FrameAnimation.prototype._die = function() {
        this._frameCallbacks = this._stopFrames = null;
        FrameAnimation._removeInstance(this)
    }
    FrameAnimation.prototype.die = function() {
        this._die();
    }
    FrameAnimation.prototype.useUpdateSpeed = function(state) {
        if (typeof state == "undefined") {
            return this._useUpdateSpeed;
        }
        this._useUpdateSpeed = state ? true : false;
        return this;
    }
    FrameAnimation.prototype.alwaysRender = function(state) {
        if (typeof state == "undefined") {
            return this._alwaysRender;
        }
        this._alwaysRender = state ? true : false;
        return this;
    }
    FrameAnimation.prototype.addStopFrame = function(frame) {
        this._stopFrames[frame - 1] = true;
        return this;
    }
    FrameAnimation.prototype.removeStopFrame = function(frame) {
        this._stopFrames[frame - 1] = false;
        return this;
    }
    FrameAnimation.prototype.removeStopFrames = function(frames) {
        var totalFrames = frames.length;
        for (var k = 0; k < totalFrames; k++) {
            this.removeStopFrame(frames[k])
        }
        return this;
    }
    FrameAnimation.prototype.removeAllStopFrames = function() {
        this._stopFrames = [];
        return this;
    }
    FrameAnimation.prototype.setStopFrames = function(frames) {
        this._stopFrames = frames.concat();
        return this;
    }
    FrameAnimation.prototype.getStopFrames = function() {
        return this._stopFrames.concat();
    }
    FrameAnimation.prototype.fps = function(value) {
        if (typeof value == "number") {
            this._fps = value > 999999 ? 999999 : (value < 0.001 ? 0.001 : value);
            this._frameTime = 1000 / value;
            this._frameTime = this._frameTime < Number.MIN_VALUE ? Number.MIN_VALUE : this._frameTime;
            return this;
        }
        return this._fps;
    }
    FrameAnimation.prototype.stop = function() {
        this._playing = false;
        this._realFrame = this._roundFrame;
        this._update(0);
        return this;
    }
    FrameAnimation.prototype.play = function(direction) {
        this._playing = true;
        this._realFrame = this._roundFrame;
        this.direction(direction)
        return this;
    }
    FrameAnimation.prototype.playing = function() {
        return this._playing;
    }
    FrameAnimation.prototype.toggle = function() {
        this._playing ? this.stop() : this.play();
        return this;
    }
    FrameAnimation.prototype.direction = function(value) {
        if (typeof value == "number") {
            this._direction = value > 0 ? 1 : -1;
            return this;
        }
        return this._direction == 1;
    }
    FrameAnimation.prototype.flip = function() {

        var dx = this._direction > 0 ? ( 1 + this._realFrame - this._roundFrame ) : ( 1 - (this._realFrame - this._roundFrame - 1) );

        this._realFrame = this._roundFrame + this._direction;

        this._realFrame += (this._direction > 0 ? (1 - dx) : dx );

        this._direction *= -1;
   
        return this;
    }
    FrameAnimation.prototype.gotoAndPlay = function(frame, direction) {
        frame = this._limitFrame(frame - 1)
        this.direction(direction)

        this._realFrame = this._roundFrame = frame - this._direction;
        
        this._playing = true;

        return this;
    }
    FrameAnimation.prototype.gotoAndStop = function(frame) {
        frame = this._limitFrame(frame - 1)
        this._realFrame = this._roundFrame = frame;
        
        this._playing = true;
        this._update(0);

        this._playing = false;


        return this;
    }
    FrameAnimation.prototype.addFrameCallback = function(frame, callback, repeats) {
        var frame = frame - 1;
        if (typeof this._frameCallbacks[frame] == "undefined") {
            this._frameCallbacks[frame] = [];
        }
        this._frameCallbacks[frame].push({callback : callback, repeats: repeats || -1});
        return this;
    }
    FrameAnimation.prototype.addFramesCallback = function(frames, callback, repeats) {
        var totalFrames = frames.length;
        for (var k = 0; k < totalFrames; k++) {
            this.addFrameCallback(frames[k], callback, repeats )
        }
        return this;
    }
    FrameAnimation.prototype.removeFrameCallback = function(frame, callback) {
        var frame = frame - 1;
        if (!this._frameCallbacks[frame]) {
            return this;
        }
        var callbacks = this._frameCallbacks[frame]
        var totalCallbacks = callbacks.length;
        for (var k = 0; k < totalCallbacks; k++) {
            if (callbacks[k].callback === callback) {
                callbacks.splice(k, 1)
                return this;
            }
        }
        return this;
    }
    FrameAnimation.prototype.removeFrameCallbacks = function(frame) {
        this._frameCallbacks[frame - 1] = [];
        return this;
    }
    FrameAnimation.prototype.removeAllFrameCallbacks = function() {
        this._frameCallbacks = [];
        return this;
    }
    FrameAnimation.prototype.totalFrames = function() {
        return this._totalFrames;
    }
    FrameAnimation.prototype.currentFrame = function() {
        return this._roundFrame + 1;
    }
    FrameAnimation.prototype._update = function(delta, counter) {
        if (!this._playing || !this._ready) {
            this._updateDebug();

            var callBeforeRender = !this._ready;
            if (this._alwaysRender) {
                if(this._ready){
                    this._render(this._renderedFrame, this._roundFrame);
                    callBeforeRender = false;
                }
            }
            if(callBeforeRender){
                this._onBeforeReadyUpdate( delta );
            }
            return;
        }
        if (this._useUpdateSpeed) {
            delta = this._frameTime * 0.999;
        }

        delta = FrameAnimation._useExtraFrames ? delta : Math.min(this._frameTime, delta);
        var addTime = delta;
        if (addTime > this._frameTime) {
            addTime = this._frameTime;
            delta -= this._frameTime;
        }

        this._realFrame += addTime * this._direction / this._frameTime;
        this._realFrame = this._normalizeFrame(this._realFrame);
        this._roundFrame = this._normalizeFrame((this._realFrame << 0) + this._direction);

        this._checkFrameActions(this._roundFrame);

        if (FrameAnimation._useExtraFrames) {
            if (this._maxRepeats < counter) {
                this._maxRepeats = counter;
            }
            var dx = delta - this._frameTime;
            if (dx > 0) {
                if (counter < FrameAnimation._maxFrameRepeats) {
                    counter++;
                    return this._update(dx, counter);
                }
            }
        }

        if(!this._prerenderUpdated){
            this._prerenderUpdated = true;
            if(!this._useUpdateSpeed){
                this._update(0);
                return;
            }
        }       

        if (this._renderedFrame != this._roundFrame || this._alwaysRender) {

            this._render(this._renderedFrame, this._roundFrame);
            this._renderedFrame = this._roundFrame;
            this._updateDebug();
            this._prerenderUpdated = false;
               
            this._launchCallback(this.onRender) 
        }
    }
    FrameAnimation.prototype._updateDebug = function() {
        if (this._debug) {
            this._debugInfo = "FrameAnimation v" + FrameAnimation.version + "<br>";
            this._debugInfo += this._name + " #" + this._id + " v" + this._version + "<br>";
            this._debugInfo += this._fps.toFixed(2) + " | " + this._frameTime.toFixed(2) + " | " + this._realFrame.toFixed(2) + " | " + this._renderedFrame + "<br>";
            this._debugInfo += "max repeats: " + this._maxRepeats + "<br>";
            this._debugInfo += "total frames: " + this._totalFrames + "<br>";
            this._debugInfo += "fps: " + FrameAnimation.fps().toFixed(2) + "<br>";;
            this._debugInfo += "use RAF: " + FrameAnimation._usingRAF + "<br>";
            this._debugInfo += "use update speed: " + this._useUpdateSpeed + "<br>";
            this._debugInfo += "force3D: " + this._force3D;
            this._applyDebugInfo(this._debugInfo)
        }
    }
    FrameAnimation.prototype._applyDebugInfo = function(debugInfo){}
    FrameAnimation.prototype._render = function(prevFrame, newFrame){}
    FrameAnimation.prototype._onBeforeReadyUpdate = function(delta){}
    FrameAnimation.prototype._checkFrameActions = function(frame, skipBackFrame) {
        if(!skipBackFrame){
            if(this._checkedCallbacksFrame == frame){
                return;
            }
            this._checkedCallbacksFrame = frame;
        }
        if (this._stopFrames[frame]) {
            this.stop();
        }
        if (typeof this._frameCallbacks[frame] != "undefined") {
            var callbacks = this._frameCallbacks[frame];
            var totalCallbacks = callbacks.length;
            var removeCallbacks = [];
            for (var k = 0; k < totalCallbacks; k++) {
                var callbackObject = callbacks[k];
                callbackObject.callback.apply(this);

                if(callbackObject.repeats > 0){
                    callbackObject.repeats --;
                    if(callbackObject.repeats == 0){
                        removeCallbacks.push( callbackObject )
                    }
                }

            }
            var totalRemoveCallbacks = removeCallbacks.length;
            for(var k=0; k<totalRemoveCallbacks; k++){
                this.removeFrameCallback(frame + 1, removeCallbacks[k].callback);
            }
        }
        if(!skipBackFrame){
            var backframe = -(this._totalFrames - frame) - 1;
            this._checkFrameActions( backframe, true );
        }
    }
    FrameAnimation.prototype._normalizeFrame = function(frame) {
        frame = (frame > this._totalFrames ? (frame - this._totalFrames) : (frame < 0 ? (this._totalFrames + frame) : frame )) % this._totalFrames;
        return frame;
    }
    FrameAnimation.prototype._limitFrame = function(frame) {
        frame = (frame > this._totalFrames - 1) ? (this._totalFrames - 1) : (frame < 0 ? 0 : frame )
        return frame;
    }
    FrameAnimation.prototype._launchCallback = function(callback, args) {
        typeof callback == "function" ? callback.apply(this, args || []) : null;
    }


    //****************************
    // Utils
    FrameAnimation.utils = {};
    FrameAnimation.utils.log = function(msg) {
        if (window.console && window.console.log) {
            window.console.log(msg);
        }
    };
    FrameAnimation.utils.error = function(msg) {
        if (window.console) {
            if (window.console.error) {
                window.console.error(msg);
            } else if (window.console.log) {
                window.console.log(msg);
            }
        }
    };    
    FrameAnimation.utils.isArray = function(testArray) {
        return Object.prototype.toString.call(testArray) == "[object Array]";
    }
    FrameAnimation.utils.isIE = function() {
        var myNav = navigator.userAgent.toLowerCase();
        return (myNav.indexOf("msie") != -1) ? parseInt(myNav.split("msie")[1]) : false;
    }
    FrameAnimation.utils.isElement = function(obj) {
        try {
            return obj instanceof HTMLElement;
        } catch (e) {
            return (typeof obj === "object") && (obj.nodeType === 1) && (typeof obj.style === "object") && (typeof obj.ownerDocument === "object");
        }
    }
    FrameAnimation.utils.getDOMElement = function(query) {
        if (FrameAnimation.utils.isElement(query)) {
            return query;
        }
        if (typeof query == "string") {
            if (typeof document.querySelectorAll != "undefined") {
                return document.querySelectorAll(query)[0];
            } else if (query.substr(0, 1) == "#") {
                return document.getElementById(query.substr(1, query.length - 1));
            } else if (query.substr(0, 1) == "."){
                return document.getElementsByClassName(query.substr(1, query.length - 1))[0];
            }
        } else {
            if(FrameAnimation.utils.isElement(query[0])){
                return query[0];
            }
        }
        return null;
    }
    FrameAnimation.utils.getCSSValue = function(value) {
        return typeof value == "undefined" ? "0px" : (isNaN(Number("" + value)) ? value : value + "px");
    }
    FrameAnimation.utils.rightNow = function() {
        if (window['performance'] && window['performance']['now']) {
            return window['performance']['now']();
        } else {
            return +(new Date());
        }
    }


    //****************************
    // Core    
    FrameAnimation._addInstance = function(instance) {
        this._instances.push(instance);
        return this._instances.length - 1;
    }
    FrameAnimation._removeInstance = function(instance) {
        this._instances.splice(instance._id, 1);
        return instance;
    }
    FrameAnimation.stop = function() {
        this._playing = false;
        return this;
    }
    FrameAnimation.start = function() {
        this._playing = true;
        return this;
    }
    FrameAnimation._init = function() {
        if (this._inited) {
            return;
        }
        this._playing = true;

        this._updateCallbacks = [];

        this._fpsStats = [];
        this._fps = 0;
        this._timeScale = 1;
        this._stableSkipFrames = 5; // Wait first 5 frames before start render
        this._useExtraFrames = true;
        this._maxFrameDelta = 500;
        this._maxDelta = 500;
        this._maxFrameRepeats = 100;

        this._inited = this._usingRAF = true;
        this._instances = [];

        // requestAnimationFrame polyfill by Erik Möller.
        // fixes from Paul Irish and Tino Zijdel
        var lastTime = 0;
        var vendors = ["ms", "moz", "webkit", "o"];
        for (var x = 0; x < vendors.length && !window.requestAnimationFrame; ++x) {
            window.requestAnimationFrame = window[vendors[x] + "RequestAnimationFrame"];
            window.cancelAnimationFrame = window[vendors[x] + "CancelAnimationFrame"] || window[vendors[x] + "CancelRequestAnimationFrame"];
        }
        if (!window.requestAnimationFrame) {
            window.requestAnimationFrame = function(callback) {
                //var currTime = new Date().getTime();
                var currTime = FrameAnimation.utils.rightNow();
                var timeToCall = Math.max(0, 16 - (currTime - lastTime));
                var id = window.setTimeout(function() {
                    callback(currTime + timeToCall);
                }, timeToCall);
                lastTime = currTime + timeToCall;
                return id;
            };
            this._usingRAF = false;
        }
        if (!window.cancelAnimationFrame) {
            window.cancelAnimationFrame = function(id) {
                clearTimeout(id);
            };
        }
        var self = this;
        this._updateShim = function(timer) {
            self._update(timer)
        }
        window.requestAnimationFrame(this._updateShim);
    }
    FrameAnimation.extend = function(from, module) {
        if (typeof module == "undefined") {
            module = function(){}
        }
        for (var i in from.prototype) {
            module.prototype[i] = from.prototype[i];
        }
        return module;
    }
    FrameAnimation._update = function(timer) {
        if (this._prevTimer && this._playing) {
            var delta = (timer - this._prevTimer) << 0;
            var frameFPS = (1000 / delta);
            this._fpsStats.push(frameFPS);
            if (this._fpsStats.length > 10) {
                this._fpsStats.splice(0, 1);
            }
            var totalStats = this._fpsStats.length;
            var middleFps = 0;
            for (var k = 0; k < totalStats; k++) {
                middleFps += this._fpsStats[k];
            }
            middleFps = middleFps / totalStats;
            this._fps += (middleFps - this._fps) / 5;
            delta = delta * this._timeScale;
            delta = delta > this._maxDelta ? this._maxDelta : delta;

            if (this._stableSkipFrames > 0) {
                this._stableSkipFrames--;
            } else {
                var totalInstances = this._instances.length;
                var deltaSteps = this._useExtraFrames ? (delta / this._maxFrameDelta) << 0 : 0;
                var subDelta = delta - (this._maxFrameDelta * deltaSteps);
                for (var k = 0; k < totalInstances; k++) {
                    var instance = this._instances[k];
                    for (var j = 0; j < deltaSteps; j++) {
                        this._instances[k]._update(this._maxFrameDelta, 0)
                    }
                    instance._update(subDelta, 0)
                }
            }
        }
        this._prevTimer = timer;
        this._callUpdateCallbacks();
        window.requestAnimationFrame(this._updateShim);
    }
    FrameAnimation.fps = function() {
        return this._fps;
    }
    FrameAnimation.timeScale = function(value) {
        if (typeof value == "undefined") {
            return this._timeScale;
        }
        this._timeScale = value;
        return this;
    }
    FrameAnimation.maxFrameRepeats = function(value) {
        if (typeof value == "number") {
            this._maxFrameRepeats = value;
            return this;
        }
        return this._maxFrameRepeats;
    }
    FrameAnimation.maxFrameDelta = function(value) {
        if (typeof value == "number") {
            this._maxFrameDelta = value;
            return this;
        }
        return this._maxFrameDelta;
    }
    FrameAnimation.maxDelta = function(value) {
        if (typeof value == "number") {
            this._maxDelta = value;
            return this;
        }
        return this._maxDelta;
    }

    FrameAnimation.useExtraFrames = function(value) {
        if (typeof value != "undefined") {
            this._useExtraFrames = value;
            return this;
        }
        return this._useExtraFrames;
    }
    FrameAnimation.addUpdateCallback = function(callback) {
        this.removeUpdateCallback(callback)
        this._updateCallbacks.push(callback);
        return this;
    }
    FrameAnimation.removeUpdateCallback = function(callback) {
        var totalCallbacks = this._updateCallbacks.length;
        for (var k = 0; k < totalCallbacks; k++) {
            if (callback === this._updateCallbacks[k]) {
                this._updateCallbacks.splice(k, 1);
                return this;
            }
        }
        return this;
    }
    FrameAnimation._callUpdateCallbacks = function() {
        var totalCallbacks = this._updateCallbacks.length;
        for (var k = 0; k < totalCallbacks; k++) {
            var callback = this._updateCallbacks[k];
            callback();
        }
        return this;
    }


    //****************************
    // CanvasFrameAnimation
    var CanvasFrameAnimation = FrameAnimation.extend(FrameAnimation, function(element, path, totalFrames, settings) {
        var element = FrameAnimation.utils.getDOMElement(element);
        if (element == null) {
            FrameAnimation.utils.error("Not a DOM element passed to CanvasFrameAnimation: " + element);
            return;
        }

        this._name = "CanvasFrameAnimation";
        this._version = CanvasFrameAnimation.version;

        this._available = CanvasFrameAnimation.available();
        this.element = element;
        this._elementStyle = this.element.style;
        this.element.canvasFrameAnimation = this;

        this._renderGhosting = settings.renderGhosting || 0;
        this._renderAlpha = settings.renderAlpha || 1;
        this._renderPostEffect = settings.renderPostEffect;

        var settings = settings || {};
        this._init(settings);

        if (this.element.tagName.toLowerCase() != "canvas") {
            FrameAnimation.utils.error("Usupported element for CanvasFrameAnimation: " + element);
            return;
        }

        try {
            this._canvasContext = this.element.getContext("2d");
        } catch (e) {
            if (typeof settings.fallback == "function") {
                settings.fallback();
            }
        }
        if (this._available) {
            this._peElement = document.createElement("canvas");
            this._peElement.width = this.element.width;
            this._peElement.height = this.element.height;
            this._peElementContext = this._peElement.getContext("2d");
            this._initFramesAnimation(path, totalFrames, settings);

            this._loadingCounter = 0;
            this._loadingAngle = 0;        
        }
    })
    CanvasFrameAnimation.create = function(path, totalFrames, settings) {
        return new CanvasFrameAnimation(document.createElement("canvas"), path, totalFrames, settings);
    }
    CanvasFrameAnimation.available = function() {
        if (!this._availabilityTested) {
            this._availabilityTested = true;
            var elem = document.createElement("canvas");
            this._available = !!(elem.getContext && elem.getContext('2d'));
        }
        return this._available;
    }
    CanvasFrameAnimation.prototype.available = function() {
        return this._available;
    }
    CanvasFrameAnimation.prototype._initFramesAnimation = function(path, totalFrames, settings) {
        this._totalFrames = totalFrames;
        this._readyCallback = settings.ready;
        this._loadingCallback = settings.loading;

        this._ready = !(settings.waitBeforeLoaded == false ? false : true);

        this._preventCache = settings.preventCache ? true : false;

        this._useChainLoading = settings.useChainLoading ? true : false;

        this._path = path;
        this._startFrom = typeof settings.startFrom == "number" ? settings.startFrom : 0;

        this._frameImages = [];
        this._loadedCounter = 0;

        this.debug(settings.debug || false, settings.appendDebugTo);
        this.force3D(settings.force3D || false);

        if (FrameAnimation.utils.isArray(path)) {
            this._totalFrames = path.length;
            this._useCustomPathArray = true;

        } else {
            this._useFramesDetect = typeof totalFrames == "number" ? false : true;
            if (this._useFramesDetect) {
                this._totalFrames = 0;
                this._useChainLoading = true;
                this._framesDetectReady = false;
            }

            this._pathPatternLength = this._path.split("#").length - 1;
        }
        if (this._useChainLoading) {
            this._createFrameImage(0)
        } else {
            for (var k = 0; k < this._totalFrames; k++) {
                this._createFrameImage(k)
            }
        }
    }
    CanvasFrameAnimation.prototype._onBeforeReadyUpdate = function(delta){
        if (!this._available) {
            return;
        }
        // TODO: Do i need it?
        var eWidth = this.element.offsetWidth;
        var eHeight = this.element.offsetHeight;
        if(this.element.width != eWidth || this.element.height != eHeight){
            this.element.width = eWidth;
            this.element.height = eHeight;
        }

        this._canvasContext.save();

        var width = this.element.width;
        var height = this.element.height;
        this._loadingCounter += delta;
        var angle = this._loadingCounter / (200 - (50 * this._loadingProgress ));
        var alpha = angle / 5;
        alpha = alpha > 1 ? 1 : alpha;

        this._canvasContext.globalCompositeOperation = "destination-out";
        this._canvasContext.fillStyle = "rgba(255, 255, 255, 0.1)";
        this._canvasContext.beginPath();
        this._canvasContext.fillRect(0, 0, this.element.width, this.element.height);
        this._canvasContext.fill();
        this._canvasContext.globalCompositeOperation = "source-over";

        this._canvasContext.globalAlpha = 1;

        this._canvasContext.translate( width / 2, height / 2); 

        this._canvasContext.fillStyle = "rgba(255,255,255," + alpha +")";
        
        var rotatedBy = 0;
        for(var k=this._loadingAngle; k<=angle; k+=0.05){
            this._canvasContext.rotate(-rotatedBy)
            this._canvasContext.rotate(k)
            rotatedBy = k;

            this._canvasContext.fillStyle = "rgba(0,0,0,0.1)";
            this._canvasContext.fillRect(4,4,3,3);         

            this._canvasContext.fillStyle = "rgba(255,255,255," + alpha +")";
            this._canvasContext.fillRect(5,5,1,1);           
        }

        this._canvasContext.restore();

        this._loadingAngle = angle;
    }
    CanvasFrameAnimation.prototype._render = function(prevFrame, newFrame) {
        if (!this._available) {
            return false;
        }
        var currentFrameImage = this._frameImages[newFrame];

        var width = currentFrameImage.width
        var height = currentFrameImage.height

        if (this.element.width != width || this.element.height != height) {
            this.element.width = this._peElement.width = width;
            this.element.height = this._peElement.height = height;
        }

        var ctx = this._canvasContext;

        ctx.save();
        ctx.globalCompositeOperation = "source-over";

        if (this._renderGhosting > 0) {

            ctx.globalCompositeOperation = "destination-out";
            ctx.fillStyle = "rgba(255, 255, 255, " + this._renderGhosting + ")";
            ctx.beginPath();
            ctx.fillRect(0, 0, width, height);
            ctx.fill();
            ctx.globalCompositeOperation = "source-over";

            ctx.globalAlpha = this._renderAlpha;

        } else {
            ctx.clearRect(0, 0, width, height);
        }
        ctx.drawImage(currentFrameImage, 0, 0);
        
        this._peElementContext.clearRect(0, 0, width, height);
        this._peElementContext.drawImage(this.element, 0, 0);

        this._peElementContext.save();
        this._launchCallback(this._renderPostEffect, [this.element, this._peElement, ctx, this._peElementContext, width, height]);

        this._peElementContext.restore();

        ctx.restore()

        return true;
    }

    CanvasFrameAnimation.prototype._createFrameImage = function(index) {
        //var newImage = new Image();
        var newImage = document.createElement("img")
        var self = this;
        newImage.onload = function() {
            self._imageLoadedHandler(this, index);
        }
        if (this._useFramesDetect) {
            newImage.onerror = function() {
                if (self._framesDetectReady) {
                    return;
                }
                if (self._totalFrames > index) {
                    self._totalFrames = index;
                }
                self._framesDetectReady = true;
                self._checkLoaded();
            }
        }

        var path = this._getImagePath(index);
        this._frameImages[index] = newImage;
        newImage.style.visibility = "hidden";

        // Must be the last action:
        newImage.src = path + (this._preventCache ? ("?" + Math.random()) : "");
    }
    CanvasFrameAnimation.prototype._imageLoadedHandler = function(image, index) {
        var nextIndex = index + 1;
        if (this._useFramesDetect) {
            if (index >= this._totalFrames) {
                this._totalFrames = index + 1;
            }
            this._createFrameImage(nextIndex)
        } else {
            if (this._useChainLoading) {
                if (this._loadedCounter < this._totalFrames - 1) {
                    this._createFrameImage(nextIndex)
                }
            }
        }
        if (FrameAnimation._IEMode) {
            image.style.opacity = "0";
            image.style.filter = "alpha(opacity=0)";
            image.style.visibility = "visible";
        } else {
            image.style.visibility = "hidden";
        }
        this._loadedCounter++;
        if (!this._useFramesDetect) {
            if (typeof this._loadingCallback == "function") {
                var loaded = this._loadedCounter / this._totalFrames;
                this._loadingProgress = loaded;
                this._loadingCallback.apply(this, [loaded])
            }
        } else {
            this._loadingProgress = 1;
        }
        this._checkLoaded();
    }
    CanvasFrameAnimation.prototype._checkLoaded = function() {
        if (this._useFramesDetect) {
            if (!this._framesDetectReady) {
                return;
            }
        }
        if (this._loadedCounter >= this._totalFrames) {
            this._ready = true;
            this._launchCallback(this._readyCallback);
        }
    }
    CanvasFrameAnimation.prototype._getImagePath = function(index) {
        if (this._useCustomPathArray) {
            return this._path[index];
        }
        // TODO: Optimise it!
        var index = (index + this._startFrom) + "";
        
        while (index.length < this._pathPatternLength) {
            index = "0" + index;
        }
        var fillAllToIndex = -1;
        if(index.length > this._pathPatternLength){
            fillAllToIndex = this._pathPatternLength - 1;
        }
        var indexArray = index.split("");
        var pathLength = this._path.length;
        var pathArray = this._path.split("");
        var subIndex = 0;
        for (var k = pathLength - 1; k >= 0; k--) {
            if (this._path.substr(k, 1) == "#") {
                pathArray[k] = indexArray.pop();
                if(subIndex == fillAllToIndex){
                    pathArray[k] = indexArray.join("");
                }
                if (indexArray.length == 0) {
                    break;
                }
                subIndex++;
            }
            
        }
        return pathArray.join("");
    }
    CanvasFrameAnimation.prototype._applyDebugInfo = function(debugInfo) {
        this._debugElement.innerHTML = debugInfo;
    }
    CanvasFrameAnimation.prototype.debug = function(state, appendTo) {
        if (typeof state == "undefined") {
            return this._debug;
        }
        var oldState = this._debug;
        this._debug = state ? true : false;
        if (this._debug) {
            if (!this._debugElement) {
                this._debugElement = document.createElement("div");
                var debugElementStyle = this._debugElement.style;
                debugElementStyle.position = "absolute";
                debugElementStyle.width = debugElementStyle.height = "auto";
                debugElementStyle.fontFamily = "'PT Sans',Tahoma,Helvetica";
                debugElementStyle.fontSize = "9px";
                debugElementStyle.color = "#FFFFFF";
                debugElementStyle.lineHeight = "12px";
                debugElementStyle.paddingLeft = debugElementStyle.paddingRight = debugElementStyle.left = debugElementStyle.top = "4px";
                debugElementStyle.paddingTop = debugElementStyle.paddingBottom = "0";
                debugElementStyle.backgroundColor = "#837AAF";
                debugElementStyle.cursor = "default";
                debugElementStyle.zIndex = 9;
                debugElementStyle.textShadow = "0 0 2px rgba(0,0,0,0.85)";
                debugElementStyle.boxShadow = "0 0 10px rgba(0,0,0,0.5)";
                debugElementStyle["-webkit-touch-callout"] = "none";
                debugElementStyle["-webkit-user-select"] = "none";
                debugElementStyle["-khtml-user-select"] = "none";
                debugElementStyle["-moz-user-select"] = "none";
                debugElementStyle["-ms-user-select"] = "none";
                debugElementStyle["user-select"] = "none";
            }
            try {
                if (typeof appendTo != "undefined" && FrameAnimation.utils.isElement(appendTo)) {
                    appendTo.appendChild(this._debugElement);
                } else {
                    this.element.appendChild(this._debugElement);
                }
            } catch (e) {
                FrameAnimation.utils.error("Error creating debug element")
            }
        } else {
            if (this._debugElement) {
                this._debugElement.parentNode.removeChild(this._debugElement);
            }
        }
        return this;
    }
    CanvasFrameAnimation.prototype.getDebugElement = function() {
        if (!this._debug) {
            this.debug(true)
        }
        return this._debugElement;
    }
    CanvasFrameAnimation.prototype.force3D = function(state) {
        if (typeof state == "undefined") {
            return this._force3D;
        }
        this._force3D = state ? true : false;
        if (this._force3D) {
            this._elementStyle["-webkit-transform"] = "translate3d(0, 0, 0)";
            this._elementStyle["-webkit-backface-visibility"] = "hidden";
            this._elementStyle["-webkit-perspective"] = "1000";
            this._elementStyle["transform"] = "translate3d(0, 0, 0)";
            this._elementStyle["backface-visibility"] = "hidden";
            this._elementStyle["perspective"] = "1000";
        } else {
            this._elementStyle["-webkit-transform"] = "";
            this._elementStyle["-webkit-backface-visibility"] = "";
            this._elementStyle["-webkit-perspective"] = "";
            this._elementStyle["transform"] = "";
            this._elementStyle["backface-visibility"] = "";
            this._elementStyle["perspective"] = "";
        }
        return this;
    }
    CanvasFrameAnimation.prototype.die = function() {
        // TODO: Clear references
        this._die();
    }
    window.CanvasFrameAnimation = CanvasFrameAnimation;


    //****************************
    // ImageFrameAnimation
    var ImageFrameAnimation = FrameAnimation.extend(CanvasFrameAnimation, function(element, path, totalFrames, settings) {
        var element = FrameAnimation.utils.getDOMElement(element);
        if (element == null) {
            FrameAnimation.utils.error("Not a DOM element passed to FrameAnimation: " + element);
            return;
        }

        ImageFrameAnimation._IEMode = FrameAnimation.utils.isIE();

        this._name = "ImageFrameAnimation";
        this._version = ImageFrameAnimation.version;

        this.element = element;
        this._elementStyle = this.element.style;
        this.element.imageFrameAnimation = this;

        var settings = settings || {};
        this._init(settings);

        this._initFramesAnimation(path, totalFrames, settings);

        this._renderAsBackground = settings.renderAsBackground ? true : false;

        if (!this._renderAsBackground && !this._useChainLoading) {
            this._appendFrameImages()
        }
    });
    ImageFrameAnimation.available = ImageFrameAnimation.prototype.available = function() {
        // Works in all major browsers
        return true;
    }
    ImageFrameAnimation.create = function(path, totalFrames, settings) {
        return new ImageFrameAnimation(document.createElement("div"), path, totalFrames, settings)
    }
    ImageFrameAnimation.prototype._appendFrameImages = function() {
        for (var k = 0; k < this._totalFrames; k++) {
            var image = this._frameImages[k];
            this.element.appendChild(image);
            image.style.position = "absolute";
        }
    }
    ImageFrameAnimation.prototype._render = function(prevFrame, newFrame) {
        if (this._renderAsBackground) {
            this._elementStyle.backgroundImage = "url('" + (this._frameImages[newFrame].src) + "')";
        } else {
            var oldImage = this._frameImages[prevFrame];
            var newImage = this._frameImages[newFrame];
            if (ImageFrameAnimation._IEMode) {
                oldImage.style.opacity = "0";
                oldImage.style.filter = "alpha(opacity=0)";
                newImage.style.opacity = "1";
                newImage.style.filter = "alpha(opacity=100)";
            } else {
                oldImage.style.visibility = "hidden";
            }
            newImage.style.visibility = "visible";
        }

        return true;
    }
    ImageFrameAnimation.prototype._checkLoaded = function() {
        if (this._useFramesDetect) {
            if (!this._framesDetectReady) {
                return;
            }
        }
        if (this._loadedCounter >= this._totalFrames) {
            this._ready = true;
            this._appendFrameImages();
            this._launchCallback(this._readyCallback)
        }
    }
    ImageFrameAnimation.prototype.die = function() {
        // TODO: Clear references
        this._die();
    }
    ImageFrameAnimation.prototype._onBeforeReadyUpdate = function(delta){
        // Do nothing
    }
    window.ImageFrameAnimation = ImageFrameAnimation;


    //****************************
    // SpriteFrameAnimation
    var SpriteFrameAnimation = FrameAnimation.extend(FrameAnimation, function(element, settings) {
        var element = FrameAnimation.utils.getDOMElement(element);
        if (element == null) {
            FrameAnimation.utils.error("Not a DOM element passed to SpriteFrameAnimation: " + element);
            return;
        }

        this._name = "SpriteFrameAnimation";
        this._version = SpriteFrameAnimation.version;

        this.element = element;
        this._elementStyle = this.element.style;
        this.element.spriteFrameAnimation = this;

        var settings = settings || {};
        this._init(settings);

        this._preventCache = settings.preventCache ? true : false;
        this.debug(settings.debug || false, settings.appendDebugTo);
        this.force3D(settings.force3D || false);

        try {
            this._elementStylesHolder = this.element.currentStyle || window.getComputedStyle(this.element, false);
        } catch (e) {
            this._elementStylesHolder = this.element.style;
        }

        this._isVertical = settings.isVertical;
        this._frameSize = settings.frameSize;

        this._useAutoDetect = (typeof settings.isVertical != "boolean") || (typeof settings.frameSize != "number") || (typeof settings.totalFrames != "number")
        this._ready = !this._useAutoDetect;
        this._testImageReady = false;
        this._readyCallback = settings.ready;

        var self = this;

        if (settings.background) {
            try {
                this._elementStylesHolder.backgroundImage = "url('" + settings.background + "')";
            } catch (e) {
                this._elementStyle.backgroundImage = "url('" + settings.background + "')";
                this._elementStylesHolder = this._elementStyle;
            }
        }
        this._origBgSrc = this._elementStylesHolder.backgroundImage;
        var bgSrc = this._origBgSrc.replace(/.*\s?url\([\"\"]?/, "").replace(/[\"\"]?\).*/, "");

        if (this._useAutoDetect) {
            this._elementStyle.backgroundImage = "none";
        }

        if (bgSrc != "" && bgSrc != "none") {
            this._testImage = new Image();
            this._testImage.onerror = function() {
                FrameAnimation.utils.error("Unable to autodetect animation settings");
            }
            this._testImage.onload = function() {
                self._lazyInit()
            }
            this._testImage.src = bgSrc + (this._preventCache ? ("?" + Math.random()) : "");
        } else {
            FrameAnimation.utils.error("No background image setted for SpriteFrameAnimation of element " + this.element);
        }
    })
    SpriteFrameAnimation.available = SpriteFrameAnimation.prototype.available = function() {
        // Works in all major browsers
        return true;
    }
    SpriteFrameAnimation.create = function(background, settings) {
        var element = document.createElement("div");
        settings = settings || {};
        settings.background = background;
        element.style.width = FrameAnimation.utils.getCSSValue(settings.width);
        element.style.height = FrameAnimation.utils.getCSSValue(settings.height);
        return new SpriteFrameAnimation(element, settings);
    }
    SpriteFrameAnimation.prototype._lazyInit = function() {
        this._testImageReady = this._ready = true;

        if (this._useAutoDetect) {

            var imageWidth = this._testImage.width;
            var imageHeight = this._testImage.height;
            var imageRatio = imageWidth / imageHeight;

            var elementWidth = this.element.offsetWidth || parseInt(this._elementStyle.width);
            var elementHeight = this.element.offsetHeight || parseInt(this._elementStyle.height);
            var elementRatio = elementWidth / elementHeight;

            if(isNaN(elementRatio)){
                var clonedElement = this.element.cloneNode(true);
                clonedElement.style.visibility = "hidden";
                document.body.appendChild(clonedElement);

                var clonedStyle = clonedElement.style;
                var elementWidth = clonedElement.offsetWidth || parseInt(clonedStyle.width);
                var elementHeight = clonedElement.offsetHeight || parseInt(clonedStyle.height);
                var elementRatio = elementWidth / elementHeight;

                document.body.removeChild(clonedElement);
            }
            this._isVertical = elementRatio > imageRatio;
            this._totalFrames = (this._isVertical ? (imageHeight / elementHeight) : (imageWidth / elementWidth)) << 0;
            this._frameSize = (this._isVertical ? (imageHeight / this._totalFrames) : (imageWidth / this._totalFrames)) << 0;

            this._elementStyle.backgroundImage = this._origBgSrc;

            this._launchCallback(this._readyCallback)

        } else {
            this._launchCallback(this._readyCallback)
        }
    }
    SpriteFrameAnimation.prototype._render = function() {      
        var offset = -(this._roundFrame * this._frameSize);
        if (this._isVertical) {
            this._elementStyle.backgroundPosition = "0px " + offset + "px";
            this._elementStyle.backgroundPositionY = offset + "px";
        } else {
            this._elementStyle.backgroundPosition = offset + "px 0px";
            this._elementStyle.backgroundPositionX = offset + "px";
        }

        return true;
    }
    SpriteFrameAnimation.prototype.die = function() {
        // TODO: Clear references
        this._die();
    }
    SpriteFrameAnimation.prototype._applyDebugInfo = CanvasFrameAnimation.prototype._applyDebugInfo;
    SpriteFrameAnimation.prototype.debug = CanvasFrameAnimation.prototype.debug;
    SpriteFrameAnimation.prototype.getDebugElement = CanvasFrameAnimation.prototype.getDebugElement;
    SpriteFrameAnimation.prototype.force3D = CanvasFrameAnimation.prototype.force3D;
    window.SpriteFrameAnimation = SpriteFrameAnimation;


    //****************************
    // Extra: jQuery plugins
    if (window.jQuery && window.jQuery.fn) {
        (function($) {
            $.fn.canvasFrameAnimation = function(path, totalFrames, settings, initMethod) {
                var totalElements = this.length;
                for (var k = 0; k < totalElements; k++) {
                    var $element = this.eq(k);
                    var animation = new CanvasFrameAnimation($element[0], path, totalFrames, settings)
                    $element.data("canvasFrameAnimation", animation);
                    if(typeof initMethod == 'function'){
                        initMethod(this[k], animation)
                    }
                }
                return this;
            };
            $.fn.imageFrameAnimation = function(path, totalFrames, settings, initMethod) {
                var totalElements = this.length;
                for (var k = 0; k < totalElements; k++) {
                    var $element = this.eq(k);
                    var animation = new ImageFrameAnimation($element[0], path, totalFrames, settings)
                    $element.data("imageFrameAnimation", animation);
                    if(typeof initMethod == 'function'){
                        initMethod(this[k], animation)
                    }                    
                }
                return this;
            };
            $.fn.spriteFrameAnimation = function(settings, initMethod) {
                var totalElements = this.length;
                for (var k = 0; k < totalElements; k++) {
                    var $element = this.eq(k);
                    var animation = new SpriteFrameAnimation($element[0], settings)
                    $element.data("spriteFrameAnimation", animation);
                    if(typeof initMethod == 'function'){
                        initMethod(this[k], animation)
                    }                    
                }
                return this;
            };
        }(jQuery));
    }


    //****************************
    // Versions
    FrameAnimation.version = 1.00;
    CanvasFrameAnimation.version = 1.00;
    ImageFrameAnimation.version = 1.00;
    SpriteFrameAnimation.version = 1.00;

    FrameAnimation._init();

    window.FrameAnimation = FrameAnimation;

})(window);