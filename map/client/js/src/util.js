
MOC.util = {};

MOC.util.getScreenPosition = function ( worldPosition, camera, widthHalf, heightHalf ) {

  worldPosition.project( camera );

  worldPosition.x =   ( worldPosition.x * widthHalf )  + widthHalf;
  worldPosition.y = - ( worldPosition.y * heightHalf ) + heightHalf;

  return {
    x: worldPosition.x,
    y: worldPosition.y
  };

};

MOC.util.cssTransform = function ( el, value ) {

  el.style.webkitTransform = value;
  el.style.MozTransform    = value;
  el.style.msTransform     = value;
  el.style.transform       = value;

}
