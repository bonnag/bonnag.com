import Matter from 'matter-js';
import RoomStore from './room-store.js';

var roomStore = new RoomStore();
var currentRoom = null;
var editMode = false;

// module aliases
var Engine = Matter.Engine,
    Render = Matter.Render,
    World = Matter.World,
    Bodies = Matter.Bodies;

// create an engine
var engine = Engine.create();

/*
var myGamePieceBody1 = Bodies.rectangle(140, 200, 16, 16);
var myGamePieceBody2 = Bodies.rectangle(120, 200, 16, 16);
var myGamePieceBody3 = Bodies.rectangle(100, 200, 16, 16);
*/
var myGamePieceBody1 = Bodies.circle(140, 200, 7);
var myGamePieceBody2 = Bodies.circle(120, 200, 7);
var myGamePieceBody3 = Bodies.circle(100, 200, 7);
var myGamePieceBody = Matter.Composite.create();
Matter.Composite.add(myGamePieceBody, myGamePieceBody1);
Matter.Composite.add(myGamePieceBody, myGamePieceBody2);
Matter.Composite.add(myGamePieceBody, myGamePieceBody3);
Matter.Composites.chain(myGamePieceBody, 0, 0, -0, 0, { stiffness: 0.5, length: 17 });
World.add(engine.world, [myGamePieceBody]);

var topBarSize = 28;
var bottomBarSize = 28;
var tileSize = 16;

var myGamePiece1 = undefined;
var myGamePiece2 = undefined;
var myGamePiece3 = undefined;
var myScore = undefined;
var myControlUp = undefined;
var myControlLeft = undefined;
var myControlRight = undefined;
var myControlDown = undefined;

var controlStates = {}; 
var keyMap = {
  k33: "spinAw",
  k34: "spinCw",
  k37: "left",
  k39: "right",
  k38: "up",
  k40: "down"
};
var tileCodeToTileNum = {
  " " : 1,
  "." : 2,
  "l" : 9,
  "m" : 5,
  "n" : 10,
  "q" : 4,
  "p" : 6,
  "u" : 8,
  "v" : 3,
  "w" : 7
};

function startGame() {
  roomStore.changeRoom(5050);
  window.addEventListener("keydown", function (e) {
    myGameArea.keys = (myGameArea.keys || []);
    var inputCode = ["k" + e.keyCode];
    var control = keyMap[inputCode];
    if (control) {
      controlStates[control] = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.keyCode === 69) { // key e
      editMode = !editMode;
      e.preventDefault();
      return;
    }
    var control = keyMap["k" + e.keyCode];
    if (control) {
      controlStates[control] = false;
      e.preventDefault();
    }
  });
  myGamePiece1 = new component(0, 0, 16, 16, "sprite", "", "", 0, 16, 2);
  myGamePiece1.link(myGamePieceBody1);
  myGamePiece2 = new component(0, 0, 16, 16, "sprite", "", "", 0, 8, 2);
  myGamePiece2.link(myGamePieceBody2);
  myGamePiece3 = new component(0, 0, 16, 16, "sprite", "", "", 0, 0, 2);
  myGamePiece3.link(myGamePieceBody3);
  myScore = new component(16, 14, 0, 0, "text", "black", "");
  myControlUp = new component(60, 200, 42, 42, "sprite", "", "", 52, 0, 2);
  myControlLeft = new component(25, 235, 42, 44, "sprite", "", "", 10, 0, 2);
  myControlRight = new component(95, 235, 42, 44, "sprite", "", "", 31, 0, 2);
  myControlDown = new component(60, 270, 42, 42, "sprite", "", "", 74, 0, 2);
  myGameArea.start();
}

