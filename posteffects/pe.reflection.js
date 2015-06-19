/* Copyright Sborka Project         */
/* http://sborkaproject.com         */
/* Created by Hauts                 */
/* If u want to use it - contact me */

// Bugged =\
var reflectionPostEffect = function( origCanvas, drawCanvas, origCtx, drawCtx, width, height, startFrom, scaledBy, subAlpha ){
    
    origCtx.drawImage(origCanvas, 0, 0); 

    var origData = origCtx.getImageData(0,0,width,height);
    var drawData = drawCtx.getImageData(0,0,width,height);

    startFrom = startFrom || 0.5;
    scaledBy = scaledBy || 1;
    subAlpha = subAlpha || 1;

    var startY = Math.floor(height * startFrom);

    for(var k=startY; k<height; k++){
        var dataOffset = k * width; 
        var reflectionY = ((k-startY) / scaledBy) << 0;
        var reflectionRatio = (k - startY) / (height - startY)
        var backLineOffset = (startY - reflectionY) * width;

        for(var j=0; j<width; j++){
            var index = (dataOffset + j) * 4;
            var index2 = (backLineOffset + j) * 4;
            if(reflectionY < startY){
                drawData.data[index + 0] = origData.data[index2 + 0];
                drawData.data[index + 1] = origData.data[index2 + 1];
                drawData.data[index + 2] = origData.data[index2 + 2];

                var alpha = origData.data[index2 + 3] - ((Math.sin(reflectionRatio) * 255 ) << 0);
                drawData.data[index + 3] = (alpha * subAlpha ) << 0

            } else {
                drawData.data[index + 0] = drawData.data[index + 1] = drawData.data[index + 2] = drawData.data[index + 3] = 0          
            }
        }
    }
    drawCtx.putImageData(drawData, 0, 0);
    origCtx.globalCompositeOperation = "copy";
    origCtx.drawImage(drawCanvas, 0, 0);   
}