/*! For license information please see main.b2c26977.js.LICENSE.txt */
var App = {};

jQuery(document).ready(function() {
  // Setup canvas and app
  App.setup();
  // Launch animation loop
  App.frame = function() {
    App.update();
    window.requestAnimationFrame(App.frame);
  };
	App.frame();
  
  jQuery('canvas#ourCanvas').on('click', function(event) {
    App.hasUserClicked = !App.hasUserClicked;
  });
  
  jQuery('canvas#ourCanvas').on('mousemove', function(event) {
    App.target.x = event.pageX;
    App.target.y = event.pageY;
  });
});

App.setup = function() {
  // Setup canvas and get canvas context
  var canvas = document.createElement('canvas');
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  canvas.id = 'ourCanvas';
  document.body.appendChild(canvas);
  this.ctx = canvas.getContext('2d');
  this.width = canvas.width;
  this.height = canvas.height;
  
  // Define a few useful elements
  this.stepCount = 0;
  this.hasUserClicked = false;
  this.xC = canvas.width / 2;
  this.yC = canvas.height / 2;
  this.target = {
    x: this.xC,
    y: this.yC,
    radius: 20
  };
  this.armsPop = 20;
  this.particlesPerArm = 15;
  
  // Create initial targets and arms
  this.arms = [];
  for (var i = 0; i < this.armsPop; i++) {
    this.arms.push([]);
  }
  // Fill initial arms
  this.initialBirth();
  
  // Some forces
  this.gravity = -1;
  this.springStiffness = 0.5;
  this.viscosity = 0.1;
  this.isElastic = false;
};
App.initialBirth = function() {
  for (var armIndex = 0; armIndex < this.arms.length; armIndex++) {
    var arm = this.arms[armIndex];
    var particlesNb = 20 + Math.ceil(20 * Math.random());
    for (var i = 0; i < particlesNb; i++) {
      var x = this.width * Math.random();
      var y = this.height * Math.random();
      var particle = {
        x: x,
        y: y,
        xLast: x,
        yLast: y,
        xSpeed: 0,
        ySpeed: 0,
        stickLength: 10,
        name: 'seed' + this.stepCount
      };

      arm.push(particle);
    }
  }
  
};
App.update = function() {
  // Evolve system
  this.evolve();
  // Move particles
  this.move();
  // Draw particles
  this.draw();
};
App.evolve = function() {
  this.stepCount++;
  this.target.radius = 50 + 30 * Math.sin(this.stepCount / 10);
};
App.move = function() {
  // This is inverse kinematics, the particles form an arm with N joints, and its shape adapts with a target contraint
  // Move target point
  if (!this.hasUserClicked) {
    this.target.x = this.xC + 150 * Math.cos(this.stepCount / 50);
    this.target.y = this.yC + 150 * Math.sin(this.stepCount / 20);
  }
  
  // Move particles accordingly on (each arm)
  for (var armIndex = 0; armIndex < this.arms.length; armIndex++) {
    var arm = this.arms[armIndex];
    var ownTargetAngle = 2 * Math.PI * armIndex / this.arms.length;
    var ownTarget = {
      x: this.target.x + this.target.radius * Math.cos(ownTargetAngle),
      y: this.target.y + this.target.radius * Math.sin(ownTargetAngle),
    }
    for (var i = 0; i < arm.length; i++) {
      var p = arm[i];
      var pLead = ( i == 0 ? ownTarget : arm[i-1] );
      var angle = segmentAngleRad(p.x, p.y, pLead.x, pLead.y, false);
      var dist = Math.sqrt(Math.pow(p.x - pLead.x, 2) + Math.pow(p.y - pLead.y, 2));
      var translationDist = dist - p.stickLength;
      if (translationDist < 0) {
        angle += Math.PI;
        translationDist = Math.abs(translationDist);
      }
      /* Kinetic binding */
      var dx = translationDist * Math.cos(angle);
      var dy = translationDist * Math.sin(angle);
      if (!this.isElastic) {
        p.x += dx;
        p.y -= dy;
      }
      /* Forces */
      var xAcc = this.springStiffness * dx - this.viscosity * p.xSpeed;
      var yAcc = this.springStiffness * dy + this.gravity - this.viscosity * p.ySpeed;
      p.xSpeed += xAcc;
      p.ySpeed += yAcc;
      p.x += 0.1 * p.xSpeed;
      p.y -= 0.1 * p.ySpeed;
    }
  }
  
}
App.draw = function() {
  // Add transparent layer for trace effect
  this.ctx.beginPath();
  this.ctx.rect(0, 0, this.width, this.height);
  this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  this.ctx.fill();
  
  // Draw target
  this.ctx.beginPath();
    this.ctx.arc(this.target.x, this.target.y, 15, 0, 2 * Math.PI, false);
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    this.ctx.fill();
  
  // Draw particles
  for (var armIndex = 0; armIndex < this.arms.length; armIndex++) {
    var arm = this.arms[armIndex];
    for (var i = 0; i < arm.length; i++) {
      var particle = arm[i];
      if (i != 0) { var particleLead = arm[i-1]; }

      // Draw particle
      this.ctx.beginPath();
      this.ctx.arc(particle.x, particle.y, 0.3 * (arm.length - i), 0, 2 * Math.PI, false);
      this.ctx.strokeStyle = 'hsla(' + (200 + i * 4) + ', 90%, 50%, 0.7)';
      this.ctx.stroke();
      // Draw its stick
      this.ctx.beginPath();
      this.ctx.lineWidth = 1;
      this.ctx.strokeStyle = 'hsla(' + (180 + i * 4) + ', 80%, 50%, 0.7)';
      if (i == 0) this.ctx.moveTo(this.target.x, this.target.y);
      else this.ctx.moveTo(particleLead.x, particleLead.y);
      this.ctx.lineTo(particle.x, particle.y);
      this.ctx.stroke();

    }
  }
};