var myGameArea = {
  canvas: document.createElement("canvas"),
  touchPositions: [],
  mousePosition: null,
  render: null,
  start : function() {
    this.canvas.width = roomStore.numCols * tileSize;
    this.canvas.height = topBarSize + roomStore.numRows * tileSize + bottomBarSize;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.getElementById("gameAreaHolder"));

    // for debugging
    this.render = Render.create({
      element: document.getElementById("debugAreaHolder"), //this.canvas,
      engine: engine,
      options: {
        width: this.canvas.width,
        height: this.canvas.height,
        pixelRatio: 1,
        background: '#fafafa',
        wireframeBackground: '#222',
        hasBounds: false,
        enabled: true,
        wireframes: true,
        showSleeping: true,
        showDebug: true,
        showBroadphase: false,
        showBounds: true,
        showVelocity: true,
        showCollisions: true,
        showSeparations: false,
        showAxes: false,
        showPositions: true,
        showAngleIndicator: false,
        showIds: false,
        showShadows: false,
        showVertexNumbers: false,
        showConvexHulls: true,
        showInternalEdges: true,
        showMousePosition: false        
      }
    });

    this.frameNo = 0;
    this.interval = setInterval(updateGameArea, 20);
    var self = this;
    this.canvas.addEventListener("mousedown", function (e) {
      self.touchPositions = [ self.getPointerPos(e) ];
      e.preventDefault();
    }, false);
    this.canvas.addEventListener("mouseup", function (e) {
      self.touchPositions = [];
      e.preventDefault();
    }, false);
    this.canvas.addEventListener("mousemove", function (e) {
      var mousePos = self.getPointerPos(e);
      self.mousePosition = mousePos;
      if (e.buttons > 0) {
        self.touchPositions = [ mousePos ];
      }
      e.preventDefault();
    }, false);
    this.canvas.addEventListener("touchstart", function (e) {
      self.touchPositions = [];
      for (var i = 0; i < e.targetTouches.length; i++) {
        self.touchPositions.push(self.getPointerPos(e.targetTouches[i]));
      }
      e.preventDefault();
    }, false);
    this.canvas.addEventListener("touchend", function (e) {
      self.touchPositions = [];
      for (var i = 0; i < e.targetTouches.length; i++) {
        self.touchPositions.push(self.getPointerPos(e.targetTouches[i]));
      }
      e.preventDefault();
    }, false);
    this.canvas.addEventListener("touchmove", function (e) {
      self.touchPositions = [];
      for (var i = 0; i < e.targetTouches.length; i++) {
        self.touchPositions.push(self.getPointerPos(e.targetTouches[i]));
      }
      e.preventDefault();
    }, false);
  },
  clear : function() {
      this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
  stop : function() {
      clearInterval(this.interval);
  },
  getPointerPos : function(pointerEvent) {
    var rect = this.canvas.getBoundingClientRect();
    return {
        x: pointerEvent.clientX - rect.left,
        y: pointerEvent.clientY - rect.top
    };
  }
}

function component(x, y, width, height, type, color, text, spriteX, spriteY, spriteScale) {
  this.body = null;
  this.x = x;
  this.y = y;
  this.angle = 0;
  this.width = width;
  this.height = height;
  this.type = type;
  this.text = text;
  this.color = color;
  this.spriteX = spriteX;
  this.spriteY = spriteY;
  this.update = function() {
    if (this.body) {
      this.x = this.body.position.x;
      this.y = this.body.position.y;
      this.angle = this.body.angle;
    }
    var ctx = myGameArea.context;
    if (this.type == "text") {
        ctx.font = "18px Consolas";
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, this.x, this.y);
    } else if (this.type == "sprite") {
      var img = document.getElementById("sprites");
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(this.x,this.y);
      ctx.rotate(this.angle);
      ctx.drawImage(img,this.spriteX,this.spriteY,this.width/spriteScale,this.height/spriteScale,-this.width/2,-this.height/2,this.width,this.height);
      ctx.restore();
    } else if (this.type == "rect") {
      ctx.save();
      ctx.fillStyle = color;
      ctx.translate(this.x,this.y);
      ctx.rotate(this.angle);
      ctx.fillRect(-this.width/2, -this.height/2, this.width, this.height);
      ctx.restore();
    }
  };
  this.link = function(body) {
    this.body = body;
  };
  this.isClicked = function() {
    for (var i = 0; i < myGameArea.touchPositions.length; i++) {
      var touchPosition = myGameArea.touchPositions[i];
      var touching = this.crashWith({
        x: touchPosition.x,
        y: touchPosition.y,
        width: 0.5,
        height: 0.5,
      });
      if (touching) return true;
    }
    return false;
  };
  this.crashWith = function(otherobj) {
    var myleft = this.x - this.width/2;
    var myright = this.x + this.width/2;
    var mytop = this.y - this.height/2;
    var mybottom = this.y + this.height/2
    var otherleft = otherobj.x - otherobj.width/2;
    var otherright = otherobj.x + otherobj.width/2;
    var othertop = otherobj.y - otherobj.height/2;
    var otherbottom = otherobj.y + otherobj.height/2;
    var crash = true;
    if ((mybottom < othertop) || (mytop > otherbottom) || (myright < otherleft) || (myleft > otherright)) {
        crash = false;
    }
    return crash;
  };
}

