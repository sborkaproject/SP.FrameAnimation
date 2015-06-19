/* Copyright Sborka Project         */
/* http://sborkaproject.com         */
/* Created by Hauts                 */
/* If u want to use it - contact me */

var glitchPostEffect = function( origCanvas, drawCanvas, origCtx, drawCtx, width, height, changeColors, power ){
    var origData = origCtx.getImageData(0,0,width,height);
    var drawData = drawCtx.getImageData(0,0,width,height);
    if(!origCtx._glitchPostEffectData){
        // Thats a dirty way to write posteffect data to context :)
        origCtx._glitchPostEffectData = [];
    }
    changeColors = typeof changeColors != "undefined" ? changeColors : true;
    power = typeof power == "number" ? power : 5;
    for(var k = 0; k < power; k++){
        if(Math.random() > 0.98 && origCtx._glitchPostEffectData.length < power){
            var glitch = {};
            glitch.y = Math.floor(Math.random() * height)
            glitch.height = Math.floor(Math.random() * height / 15) + 1;
            if(Math.random() > 0.5 && changeColors){
                glitch.cr = Math.random() * 2;
                glitch.cg = Math.random() * 2;
                glitch.cb = Math.random() * 2;
            } else {
                glitch.cr = glitch.cg = glitch.cb = 1;
            }
            glitch.dx = Math.floor((Math.random() - 0.5)  * width / 40);
            //glitch.dx = glitch.dx > 10 ? 10 : (glitch.dx < -10 ? -10 : glitch.dx);
            glitch.sy = ((Math.random() - 0.5) * height / 40) << 0;
            glitch.sh = ((Math.random()) * height / 100);
            glitch.sd = ((Math.random() - 0.5) * height / 100);
            glitch.ddx = 0;
            if(Math.random() > 0.8 && changeColors){
                glitch.ddx = ((Math.random() - 0.5) * 2);
            }
            if(Math.random() > 0.5 && changeColors){
                glitch.srt = ((["012", "102", "120", "210", "201"])[(Math.random() * 5) << 0]).split("");
                glitch.srt[0] = Number(glitch.srt[0])
                glitch.srt[1] = Number(glitch.srt[1])
                glitch.srt[2] = Number(glitch.srt[2])
            } else {
                glitch.srt = [0,1,2];
            }
            origCtx._glitchPostEffectData.push(glitch)
        }
    }
    for(var k=0; k<origCtx._glitchPostEffectData.length; k++){
        if( Math.random() > 0.98 ){ continue; }
        var glitch = origCtx._glitchPostEffectData[k];
        var y = glitch.y << 0;
        var bottom = y + glitch.height << 0;
        var dx = glitch.dx << 0;
        for(var i=y; i<bottom; i++){
            if(i < 0 || i > height ){ continue; }
            var dataOffset = i * width;
            for(var j = 0; j < width; j++){
                if( Math.random() > 0.98 ){ continue; }
                var x1 = (dataOffset + j);
                var x2 = x1 + dx;
                if(dx < 0){
                    x2 = x1 + width + dx;
                }
                x1 = (x1 * 4) << 0;
                x2 = (x2 * 4) << 0;
                var ddx = glitch.ddx << 0
                drawData.data[x1+0] = origData.data[x2+glitch.srt[0] + ddx] * glitch.cr;
                drawData.data[x1+1] = origData.data[x2+glitch.srt[1] + ddx] * glitch.cg;
                drawData.data[x1+2] = origData.data[x2+glitch.srt[2] + ddx] * glitch.cb;
                drawData.data[x1+3] = origData.data[x2+glitch.srt[0] + ddx];
            }
        }
        glitch.height-=glitch.sh;
        glitch.y += glitch.sy;
        glitch.dx += glitch.sd;
        if(glitch.height <= 0 || Math.random() > 0.998){
            origCtx._glitchPostEffectData.splice(k, 1)
        }
    }
    drawCtx.putImageData(drawData, 0, 0);

    origCtx.globalCompositeOperation = "source-over";
    origCtx.drawImage(drawCanvas, 0, 0);    
}