/**
 * @param {Number} Xstart X value of the segment starting point
 * @param {Number} Ystart Y value of the segment starting point
 * @param {Number} Xtarget X value of the segment target point
 * @param {Number} Ytarget Y value of the segment target point
 * @param {Boolean} realOrWeb true if Real (Y towards top), false if Web (Y towards bottom)
 * @returns {Number} Angle between 0 and 2PI
 */
segmentAngleRad = function(Xstart, Ystart, Xtarget, Ytarget, realOrWeb) {
	var result;// Will range between 0 and 2PI
	if (Xstart == Xtarget) {
		if(Ystart == Ytarget) {
			result = 0; 
		} else if (Ystart < Ytarget) {
			result = Math.PI/2;
		} else if (Ystart > Ytarget) {
			result = 3*Math.PI/2;
		} else {}
	} else if (Xstart < Xtarget) {
		result = Math.atan((Ytarget - Ystart)/(Xtarget - Xstart));
	} else if (Xstart > Xtarget) {
		result = Math.PI + Math.atan((Ytarget - Ystart)/(Xtarget - Xstart));
	}
	
	result = (result + 2*Math.PI)%(2*Math.PI);
	
	if (!realOrWeb) {
		result = 2*Math.PI - result;
	}
	
	return result;
}

/* I use the amazing Victor.js library */
/*!
MIT License
Copyright (c) 2011 Max Kueng, George Crabtree
 
Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:
 
The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.
 
THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*/
!function(t){if("object"==typeof exports)module.exports=t();else if("function"==typeof define&&define.amd)define(t);else{var i;"undefined"!=typeof window?i=window:"undefined"!=typeof global?i=global:"undefined"!=typeof self&&(i=self),i.Victor=t()}}(function(){return function t(i,r,n){function o(s,h){if(!r[s]){if(!i[s]){var u="function"==typeof require&&require;if(!h&&u)return u(s,!0);if(e)return e(s,!0);throw new Error("Cannot find module '"+s+"'")}var p=r[s]={exports:{}};i[s][0].call(p.exports,function(t){var r=i[s][1][t];return o(r?r:t)},p,p.exports,t,i,r,n)}return r[s].exports}for(var e="function"==typeof require&&require,s=0;s<n.length;s++)o(n[s]);return o}({1:[function(t,i,r){function n(t,i){return this instanceof n?(this.x=t||0,void(this.y=i||0)):new n(t,i)}function o(t,i){return Math.floor(Math.random()*(i-t+1)+t)}function e(t){return t*h}function s(t){return t/h}r=i.exports=n,n.fromArray=function(t){return new n(t[0]||0,t[1]||0)},n.fromObject=function(t){return new n(t.x||0,t.y||0)},n.prototype.addX=function(t){return this.x+=t.x,this},n.prototype.addY=function(t){return this.y+=t.y,this},n.prototype.add=function(t){return this.x+=t.x,this.y+=t.y,this},n.prototype.addScalar=function(t){return this.x+=t,this.y+=t,this},n.prototype.addScalarX=function(t){return this.x+=t,this},n.prototype.addScalarY=function(t){return this.y+=t,this},n.prototype.subtractX=function(t){return this.x-=t.x,this},n.prototype.subtractY=function(t){return this.y-=t.y,this},n.prototype.subtract=function(t){return this.x-=t.x,this.y-=t.y,this},n.prototype.subtractScalar=function(t){return this.x-=t,this.y-=t,this},n.prototype.subtractScalarX=function(t){return this.x-=t,this},n.prototype.subtractScalarY=function(t){return this.y-=t,this},n.prototype.divideX=function(t){return this.x/=t.x,this},n.prototype.divideY=function(t){return this.y/=t.y,this},n.prototype.divide=function(t){return this.x/=t.x,this.y/=t.y,this},n.prototype.divideScalar=function(t){return 0!==t?(this.x/=t,this.y/=t):(this.x=0,this.y=0),this},n.prototype.divideScalarX=function(t){return 0!==t?this.x/=t:this.x=0,this},n.prototype.divideScalarY=function(t){return 0!==t?this.y/=t:this.y=0,this},n.prototype.invertX=function(){return this.x*=-1,this},n.prototype.invertY=function(){return this.y*=-1,this},n.prototype.invert=function(){return this.invertX(),this.invertY(),this},n.prototype.multiplyX=function(t){return this.x*=t.x,this},n.prototype.multiplyY=function(t){return this.y*=t.y,this},n.prototype.multiply=function(t){return this.x*=t.x,this.y*=t.y,this},n.prototype.multiplyScalar=function(t){return this.x*=t,this.y*=t,this},n.prototype.multiplyScalarX=function(t){return this.x*=t,this},n.prototype.multiplyScalarY=function(t){return this.y*=t,this},n.prototype.normalize=function(){var t=this.length();return 0===t?(this.x=1,this.y=0):this.divide(n(t,t)),this},n.prototype.norm=n.prototype.normalize,n.prototype.limit=function(t,i){return Math.abs(this.x)>t&&(this.x*=i),Math.abs(this.y)>t&&(this.y*=i),this},n.prototype.randomize=function(t,i){return this.randomizeX(t,i),this.randomizeY(t,i),this},n.prototype.randomizeX=function(t,i){var r=Math.min(t.x,i.x),n=Math.max(t.x,i.x);return this.x=o(r,n),this},n.prototype.randomizeY=function(t,i){var r=Math.min(t.y,i.y),n=Math.max(t.y,i.y);return this.y=o(r,n),this},n.prototype.randomizeAny=function(t,i){return Math.round(Math.random())?this.randomizeX(t,i):this.randomizeY(t,i),this},n.prototype.unfloat=function(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this},n.prototype.toFixed=function(t){return"undefined"==typeof t&&(t=8),this.x=this.x.toFixed(t),this.y=this.y.toFixed(t),this},n.prototype.mixX=function(t,i){return"undefined"==typeof i&&(i=.5),this.x=(1-i)*this.x+i*t.x,this},n.prototype.mixY=function(t,i){return"undefined"==typeof i&&(i=.5),this.y=(1-i)*this.y+i*t.y,this},n.prototype.mix=function(t,i){return this.mixX(t,i),this.mixY(t,i),this},n.prototype.clone=function(){return new n(this.x,this.y)},n.prototype.copyX=function(t){return this.x=t.x,this},n.prototype.copyY=function(t){return this.y=t.y,this},n.prototype.copy=function(t){return this.copyX(t),this.copyY(t),this},n.prototype.zero=function(){return this.x=this.y=0,this},n.prototype.dot=function(t){return this.x*t.x+this.y*t.y},n.prototype.cross=function(t){return this.x*t.y-this.y*t.x},n.prototype.projectOnto=function(t){var i=(this.x*t.x+this.y*t.y)/(t.x*t.x+t.y*t.y);return this.x=i*t.x,this.y=i*t.y,this},n.prototype.horizontalAngle=function(){return Math.atan2(this.y,this.x)},n.prototype.horizontalAngleDeg=function(){return e(this.horizontalAngle())},n.prototype.verticalAngle=function(){return Math.atan2(this.x,this.y)},n.prototype.verticalAngleDeg=function(){return e(this.verticalAngle())},n.prototype.angle=n.prototype.horizontalAngle,n.prototype.angleDeg=n.prototype.horizontalAngleDeg,n.prototype.direction=n.prototype.horizontalAngle,n.prototype.rotate=function(t){var i=this.x*Math.cos(t)-this.y*Math.sin(t),r=this.x*Math.sin(t)+this.y*Math.cos(t);return this.x=i,this.y=r,this},n.prototype.rotateDeg=function(t){return t=s(t),this.rotate(t)},n.prototype.rotateTo=function(t){return this.rotate(t-this.angle())},n.prototype.rotateToDeg=function(t){return t=s(t),this.rotateTo(t)},n.prototype.rotateBy=function(t){var i=this.angle()+t;return this.rotate(i)},n.prototype.rotateByDeg=function(t){return t=s(t),this.rotateBy(t)},n.prototype.distanceX=function(t){return this.x-t.x},n.prototype.absDistanceX=function(t){return Math.abs(this.distanceX(t))},n.prototype.distanceY=function(t){return this.y-t.y},n.prototype.absDistanceY=function(t){return Math.abs(this.distanceY(t))},n.prototype.distance=function(t){return Math.sqrt(this.distanceSq(t))},n.prototype.distanceSq=function(t){var i=this.distanceX(t),r=this.distanceY(t);return i*i+r*r},n.prototype.length=function(){return Math.sqrt(this.lengthSq())},n.prototype.lengthSq=function(){return this.x*this.x+this.y*this.y},n.prototype.magnitude=n.prototype.length,n.prototype.isZero=function(){return 0===this.x&&0===this.y},n.prototype.isEqualTo=function(t){return this.x===t.x&&this.y===t.y},n.prototype.toString=function(){return"x:"+this.x+", y:"+this.y},n.prototype.toArray=function(){return[this.x,this.y]},n.prototype.toObject=function(){return{x:this.x,y:this.y}};var h=180/Math.PI},{}]},{},[1])(1)});
  