function drawTiles() {
  for (var row = 0; row < roomStore.numRows; row++) {
    for (var col = 0; col < roomStore.numCols; col++) {
      var tileCode = roomStore.getTileCode(row, col);
      var tileNum = tileCodeToTileNum[tileCode];
      if (!tileNum) tileNum = 1;
      var tx = col * tileSize + tileSize/2;
      var ty = topBarSize + row * tileSize + tileSize/2;
      var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum-1)*9, 26, 2);
      tileComp.update();
    }
  }
}

var tileChooserCurrentCode = " ";
var tileChooserCodes = [" ", ".", "l", "m", "n", "q", "p", "u", "v", "w"];
function drawTileChooser() {
  for (var i = 0; i < tileChooserCodes.length; i++) {
    var tileCode = tileChooserCodes[i];
    var tileNum = tileCodeToTileNum[tileCode];
    var tx = 120 + i * (tileSize + 8);
    var ty = tileSize/2 + 6;
    var tileBorderColour = (tileCode === tileChooserCurrentCode) ? "#ff8888" : "#dddddd";
    var tileBorder = new component(tx, ty, 20, 20, "rect", tileBorderColour);
    tileBorder.update();
    if (tileBorder.isClicked()) {
      tileChooserCurrentCode = tileCode;
    }
    var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum-1)*9, 26, 2);
    tileComp.update();
  }
}

function replaceCharInStr(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
}

function drawChosenTile() {
  if (myGameArea.mousePosition) {
    var x = myGameArea.mousePosition.x;
    var y = myGameArea.mousePosition.y - topBarSize;
    var row = Math.floor(y / tileSize);
    var col = Math.floor(x / tileSize);
    if (row <= 0 || row >= roomStore.numRows - 1) return;
    if (col <= 0 || col >= roomStore.numCols - 1) return;
    var tx = col * tileSize + tileSize/2;
    var ty = topBarSize + row * tileSize + tileSize/2;
    var tileNum = tileCodeToTileNum[tileChooserCurrentCode];
    var tileBorderColour = "#ff8888";
    var tileBorder = new component(tx, ty, 20, 20, "rect", tileBorderColour);
    tileBorder.update();
    if (tileBorder.isClicked()) {
      roomStore.editTileCode(row, col, tileChooserCurrentCode);
    }
    var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum-1)*9, 26, 2.5);
    tileComp.update();
  }
}

