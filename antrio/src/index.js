import RoomStore from './room-store.js';
const tilePaths = require('./tile-paths2');
const directions = require('./directions');

const roomStore = new RoomStore();
let editMode = false;

const topBarSize = 28;
const bottomBarSize = 28;
const tileSize = 16;
const tileSettings = {
  tileSize: tileSize,
  minDist: 0.01
};

let currentPose = {
  pos: [160, 96 - tileSettings.minDist],
  dir: directions.fromCardinal('E'),
  normal: directions.fromCardinal('N'),
};
let currentVelocity = 0.0;

const initialVelocity = 1.0;
const maxVelocity = 2.5;
const tileCodeProvider = {
  tileCodeAt: function (tileCoords) {
    const col = tileCoords[0];
    const row = roomStore.numRows - tileCoords[1] - 1;
    const tileCode = roomStore.getTileCode(row, col);
    return tileCode;
  }
};

let myGamePiece1 = undefined;
let myScore = undefined;
let myControlUp = undefined;
let myControlLeft = undefined;
let myControlRight = undefined;
let myControlDown = undefined;

const controlStates = {}; 
const keyMap = {
  k37: "left",
  k39: "right",
  k38: "up",
  k40: "down"
};
const tileCodeToTileNum = {
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
  myGamePiece1 = new component(160, 257, 16, 16, "sprite", "", "", 0, 16, 2);
  myScore = new component(16, 14, 0, 0, "text", "black", "");
  myControlUp = new component(60, 240, 42, 42, "sprite", "", "", 52, 0, 2);
  myControlLeft = new component(25, 275, 42, 44, "sprite", "", "", 10, 0, 2);
  myControlRight = new component(95, 275, 42, 44, "sprite", "", "", 31, 0, 2);
  myControlDown = new component(60, 310, 42, 42, "sprite", "", "", 74, 0, 2);
  myGameArea.start();
}

const myGameArea = {
  canvas: document.createElement("canvas"),
  touchPositions: [],
  mousePosition: null,
  start : function() {
    this.canvas.width = roomStore.numCols * tileSize;
    this.canvas.height = topBarSize + roomStore.numRows * tileSize + bottomBarSize;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.getElementById("gameAreaHolder"));

    this.frameNo = 0;
    this.interval = setInterval(updateGameArea, 30);
    let self = this;
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
    const rect = this.canvas.getBoundingClientRect();
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
  this.flip = false;
  this.width = width;
  this.height = height;
  this.type = type;
  this.text = text;
  this.color = color;
  this.spriteX = spriteX;
  this.spriteY = spriteY;
  this.update = function() {
    const ctx = myGameArea.context;
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
      if (this.flip) {
        ctx.scale(1, -1);
      }
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
  this.isClicked = function() {
    for (let i = 0; i < myGameArea.touchPositions.length; i++) {
      let touchPosition = myGameArea.touchPositions[i];
      let touching = this.crashWith({
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

    const motionDir = directions.fromArrows(
      controlStates["left"] || myControlLeft.isClicked(),
      controlStates["right"] || myControlRight.isClicked(),
      controlStates["up"] || myControlUp.isClicked(),
      controlStates["down"] || myControlDown.isClicked()
    );
    if (!directions.isNone(motionDir)) {
      currentVelocity += 0.25;
      if (currentVelocity > maxVelocity) {
        currentVelocity = maxVelocity;
      }
    } else {
      currentVelocity = initialVelocity;
    }

    const newPose = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, currentVelocity);
    currentPose = newPose;

    myGamePiece1.angle = directions.toRadians(currentPose.dir);
    myGamePiece1.flip = !directions.areEqual(currentPose.dir, directions.rotateClockwise(currentPose.normal, 2));
    const centrePos = directions.translateEuclidean(currentPose.pos, currentPose.normal, myGamePiece1.height / 2);
    myGamePiece1.x = centrePos[0];
    myGamePiece1.y = topBarSize + roomStore.numRows * tileSize - centrePos[1];

    myScore.text = roomStore.roomName;
    drawTiles();
    myScore.update();
    myGamePiece1.update();
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