a,
  a:active,
  a:hover {
    outline: 0;
  }

  .button-container {
    display: inline-block;
    height: 6rem;
    width: 6rem;
    margin: 0 1.75rem;
  }

  .button {
    transition: color 0.5s linear;
    height: 6rem;
    width: 6rem;
    color: ${e=>{let{$theme:t}=e;return t.primaryTextColor}};
    display: table-cell;
    vertical-align: middle;
    text-align: center;
    text-decoration: none;
    position: relative;
    z-index: 1;
    border-radius: 25%;
  }

  .icon {
    height: 4.5rem;
    width: 4.5rem;
    padding: 1rem;
  }

  .icon_title {
    font-size: 1.25rem;
  }

  .button:hover {
    background-color: ${e=>{let{$theme:t}=e;return t.shadowColor}};
    box-shadow: 0 0 0.75rem 0.75rem rgba(128, 128, 128, 0.25);
  }

  .button:active {
    -webkit-transform: scale(0.9);
    transform: scale(0.9);
  }

  .button-container .icon_title {
    display: none;
  }

  .button-container:hover .icon_title {
    display: initial;
  }

  .button-container:hover .icon {
    display: none;
  }

  @media only screen and (max-device-width: 820px) and (-webkit-min-device-pixel-ratio: 2) {
    .button-container {
      height: 5rem;
      width: 5rem;
      margin: 0 0.8rem;
    }

    .button {
      height: 5rem;
      width: 5rem;
    }

    .icon {
      height: 4rem;
      width: 4rem;
      padding: 0.5rem;
    }

    .icon_title {
      font-size: 1rem;
    }
  }
