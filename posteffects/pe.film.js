/* Copyright Sborka Project         */
/* http://sborkaproject.com         */
/* Created by Hauts                 */
/* If u want to use it - contact me */

var filmPostEffect = function( origCanvas, drawCanvas, origCtx, drawCtx, width, height, power, step ){
    if(!origCtx._filmPostEffectData){
        origCtx._filmPostEffectData = { offset : 0 };
    }
    var origData = origCtx.getImageData(0,0,width,height);
    var drawData = drawCtx.getImageData(0,0,width,height);
    var power = 1 + power;
    var step = typeof step == "number" ? step: 4;
    step = step < 2 ? 2 : step;
    origCtx._filmPostEffectData.offset -= 1 / step;
    for(var k=0; k<height; k+=step){
        var dataOffset = k * width;
        for(var j=0; j<width; j++){
            var index = (dataOffset + j) * 4;

            var linePower = 255 * (Math.cos( origCtx._filmPostEffectData.offset + k / step ) + 1) / 2;
            linePower = linePower << 0;
            linePower = linePower < 0 ? 0 : linePower;
            linePower = linePower > 255 ? 255 : linePower;

            drawData.data[index+0] = (origData.data[index+0] * power) << 0;
            drawData.data[index+1] = (origData.data[index+1] * power) << 0;
            drawData.data[index+2] = (origData.data[index+2] * power) << 0;
            drawData.data[index+3] = origData.data[index+3]
        }
    }
    drawCtx.putImageData(drawData, 0, 0);

    origCtx.globalCompositeOperation = "source-over";
    origCtx.drawImage(drawCanvas, 0, 0);    
}