function updateGameArea() {

    myGameArea.clear();

    if (!roomStore.isLoaded) {
      myScore.text = "Loading ...";
      myScore.update();
      return;
    }
    if (editMode) {
      myScore.text = "Edit Mode";
      myScore.update();
      drawTileChooser();
      drawTiles();
      drawChosenTile();
      return;
    }
    myGameArea.frameNo += 1;
    var maxControlVelocity = 1.0;
    var maxControlForceMagnitude = 0.002;
    var controlForceX = 0.0;
    var controlForceY = 0.0;
    var controlForceT = 0.0;
    if (controlStates["left"] || myControlLeft.isClicked()) { controlForceX = -maxControlForceMagnitude; }
    if (controlStates["right"] || myControlRight.isClicked()) { controlForceX = maxControlForceMagnitude; }
    if (controlStates["up"] || myControlUp.isClicked()) { controlForceY = -maxControlForceMagnitude; }
    if (controlStates["down"] || myControlDown.isClicked()) { controlForceY = maxControlForceMagnitude; }
    if (controlStates["spinAw"]) {
      controlForceT = -maxControlForceMagnitude;
    }
    if (controlStates["spinCw"]) { 
      controlForceT = maxControlForceMagnitude;
    }
    if (myGamePieceBody1.velocity.y < -maxControlVelocity) {
      controlForceY = Math.max(0.0, controlForceY);
    }
    if (myGamePieceBody1.velocity.y > maxControlVelocity) {
      controlForceY = Math.min(0.0, controlForceY);
    }
    if (myGamePieceBody1.velocity.x < -maxControlVelocity) {
      controlForceX = Math.max(0.0, controlForceX);
    }
    if (myGamePieceBody1.velocity.x > maxControlVelocity) {
      controlForceX = Math.min(0.0, controlForceX);
    }
    Matter.Body.applyForce(myGamePieceBody1, myGamePieceBody1.position, {x:controlForceX, y:controlForceY});
    Matter.Body.applyForce(myGamePieceBody2, myGamePieceBody2.position, {x:controlForceX, y:controlForceY});
    Matter.Body.applyForce(myGamePieceBody3, myGamePieceBody3.position, {x:controlForceX, y:controlForceY});
    Matter.Body.applyForce(myGamePieceBody1, {x:myGamePieceBody1.position.x - 10, y:myGamePieceBody1.position.y}, {x:0.0, y:-controlForceT});
    Matter.Body.applyForce(myGamePieceBody1, {x:myGamePieceBody1.position.x + 10, y:myGamePieceBody1.position.y}, {x:0.0, y:+controlForceT});
    myScore.text = roomStore.roomName;
    drawTiles();
    var tempBodies = [];
    for (var row = 0; row < roomStore.numRows; row++) {
      for (var col = 0; col < roomStore.numCols; col++) {
        var tileCode = roomStore.getTileCode(row, col);
        var tileNum = tileCodeToTileNum[tileCode];
        if (!tileNum) continue;
        var tx = col * tileSize + tileSize/2;
        var ty = topBarSize + row * tileSize + tileSize/2;
        if ((Math.abs(tx - myGamePieceBody1.position.x) + Math.abs(ty - myGamePieceBody1.position.y)) < 60 ||
            (Math.abs(tx - myGamePieceBody3.position.x) + Math.abs(ty - myGamePieceBody3.position.y)) < 60) {
          if (tileCode == '.' || tileCode == 'p' || tileCode == 'q' || tileCode == 'v' || tileCode == 'm') {
            var tileBody = Bodies.rectangle(tx, ty, tileSize, tileSize, { isStatic: true });
            tempBodies.push(tileBody);
          } else if (tileCode === "l") {
            var tileBody = Bodies.polygon(tx - tileSize*0.3, ty - tileSize*0.3, 3, tileSize * 0.7, { isStatic: true, angle: Math.PI * 0.25 });
            tempBodies.push(tileBody);
          } else if (tileCode === "n") {
            // TODO - angle looks wrong
            var tileBody = Bodies.polygon(tx + tileSize*0.3, ty - tileSize*0.3, 3, tileSize * 0.7, { isStatic: true, angle: Math.PI * 0.75 });
            tempBodies.push(tileBody);
          } else if (tileCode === "u") {
            var tileBody = Bodies.polygon(tx - tileSize*0.3, ty + tileSize*0.3, 3, tileSize * 0.7, { isStatic: true, angle: Math.PI * 1.75 });
            tempBodies.push(tileBody);
          } else if (tileCode === "w") {
            // TODO - angle looks wrong
            var tileBody = Bodies.polygon(tx + tileSize*0.3, ty + tileSize*0.3, 3, tileSize * 0.7, { isStatic: true, angle: Math.PI * 1.25 });
            tempBodies.push(tileBody);
          }
        }
      }
    }
    World.add(engine.world, tempBodies);
    Engine.update(engine);
    myScore.update();
    myGamePiece1.update();
    myGamePiece2.update();
    myGamePiece3.update();
    Render.world(myGameArea.render);
    for (var i = 0; i < tempBodies.length; i += 1) {
      World.remove(engine.world, tempBodies[i]);
    }
    myControlUp.update();
    myControlLeft.update();
    myControlRight.update();
    myControlDown.update();
}

function everyinterval(n) {
    if ((myGameArea.frameNo / n) % 1 == 0) {return true;}
    return false;
}

window.addEventListener('load', startGame, false);