`,Zt=()=>{const{config:e,theme:n}=(0,t.useContext)(u);return(0,a.jsx)(Xt,{$theme:n,children:e.buttons.map((e=>{let{name:t,display:n,ariaLabel:i,icon:o,href:r}=e;return(0,a.jsx)("span",{className:"button-container",children:(0,a.jsxs)("a",{"data-v2":`button-${n}`,className:"button","aria-label":i,href:r,rel:"noopener noreferrer",target:"_blank",children:[(0,a.jsx)("div",{className:"icon",children:o}),(0,a.jsx)("span",{"data-v2":n,className:"icon_title",children:n})]})},t)}))})},Jt=qt`
  transition: color 0.5s linear;
  font-weight: normal;
  position: relative;
  z-index: 1;
`,en={Name:Yt.h1`
    ${Jt};
    font-size: 6rem;
    margin: 0;
    color: ${e=>{let{$theme:t}=e;return t.primaryTextColor}};
    @media only screen and (max-device-width: 820px) and (-webkit-min-device-pixel-ratio: 2) {
      font-size: 4.5rem;
    }
  `,Title:Yt.h2`
    ${Jt};
    font-size: 3.5rem;
    margin: 4rem 0;
    color: ${e=>{let{$theme:t}=e;return t.secondaryTextColor}};
    @media only screen and (max-device-width: 820px) and (-webkit-min-device-pixel-ratio: 2) {
      font-size: 2.5rem;
    }
  `},tn=()=>{const{config:e,theme:n}=(0,t.useContext)(u);return(0,a.jsxs)(a.Fragment,{children:[(0,a.jsx)(en.Name,{"data-v2":"name",$theme:n,children:e.name.display}),(0,a.jsx)(en.Title,{"data-v2":"title",$theme:n,children:e.title.display})]})},nn={Container:Yt.footer`
    position: absolute;
    bottom: 0;
    right: 0;
    font-size: 0.75rem;
    padding-right: ${e=>{let{$isMobile:t}=e;return t?"1.5rem":"1rem"}};
    z-index: 1;
  `,Text:Yt.p`
    transition: color 0.5s linear;
    color: ${e=>{let{$theme:t}=e;return t.tertiaryTextColor}};
  `,Link:Yt.a`
    transition: color 0.5s linear;
    color: ${e=>{let{$theme:t}=e;return t.secondaryTextColor}};
    text-decoration: none;
    &:hover {
      text-decoration: underline;
    }
  `},on=()=>{const{isMobile:e,theme:n}=(0,t.useContext)(u);return(0,a.jsx)(nn.Container,{$isMobile:e,children:(0,a.jsxs)(nn.Text,{"data-v2":"footer",$theme:n,children:[]})})};var rn=n(1118),an=n.n(rn);const sn={Container:Yt.div`
    position: absolute;
    background-color: ${e=>{let{$theme:t}=e;return t.background}};
    background-repeat: no-repeat;
    background-size: cover;
    background-position: 50% 50%;
    z-index: 0;
  `},ln=()=>{const{theme:e}=(0,t.useContext)(u);return(0,a.jsxs)(sn.Container,{"data-v2":"particles",$theme:e,children:[(0,a.jsx)(an(),{width:"100vw",height:"100vh",options:i}),(0,a.jsx)(an(),{width:"100vw",height:"100vh",options:o})]})},cn=()=>(0,a.jsx)("svg",{"aria-label":"Email icon",role:"img",viewBox:"0 0 512 512",xmlns:"http://www.w3.org/2000/svg",children:(0,a.jsx)("path",{fill:"currentColor",d:"M464.004 4.326L15.986 262.714c-23 13.3-20.7 47.198 3.8 57.297l140.206 57.997v101.996c0 30.198 37.802 43.298 56.702 20.299l60.703-73.797L403.8 478.704c19.101 7.9 40.702-4.2 43.802-24.7l64.003-417.08c4.1-26.698-24.601-45.897-47.602-32.598zm-272.01 475.678v-88.796l54.501 22.499zm224.008-30.899l-206.208-85.196L409.302 128.12c4.8-5.6-2.9-13.199-8.5-8.4l-255.31 217.59-113.505-46.797L480.004 32.025z"})}),un=()=>(0,a.jsx)("svg",{"aria-label":"GitHub icon",role:"img",viewBox:"0 0 512 512",xmlns:"http://www.w3.org/2000/svg",children:(0,a.jsx)("path",{fill:"currentColor",d:"M296.133 354.174c49.885-5.891 102.942-24.029 102.942-110.192 0-24.49-8.624-44.448-22.67-59.869 2.266-5.89 9.515-28.114-2.734-58.947 0 0-18.139-5.898-60.759 22.669-18.139-4.983-38.09-8.163-56.682-8.163-19.053 0-39.011 3.18-56.697 8.163-43.082-28.567-61.22-22.669-61.22-22.669-12.241 30.833-4.983 53.057-2.718 58.947-14.061 15.42-22.677 35.379-22.677 59.869 0 86.163 53.057 104.301 102.942 110.192-6.344 5.452-12.241 15.873-14.507 30.387-12.702 5.438-45.808 15.873-65.758-18.592 0 0-11.795-21.31-34.012-22.669 0 0-22.224-.453-1.813 13.592 0 0 14.96 6.812 24.943 32.653 0 0 13.6 43.089 76.179 29.48v38.543c0 5.906-4.53 12.702-15.865 10.89C96.139 438.977 32.2 354.626 32.2 255.77c0-123.807 100.216-224.022 224.03-224.022 123.347 0 224.023 100.216 223.57 224.022 0 98.856-63.946 182.754-152.828 212.688-11.342 2.266-15.873-4.53-15.873-10.89V395.45c.001-20.873-6.811-34.465-14.966-41.276zM512 256.23C512 114.73 397.263 0 256.23 0 114.73 0 0 114.73 0 256.23 0 397.263 114.73 512 256.23 512 397.263 512 512 397.263 512 256.23z"})}),dn=()=>(0,a.jsx)("svg",{"aria-label":"Gmail icon",role:"img",viewBox:"0 0 512 512",xmlns:"http://www.w3.org/2000/svg",children:(0,a.jsx)("path",{fill:"currentColor",d:"M330.6 243.5a36.2 36.2 0 0 1 9.3 0c1.7-3.8 2-10.4 .5-17.6-2.2-10.7-5.3-17.1-11.5-16.1s-6.5 8.7-4.2 19.4c1.3 6 3.5 11.1 6 14.3zM277.1 252c4.5 2 7.2 3.3 8.3 2.1 1.9-1.9-3.5-9.4-12.1-13.1a31.4 31.4 0 0 0 -30.6 3.7c-3 2.2-5.8 5.2-5.4 7.1 .9 3.7 10-2.7 22.6-3.5 7-.4 12.8 1.8 17.3 3.7zm-9 5.1c-9.1 1.4-15 6.5-13.5 10.1 .9 .3 1.2 .8 5.2-.8a37 37 0 0 1 18.7-2c2.9 .3 4.3 .5 4.9-.5 1.5-2.2-5.7-8-15.4-6.9zm54.2 17.1c3.4-6.9-10.9-13.9-14.3-7s10.9 13.9 14.3 7zm15.7-20.5c-7.7-.1-8 15.8-.3 15.9s8-15.8 .3-16zm-218.8 78.9c-1.3 .3-6 1.5-8.5-2.4-5.2-8 11.1-20.4 3-35.8-9.1-17.5-27.8-13.5-35.1-5.5-8.7 9.6-8.7 23.5-5 24.1 4.3 .6 4.1-6.5 7.4-11.6a12.8 12.8 0 0 1 17.9-3.7c11.6 7.6 1.4 17.8 2.3 28.6 1.4 16.7 18.4 16.4 21.6 9a2.1 2.1 0 0 0 -.2-2.3c0 .9 .7-1.3-3.4-.4zm299.7-17.1c-3.4-11.7-2.6-9.2-6.8-20.5 2.5-3.7 15.3-24-3.1-43.3-10.4-10.9-33.9-16.5-41.1-18.5-1.5-11.4 4.7-58.7-21.5-83 20.8-21.6 33.8-45.3 33.7-65.7-.1-39.2-48.2-51-107.4-26.5l-12.6 5.3c-.1-.1-22.7-22.3-23.1-22.6C169.5-18-41.8 216.8 25.8 273.9l14.8 12.5a72.5 72.5 0 0 0 -4.1 33.5c3.4 33.4 36 60.4 67.5 60.4 57.7 133.1 267.9 133.3 322.3 3 1.7-4.5 9.1-24.6 9.1-42.4s-10.1-25.3-16.5-25.3zm-316 48.2c-22.8-.6-47.5-21.2-49.9-45.5-6.2-61.3 74.3-75.3 84-12.3 4.5 29.6-4.7 58.5-34.1 57.8zM84.3 249.6C69.1 252.5 55.8 261.1 47.6 273c-4.9-4.1-14-12-15.6-15-13-24.9 14.2-73 33.3-100.2C112.4 90.6 186.2 39.7 220.4 48.9c5.6 1.6 23.9 22.9 23.9 22.9s-34.2 18.9-65.8 45.4c-42.7 32.9-74.9 80.6-94.2 132.4zM323.2 350.7s-35.7 5.3-69.5-7.1c6.2-20.2 27 6.1 96.4-13.8 15.3-4.4 35.4-13 51-25.4a102.9 102.9 0 0 1 7.1 24.3c3.7-.7 14.3-.5 11.4 18.1-3.3 19.9-11.7 36-25.9 50.8A106.9 106.9 0 0 1 362.6 421a132.5 132.5 0 0 1 -20.3 8.6c-53.5 17.5-108.3-1.7-126-43a66.3 66.3 0 0 1 -3.6-9.7c-7.5-27.2-1.1-59.8 18.8-80.4 1.2-1.3 2.5-2.9 2.5-4.8a8.5 8.5 0 0 0 -1.9-4.5c-7-10.1-31.2-27.4-26.3-60.8 3.5-24 24.5-40.9 44.1-39.9l5 .3c8.5 .5 15.9 1.6 22.9 1.9 11.7 .5 22.2-1.2 34.6-11.6 4.2-3.5 7.6-6.5 13.3-7.5a17.5 17.5 0 0 1 13.6 2.2c10 6.6 11.4 22.7 11.9 34.5 .3 6.7 1.1 23 1.4 27.6 .6 10.7 3.4 12.2 9.1 14 3.2 1.1 6.2 1.8 10.5 3.1 13.2 3.7 21 7.5 26 12.3a16.4 16.4 0 0 1 4.7 9.3c1.6 11.4-8.8 25.4-36.3 38.2-46.7 21.7-93.7 14.5-100.5 13.7-20.2-2.7-31.6 23.3-19.6 41.2 22.6 33.4 122.4 20 151.4-21.4 .7-1 .1-1.6-.7-1-41.8 28.6-97.1 38.2-128.5 26-4.8-1.9-14.7-6.4-15.9-16.7 43.6 13.5 71 .7 71 .7s2-2.8-.6-2.5zm-68.5-5.7zm-83.4-187.5c16.7-19.4 37.4-36.2 55.8-45.6a.7 .7 0 0 1 1 1c-1.5 2.7-4.3 8.3-5.2 12.7a.8 .8 0 0 0 1.2 .8c11.5-7.8 31.5-16.2 49-17.3a.8 .8 0 0 1 .5 1.4 41.9 41.9 0 0 0 -7.7 7.7 .8 .8 0 0 0 .6 1.2c12.3 .1 29.7 4.4 41 10.7 .8 .4 .2 1.9-.6 1.7-69.6-15.9-123.1 18.5-134.5 26.8a.8 .8 0 0 1 -1-1.1z"})}),hn=()=>(0,a.jsx)("svg",{"aria-label":"Resume icon",role:"img",viewBox:"0 0 512 512",xmlns:"http://www.w3.org/2000/svg",children:(0,a.jsx)("path",{fill:"currentColor",d:"M433.9 97.95L350 14.05c-9-9-21.2-14.1-33.9-14.1H112c-26.5.1-48 21.6-48 48.1v416c0 26.5 21.5 48 48 48h288c26.5 0 48-21.5 48-48v-332.1c0-12.7-5.1-25-14.1-34zm-22.6 22.7c2.1 2.1 3.5 4.6 4.2 7.4H320v-95.5c2.8.7 5.3 2.1 7.4 4.2zM400 480.05H112c-8.8 0-16-7.2-16-16v-416c0-8.8 7.2-16 16-16h176v104c0 13.3 10.7 24 24 24h104v304c0 8.8-7.2 16-16 16zm-48-244v8c0 6.6-5.4 12-12 12H172c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm0 64v8c0 6.6-5.4 12-12 12H172c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm0 64v8c0 6.6-5.4 12-12 12H172c-6.6 0-12-5.4-12-12v-8c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12z"})}),pn=(Yt.div`
    position: fixed;
    z-index: 1;
    top: 1rem;
    right: 1rem;
    display: flex;
    flex: 1;
    align-items: center;
    justify-content: center;

    :active {
      -webkit-transform: scale(0.9);
      transform: scale(0.9);
    }
  `,Yt.input`
    border: 0;
    clip: rect(0 0 0 0);
    height: 1px;
    margin: -1px;
    overflow: hidden;
    padding: 0;
    position: absolute;
    width: 1px;
  `,Yt.label`
    cursor: pointer;
    display: flex;
    width: 1.5rem;
    height: 1.5rem;
    padding: 0.75rem;
    background-color: ${e=>{let{$theme:t}=e;return t.shadowColor}};
    border-radius: 25%;
    box-shadow: 0 0 0.25rem 0.25rem rgba(128, 128, 128, 0.25);
    align-items: center;
    justify-content: center;
    transition: background-color 0.5s linear;
    font-size: 0.5rem;
  `,Yt.span`
    position: absolute;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    border: 0;
    white-space: nowrap;
  `,{name:{display:"Test"},title:{display:"Test"},buttons:[{name:"github",display:"GitHub",ariaLabel:"GitHub profile (opens in new window)",icon:(0,a.jsx)(un,{}),href:"https://github.com/levvolkov/"},{name:"gmail",display:"Gmail",ariaLabel:"Gmail profile (opens in new window)",icon:(0,a.jsx)(dn,{}),href:"https://www.linkedin.com/in/"},{name:"resume",display:"Resume",ariaLabel:"Resume in Google Drive (opens in new window)",icon:(0,a.jsx)(hn,{}),href:"https://drive.google.com/file/d/1VQ_Oeim_e92QEMi64ejGWY5Hf4/view"},{name:"email",display:"Email",ariaLabel:"Email contact (opens in new window)",icon:(0,a.jsx)(cn,{}),href:"mailto:03011984lev@gmail.com"}]}),fn=()=>{const[e,n]=(0,t.useState)(!1),[i,o]=(0,t.useState)(!1);return(0,t.useEffect)((()=>{var e;null!==(e=window.matchMedia("(max-device-width: 820px) and (-webkit-min-device-pixel-ratio: 2)"))&&void 0!==e&&e.matches&&o(!0),n(!0)}),[]),e?(0,a.jsx)(d,{config:pn,isMobile:i,children:(0,a.jsxs)("main",{className:"app",children:[(0,a.jsx)(tn,{}),(0,a.jsx)(Zt,{}),(0,a.jsx)(on,{}),(0,a.jsx)(ln,{})]})}):(0,a.jsx)(a.Fragment,{})},vn=document.getElementById("root");if(!vn)throw new Error("Failed to get the root element.");(0,e.s)(vn).render((0,a.jsx)(t.StrictMode,{children:(0,a.jsx)(fn,{})}))}()}();
