// modules are defined as an array
// [ module function, map of requires ]
//
// map of requires is short require name -> numeric require
//
// anything defined in a previous bundle is accessed via the
// orig method which is the require for previous bundles
parcelRequire = (function (modules, cache, entry, globalName) {
  // Save the require from previous bundle to this closure if any
  var previousRequire = typeof parcelRequire === 'function' && parcelRequire;
  var nodeRequire = typeof require === 'function' && require;

  function newRequire(name, jumped) {
    if (!cache[name]) {
      if (!modules[name]) {
        // if we cannot find the module within our internal map or
        // cache jump to the current global require ie. the last bundle
        // that was added to the page.
        var currentRequire = typeof parcelRequire === 'function' && parcelRequire;
        if (!jumped && currentRequire) {
          return currentRequire(name, true);
        }

        // If there are other bundles on this page the require from the
        // previous one is saved to 'previousRequire'. Repeat this as
        // many times as there are bundles until the module is found or
        // we exhaust the require chain.
        if (previousRequire) {
          return previousRequire(name, true);
        }

        // Try the node require function if it exists.
        if (nodeRequire && typeof name === 'string') {
          return nodeRequire(name);
        }

        var err = new Error('Cannot find module \'' + name + '\'');
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }

      localRequire.resolve = resolve;
      localRequire.cache = {};

      var module = cache[name] = new newRequire.Module(name);

      modules[name][0].call(module.exports, localRequire, module, module.exports, this);
    }

    return cache[name].exports;

    function localRequire(x){
      return newRequire(localRequire.resolve(x));
    }

    function resolve(x){
      return modules[name][1][x] || x;
    }
  }

  function Module(moduleName) {
    this.id = moduleName;
    this.bundle = newRequire;
    this.exports = {};
  }

  newRequire.isParcelRequire = true;
  newRequire.Module = Module;
  newRequire.modules = modules;
  newRequire.cache = cache;
  newRequire.parent = previousRequire;
  newRequire.register = function (id, exports) {
    modules[id] = [function (require, module) {
      module.exports = exports;
    }, {}];
  };

  var error;
  for (var i = 0; i < entry.length; i++) {
    try {
      newRequire(entry[i]);
    } catch (e) {
      // Save first error but execute all entries
      if (!error) {
        error = e;
      }
    }
  }

  if (entry.length) {
    // Expose entry point to Node, AMD or browser globals
    // Based on https://github.com/ForbesLindesay/umd/blob/master/template.js
    var mainExports = newRequire(entry[entry.length - 1]);

    // CommonJS
    if (typeof exports === "object" && typeof module !== "undefined") {
      module.exports = mainExports;

    // RequireJS
    } else if (typeof define === "function" && define.amd) {
     define(function () {
       return mainExports;
     });

    // <script>
    } else if (globalName) {
      this[globalName] = mainExports;
    }
  }

  // Override the current require with this new one
  parcelRequire = newRequire;

  if (error) {
    // throw error from earlier, _after updating parcelRequire_
    throw error;
  }

  return newRequire;
})({"src/room-store.js":[function(require,module,exports) {
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

class RoomStore {
  constructor() {
    this.numCols = 42;
    this.numRows = 20;
    this.isLoaded = false;
    this.roomName = '';
    this.roomNumber = '';
    this._tileCodeRows = null;
    this._version = 0;
    this._getRequestInFlight = false;
    this._targetRoomNumber = '';
    this._unsavedEdits = [];
    this._inFlightEdits = [];
    window.setInterval(this._handleAmbientTick.bind(this), 1000);
  }

  _handleAmbientTick() {
    if (this._unsavedEdits.length > 0 && this._inFlightEdits.length === 0) {
      let xhr = new XMLHttpRequest();
      xhr.open('PUT', 'https://antr.io/rooms/' + this.roomNumber);

      let editRequest = this._buildEditRequest();

      this._inFlightEdits = this._unsavedEdits;
      this._unsavedEdits = [];
      xhr.setRequestHeader('Content-Type', 'application/json');
      let self = this;

      xhr.onload = function () {
        if (xhr.status === 204) {
          self._inFlightEdits = [];
          self._version++;
        } else {
          self._unsavedEdits = self._inFlightEdits.concat(self._unsavedEdits);
          self._inFlightEdits = [];
        }
      };

      xhr.send(JSON.stringify(editRequest));
      return;
    }

    if (this._targetRoomNumber !== this.roomNumber && !this._getRequestInFlight && this.isSaved()) {
      this.isLoaded = false;
      this.roomName = 'Loading ...';
      let xhr = new XMLHttpRequest();
      xhr.open('GET', 'https://antr.io/rooms/' + this._targetRoomNumber);
      xhr.setRequestHeader('Content-Type', 'application/json');
      let self = this;

      xhr.onload = function () {
        if (xhr.status === 200) {
          let roomResponse = JSON.parse(xhr.responseText);

          self._handleRoomResponse(roomResponse);
        }

        self._getRequestInFlight = false;
      };

      this._getRequestInFlight = true;
      xhr.send();
      return;
    }
  }

  _handleRoomResponse(roomResponse) {
    this.roomName = roomResponse.name;
    this.roomNumber = roomResponse.number;
    this._tileCodeRows = roomResponse.tileCodeRows;
    this._version = roomResponse.version;
    this.isLoaded = true;
  }

  isSaved() {
    return this._unsavedEdits.length === 0 && this._inFlightEdits.length === 0;
  }

  changeRoom(roomNum) {
    let roomNumber = '' + roomNum;
    this._targetRoomNumber = roomNumber;
    this.isLoaded = false;
    this.roomName = 'Loading ...';
  }

  getTileCode(row, col) {
    if (!this.isLoaded) {
      throw new Error('cannot get tiles for room that has not loaded');
    }

    return this._tileCodeRows[row][col];
  }

  editTileCode(row, col, newTileCode) {
    if (!this.isLoaded) {
      throw new Error('cannot edit room that has not loaded');
    } // TODO - check bounds?


    this._tileCodeRows[row] = this._replaceCharInStr(this._tileCodeRows[row], col, newTileCode);

    this._unsavedEdits.push({
      x: col,
      y: row,
      tileCode: newTileCode
    });
  }

  _buildEditRequest() {
    return {
      number: this.roomNumber,
      existingVersion: this._version,
      tileEdits: this._unsavedEdits.slice(),
      optionalNewName: null
    };
  }

  _replaceCharInStr(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
  }

}

exports.default = RoomStore;
},{}],"src/directions.js":[function(require,module,exports) {
/*
 * antR.io uses a slightly unusual geometry (sometimes called Chebyshev distance or chess-board distance) where:
 *  1) the only movement directions are the 8 cardinal compass points (N, NE, E, SE, S, SW, W, NW)
 *     (well, and there's a 'Z' to represent not moving at all - not sure how useful really)
 *  2) moving one unit NE is the same as moving one unit N and one unit E
 *     (e.g. moving from [1,1] to [3,3] is the same distance as moving from [1,1] to [3,1])
*/
const None = 'Z';
const All = ['Z', 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

function areEqual(dirA, dirB) {
  return dirA === dirB;
}

function fromCardinal(cardinal) {
  switch (cardinal) {
    case 'N':
    case 'NE':
    case 'E':
    case 'SE':
    case 'S':
    case 'SW':
    case 'W':
    case 'NW':
    case 'Z':
      return cardinal;

    default:
      throw new Error('unsupported direction ' + cardinal);
  }
}

function toCardinal(dir) {
  return dir;
}

function isNone(dir) {
  return dir === 'Z';
}

function isVertical(dir) {
  return dir === 'N' || dir === 'S';
}

function isHorizontal(dir) {
  return dir === 'E' || dir === 'W';
}

function isDiagonal(dir) {
  return dir === 'NE' || dir === 'SE' || dir === 'SW' || dir === 'NW';
}

function toOrdinal(dir) {
  switch (dir) {
    case 'N':
      return 0;

    case 'NE':
      return 1;

    case 'E':
      return 2;

    case 'SE':
      return 3;

    case 'S':
      return 4;

    case 'SW':
      return 5;

    case 'W':
      return 6;

    case 'NW':
      return 7;

    default:
      throw new Error('unsupported direction ' + dir);
  }
}

function fromOrdinal(num) {
  if (num < -8 || num > 15) {
    throw new Error('out of range');
  }

  if (num < 0) {
    num += 8;
  } else if (num >= 8) {
    num -= 8;
  }

  switch (num) {
    case 0:
      return 'N';

    case 1:
      return 'NE';

    case 2:
      return 'E';

    case 3:
      return 'SE';

    case 4:
      return 'S';

    case 5:
      return 'SW';

    case 6:
      return 'W';

    case 7:
      return 'NW';

    default:
      throw new Error('unsupported ordinal ' + num);
  }
}

function toRadians(dir) {
  return (toOrdinal(dir) - 2) / 8.0 * Math.PI * 2.0;
}

function fromArrows(left, right, up, down) {
  if (left && !right && !up && !down) {
    return 'W';
  } else if (!left && right && !up && !down) {
    return 'E';
  } else if (!left && !right && up && !down) {
    return 'N';
  } else if (left && !right && up && !down) {
    return 'NW';
  } else if (!left && right && up && !down) {
    return 'NE';
  } else if (!left && !right && !up && down) {
    return 'S';
  } else if (left && !right && !up && down) {
    return 'SW';
  } else if (!left && right && !up && down) {
    return 'SE';
  }

  return 'Z';
}

function isSameOrNextTo(dirA, dirB) {
  if (dirA === dirB) {
    return true;
  }

  if (isNone(dirA) || isNone(dirB)) {
    return false;
  }

  const ordA = toOrdinal(dirA);
  const ordB = toOrdinal(dirB);
  return (ordA + 1) % 8 == ordB || (ordB + 1) % 8 == ordA;
}

function actsOn(motionDir, pathDir) {
  if (isSameOrNextTo(motionDir, pathDir)) {
    return {
      effect: 1,
      dir: pathDir
    };
  } else if (isSameOrNextTo(reverse(motionDir), pathDir)) {
    return {
      effect: -1,
      dir: reverse(pathDir)
    };
  } else {
    return {
      effect: 0,
      dir: None
    };
  }
}

function reverse(dir) {
  return rotateClockwise(dir, 4);
}

function rotateClockwise(dir, numPoints) {
  if (numPoints < -8 || numPoints > 8) {
    throw new Error('out of range');
  }

  if (isNone(dir)) {
    return dir;
  }

  return fromOrdinal(toOrdinal(dir) + numPoints);
}

function andEitherSide(dir) {
  if (isNone(dir)) {
    return [dir];
  }

  return [dir, rotateClockwise(dir, -1), rotateClockwise(dir, +1)];
} // distance is never negative


function chebyshevDistanceBetween(posA, posB) {
  return Math.max(Math.abs(posA[0] - posB[0]), Math.abs(posA[1] - posB[1]));
} // back in the real-world, how far is it between two points?


function euclideanDistanceBetween(posA, posB) {
  return Math.sqrt(Math.pow(posA[0] - posB[0], 2) + Math.pow(posA[1] - posB[1], 2));
} // the direction to move from fromPos to get closest to toPos


function bestDirBetween(fromPos, toPos) {
  const idealDist = chebyshevDistanceBetween(fromPos, toPos);
  let bestDist = undefined;
  let bestDir = undefined;

  for (let tryDir of All) {
    let tryPos = translateChebyshev(fromPos, tryDir, idealDist);
    let tryDist = chebyshevDistanceBetween(tryPos, toPos);

    if (!bestDir || tryDist < bestDist) {
      bestDist = tryDist;
      bestDir = tryDir;
    }
  }

  return bestDir;
} // distance can be negative (moves in reverse direction)


function translateChebyshev(pos, dir, distance) {
  switch (dir) {
    case 'Z':
      return [pos[0], pos[1]];

    case 'N':
      return [pos[0], pos[1] + distance];

    case 'NE':
      return [pos[0] + distance, pos[1] + distance];

    case 'E':
      return [pos[0] + distance, pos[1]];

    case 'SE':
      return [pos[0] + distance, pos[1] - distance];

    case 'S':
      return [pos[0], pos[1] - distance];

    case 'SW':
      return [pos[0] - distance, pos[1] - distance];

    case 'W':
      return [pos[0] - distance, pos[1]];

    case 'NW':
      return [pos[0] - distance, pos[1] + distance];

    default:
      throw new Error('unsupported direction ' + dir);
  }
} // distance can be negative (moves in reverse direction)


function translateEuclidean(pos, dir, distance) {
  return translateChebyshev(pos, dir, isDiagonal(dir) ? distance * Math.sqrt(2) * 0.5 : distance);
}

function isOnLine(linePointPos, lineDir, pos, tolerance) {
  if (tolerance < 0) {
    throw new Error('tolerance out of range');
  }

  const snappedPos = snapToLine(linePointPos, lineDir, pos);
  const snapDist = chebyshevDistanceBetween(pos, snappedPos);
  return snapDist < tolerance;
}

function addVec(a, b) {
  return [a[0] + b[0], a[1] + b[1]];
}

function subVec(a, b) {
  return [a[0] - b[0], a[1] - b[1]];
}

function scaleVec(v, s) {
  return [v[0] * s, v[1] * s];
}

function snapToLine(linePointPos, lineDir, pos) {
  const relPos = subVec(pos, linePointPos);
  let snappedRelPos = undefined;

  switch (lineDir) {
    case 'Z':
      snappedRelPos = [0, 0];
      break;

    case 'N':
    case 'S':
      snappedRelPos = [0, relPos[1]];
      break;

    case 'E':
    case 'W':
      snappedRelPos = [relPos[0], 0];
      break;

    case 'NE':
    case 'SW':
      {
        const mean = 0.5 * (relPos[0] + relPos[1]);
        snappedRelPos = [mean, mean];
        break;
      }

    case 'NW':
    case 'SE':
      {
        const mean = 0.5 * (relPos[0] - relPos[1]);
        snappedRelPos = [mean, -mean];
        break;
      }

    default:
      throw new Error('bad direction ' + lineDir);
  }

  return addVec(snappedRelPos, linePointPos);
}

module.exports = {
  None: None,
  All: All,
  areEqual: areEqual,
  fromCardinal: fromCardinal,
  fromArrows: fromArrows,
  toCardinal: toCardinal,
  toRadians: toRadians,
  isNone: isNone,
  isVertical: isVertical,
  isHorizontal: isHorizontal,
  isDiagonal: isDiagonal,
  actsOn: actsOn,
  reverse: reverse,
  rotateClockwise: rotateClockwise,
  andEitherSide: andEitherSide,
  translateChebyshev: translateChebyshev,
  translateEuclidean: translateEuclidean,
  chebyshevDistanceBetween: chebyshevDistanceBetween,
  euclideanDistanceBetween: euclideanDistanceBetween,
  bestDirBetween: bestDirBetween,
  snapToLine: snapToLine,
  isOnLine: isOnLine,
  addVec: addVec,
  subVec: subVec,
  scaleVec: scaleVec
};
},{}],"src/tile-paths2.js":[function(require,module,exports) {
function _slicedToArray(arr, i) { return _arrayWithHoles(arr) || _iterableToArrayLimit(arr, i) || _nonIterableRest(); }

function _nonIterableRest() { throw new TypeError("Invalid attempt to destructure non-iterable instance"); }

function _iterableToArrayLimit(arr, i) { var _arr = []; var _n = true; var _d = false; var _e = undefined; try { for (var _i = arr[Symbol.iterator](), _s; !(_n = (_s = _i.next()).done); _n = true) { _arr.push(_s.value); if (i && _arr.length === i) break; } } catch (err) { _d = true; _e = err; } finally { try { if (!_n && _i["return"] != null) _i["return"](); } finally { if (_d) throw _e; } } return _arr; }

function _arrayWithHoles(arr) { if (Array.isArray(arr)) return arr; }

const directions = require('./directions');

const epsilon = 1e-8;

function quantize(tileSettings, currentPos) {
  const tileSize = tileSettings.tileSize;
  const tileCoords = [Math.floor(currentPos[0] / tileSize), Math.floor(currentPos[1] / tileSize)];
  const tileRelativePos = [currentPos[0] - tileCoords[0] * tileSize, currentPos[1] - tileCoords[1] * tileSize];
  const tileOriginPos = directions.scaleVec(tileCoords, tileSize);
  return [tileCoords, tileRelativePos, tileOriginPos];
}

function move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance) {
  const moves = computeMoves(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  const idealPos = directions.translateChebyshev(currentPose.pos, motionDir, motionDistance);
  let bestDist = undefined;
  let bestMove = undefined;

  for (let tryMove of moves.concat([currentPose])) {
    let tryDist = directions.chebyshevDistanceBetween(tryMove.pos, idealPos);

    if (!bestMove || tryDist < bestDist) {
      bestDist = tryDist;
      bestMove = tryMove;
    }
  }

  return bestMove;
}

function getTilePaths(tileSettings, tileCode) {
  const tileSize = tileSettings.tileSize;
  const minDist = tileSettings.minDist;
  const tileSizeMinusMinDist = tileSize - minDist;
  let tilePaths = [];

  if (tileCode === 'v') {
    // grass-at-top
    tilePaths = [{
      tileRelativeLinePos: [0, tileSizeMinusMinDist],
      startToEndDir: directions.fromCardinal('E')
    }];
  } else if (tileCode === 'q') {
    // grass-at-right
    tilePaths = [{
      tileRelativeLinePos: [tileSizeMinusMinDist, tileSize],
      startToEndDir: directions.fromCardinal('S')
    }];
  } else if (tileCode === 'm') {
    // grass-at-bottom
    tilePaths = [{
      tileRelativeLinePos: [tileSize, minDist],
      startToEndDir: directions.fromCardinal('W')
    }];
  } else if (tileCode === 'p') {
    // grass-at-left
    tilePaths = [{
      tileRelativeLinePos: [minDist, 0],
      startToEndDir: directions.fromCardinal('N')
    }];
  } else if (tileCode === 'w') {
    // grass-up-and-right-above
    tilePaths = [{
      tileRelativeLinePos: [0, 0],
      startToEndDir: directions.fromCardinal('NE')
    }];
  } else if (tileCode === 'u') {
    // grass-down-and-right-above
    tilePaths = [{
      tileRelativeLinePos: [0, tileSize],
      startToEndDir: directions.fromCardinal('SE')
    }];
  } else if (tileCode === 'l') {
    // grass-down-and-left-below
    tilePaths = [{
      tileRelativeLinePos: [tileSize, tileSize],
      startToEndDir: directions.fromCardinal('SW')
    }];
  } else if (tileCode === 'n') {
    // grass-up-and-left-below
    tilePaths = [{
      tileRelativeLinePos: [tileSize, 0],
      startToEndDir: directions.fromCardinal('NW')
    }];
  }

  return tilePaths;
}

function computeMoves(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance) {
  const _quantize = quantize(tileSettings, currentPose.pos),
        _quantize2 = _slicedToArray(_quantize, 3),
        tileCoords = _quantize2[0],
        tileRelativePos = _quantize2[1],
        tileOriginPos = _quantize2[2];

  return computeMovesR(currentPose, tileSettings, tileCodeProvider, tileCoords, tileRelativePos, tileOriginPos, motionDir, motionDistance, 0);
}

function computeMovesR(originalPose, tileSettings, tileCodeProvider, tileCoords, dubiousTileRelativePos, tileOriginPos, motionDir, motionDistance, depth) {
  if (motionDistance < -epsilon) {
    throw new Error('motionDistance cannot be negative');
  }

  if (motionDistance < tileSettings.minDist) {
    return [];
  }

  if (directions.isNone(motionDir)) {
    return [];
  }

  const tileCode = tileCodeProvider.tileCodeAt(tileCoords);
  const tilePaths = getTilePaths(tileSettings, tileCode);

  if (tilePaths.length < 1) {
    return [];
  }

  if (tilePaths.length > 1) {
    throw new Error('multiple paths in one tile not supported');
  }

  const tilePath = tilePaths[0];
  const tileMoveSnapTolerance = tileSettings.minDist * 2 + epsilon;
  const snapTolerance = depth == 0 ? epsilon : tileMoveSnapTolerance;
  const tileRelativePos = maybeSnapToTilePath(tileSettings, tilePath, dubiousTileRelativePos, snapTolerance);

  if (!tileRelativePos) {
    return [];
  }

  const snapDist = directions.chebyshevDistanceBetween(dubiousTileRelativePos, tileRelativePos);

  if (snapDist > motionDistance) {
    return [];
  }

  let remainingMotionDistance = motionDistance - snapDist;
  const moves = [];
  const possibleDirs = directions.andEitherSide(motionDir);

  for (let possibleDir of possibleDirs) {
    let tileMoveResult = maybeMoveInTilePath(tileSettings, tilePath, tileRelativePos, possibleDir, remainingMotionDistance);

    if (!tileMoveResult) {
      tileMoveResult = {
        tileRelativePos: tileRelativePos,
        dir: originalPose.dir,
        normal: directions.rotateClockwise(tilePath.startToEndDir, -2)
      };
    }

    let achievedMotionDistance = directions.chebyshevDistanceBetween(tileRelativePos, tileMoveResult.tileRelativePos);
    let stillRemainingMotionDistance = remainingMotionDistance - achievedMotionDistance;

    if (stillRemainingMotionDistance < tileSettings.minDist + epsilon) {
      moves.push(tileMoveResultToMoveResult(tileMoveResult, tileOriginPos));
      continue;
    }

    let foundMoreMoves = false;

    if (depth == 0) {
      for (let ndtrp of generateNeighbouringDubiousTileRelativePositions(tileSettings, tileCoords, tileMoveResult.tileRelativePos)) {
        let moreMoves = computeMovesR(originalPose, tileSettings, tileCodeProvider, ndtrp.tileCoords, ndtrp.dubiousTileRelativePos, ndtrp.tileOriginPos, motionDir, stillRemainingMotionDistance, depth + 1);

        if (moreMoves.length > 0) {
          foundMoreMoves = true;
          moves.push(...moreMoves);
        }
      }
    } // TODO - maybe we should just always do this and let move choose the best ?


    if (!foundMoreMoves) {
      moves.push(tileMoveResultToMoveResult(tileMoveResult, tileOriginPos));
    }
  }

  return moves;
}

function tileMoveResultToMoveResult(tileMoveResult, tileOriginPos) {
  return {
    pos: addVec(tileOriginPos, tileMoveResult.tileRelativePos),
    dir: tileMoveResult.dir,
    normal: tileMoveResult.normal
  };
}

function addVec(posA, posB) {
  return [posA[0] + posB[0], posA[1] + posB[1]];
}

function maybeMoveInTilePath(tileSettings, tilePath, tileRelativePos, motionDir, motionDistance) {
  if (motionDistance < -epsilon) {
    throw new Error('motionDistance cannot be negative');
  }

  if (motionDistance < tileSettings.minDist) {
    return undefined;
  }

  if (directions.isNone(motionDir)) {
    return undefined;
  }

  const effectOfMotion = directions.actsOn(motionDir, tilePath.startToEndDir);

  if (effectOfMotion.effect == 0) {
    return undefined;
  }

  const unclippedNewTileRelativePos = directions.translateChebyshev(tileRelativePos, effectOfMotion.dir, motionDistance);
  const distTooFar = outOfTileBy(tileSettings, unclippedNewTileRelativePos);
  const newTileRelativePos = directions.translateChebyshev(unclippedNewTileRelativePos, effectOfMotion.dir, -distTooFar);
  return {
    tileRelativePos: newTileRelativePos,
    dir: effectOfMotion.dir,
    normal: directions.rotateClockwise(tilePath.startToEndDir, -2)
  };
}

function* generateNeighbouringDubiousTileRelativePositions(tileSettings, tileCoords, tileRelativePos) {
  for (let dir of directions.All) {
    if (directions.isNone(dir)) {
      continue;
    }

    let offsetCoords = directions.translateChebyshev([0, 0], dir, 1);
    let oppositeOffsetRelativePos = directions.translateChebyshev([0, 0], dir, -tileSettings.tileSize);
    let otherTileCoords = directions.addVec(tileCoords, offsetCoords);
    let otherTileRelativePos = directions.addVec(tileRelativePos, oppositeOffsetRelativePos);
    yield {
      tileCoords: otherTileCoords,
      dubiousTileRelativePos: otherTileRelativePos,
      tileOriginPos: directions.scaleVec(otherTileCoords, tileSettings.tileSize)
    };
  }
}

function maybeSnapToTilePath(tileSettings, tilePath, dubiousTileRelativePos, tolerance) {
  const unclippedSnappedTileRelativePos = directions.snapToLine(tilePath.tileRelativeLinePos, tilePath.startToEndDir, dubiousTileRelativePos);
  const outOfBoundsBy = outOfTileBy(tileSettings, unclippedSnappedTileRelativePos); // TODO - using the centre is a bit questionable

  const tileRelativeCentrePos = [0.5 * tileSettings.tileSize, 0.5 * tileSettings.tileSize];
  const backInBoundsDir = directions.bestDirBetween(unclippedSnappedTileRelativePos, tileRelativeCentrePos);
  const backInBoundsTileRelativePos = directions.translateChebyshev(unclippedSnappedTileRelativePos, backInBoundsDir, outOfBoundsBy);
  const reSnappedTileRelativePos = directions.snapToLine(tilePath.tileRelativeLinePos, tilePath.startToEndDir, backInBoundsTileRelativePos);
  const snapDist = directions.chebyshevDistanceBetween(dubiousTileRelativePos, reSnappedTileRelativePos);

  if (snapDist < tolerance) {
    return reSnappedTileRelativePos;
  } else {
    return undefined;
  }
}

function outOfTileBy(tileSettings, tileRelativePos) {
  return Math.max(outOfTileByComponent(tileSettings, tileRelativePos[0]), outOfTileByComponent(tileSettings, tileRelativePos[1]));
}

function outOfTileByComponent(tileSettings, tileRelativePosComponent) {
  // TODO - should this be minDist or epsilon?
  const tileSizeMinusMinDist = tileSettings.tileSize - tileSettings.minDist;

  if (tileRelativePosComponent < 0) {
    return 0 - tileRelativePosComponent;
  }

  if (tileRelativePosComponent > tileSizeMinusMinDist) {
    return tileRelativePosComponent - tileSizeMinusMinDist;
  }

  return 0;
}

module.exports = {
  quantize: quantize,
  move: move,
  computeMoves: computeMoves
};
},{"./directions":"src/directions.js"}],"src/index.js":[function(require,module,exports) {
"use strict";

var _roomStore = _interopRequireDefault(require("./room-store.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const tilePaths = require('./tile-paths2');

const directions = require('./directions');

const roomStore = new _roomStore.default();
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
  normal: directions.fromCardinal('N')
};
let currentVelocity = 0.0;
const initialVelocity = 1.0;
const maxVelocity = 2.5;
const tileCodeProvider = {
  tileCodeAt: function tileCodeAt(tileCoords) {
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
  " ": 1,
  ".": 2,
  "l": 9,
  "m": 5,
  "n": 10,
  "q": 4,
  "p": 6,
  "u": 8,
  "v": 3,
  "w": 7
};

function startGame() {
  roomStore.changeRoom(5050);
  window.addEventListener("keydown", function (e) {
    myGameArea.keys = myGameArea.keys || [];
    var inputCode = ["k" + e.keyCode];
    var control = keyMap[inputCode];

    if (control) {
      controlStates[control] = true;
      e.preventDefault();
    }
  });
  window.addEventListener("keyup", function (e) {
    if (e.keyCode === 69) {
      // key e
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
  start: function start() {
    this.canvas.width = roomStore.numCols * tileSize;
    this.canvas.height = topBarSize + roomStore.numRows * tileSize + bottomBarSize;
    this.context = this.canvas.getContext("2d");
    document.body.insertBefore(this.canvas, document.getElementById("gameAreaHolder"));
    this.frameNo = 0;
    this.interval = setInterval(updateGameArea, 30);
    let self = this;
    this.canvas.addEventListener("mousedown", function (e) {
      self.touchPositions = [self.getPointerPos(e)];
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
        self.touchPositions = [mousePos];
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
  clear: function clear() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
  },
  stop: function stop() {
    clearInterval(this.interval);
  },
  getPointerPos: function getPointerPos(pointerEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: pointerEvent.clientX - rect.left,
      y: pointerEvent.clientY - rect.top
    };
  }
};

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

  this.update = function () {
    const ctx = myGameArea.context;

    if (this.type == "text") {
      ctx.font = "18px Consolas";
      ctx.fillStyle = this.color;
      ctx.fillText(this.text, this.x, this.y);
    } else if (this.type == "sprite") {
      var img = document.getElementById("sprites");
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      if (this.flip) {
        ctx.scale(1, -1);
      }

      ctx.drawImage(img, this.spriteX, this.spriteY, this.width / spriteScale, this.height / spriteScale, -this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    } else if (this.type == "rect") {
      ctx.save();
      ctx.fillStyle = color;
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);
      ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
      ctx.restore();
    }
  };

  this.isClicked = function () {
    for (let i = 0; i < myGameArea.touchPositions.length; i++) {
      let touchPosition = myGameArea.touchPositions[i];
      let touching = this.crashWith({
        x: touchPosition.x,
        y: touchPosition.y,
        width: 0.5,
        height: 0.5
      });
      if (touching) return true;
    }

    return false;
  };

  this.crashWith = function (otherobj) {
    var myleft = this.x - this.width / 2;
    var myright = this.x + this.width / 2;
    var mytop = this.y - this.height / 2;
    var mybottom = this.y + this.height / 2;
    var otherleft = otherobj.x - otherobj.width / 2;
    var otherright = otherobj.x + otherobj.width / 2;
    var othertop = otherobj.y - otherobj.height / 2;
    var otherbottom = otherobj.y + otherobj.height / 2;
    var crash = true;

    if (mybottom < othertop || mytop > otherbottom || myright < otherleft || myleft > otherright) {
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
      var tx = col * tileSize + tileSize / 2;
      var ty = topBarSize + row * tileSize + tileSize / 2;
      var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum - 1) * 9, 26, 2);
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
    var ty = tileSize / 2 + 6;
    var tileBorderColour = tileCode === tileChooserCurrentCode ? "#ff8888" : "#dddddd";
    var tileBorder = new component(tx, ty, 20, 20, "rect", tileBorderColour);
    tileBorder.update();

    if (tileBorder.isClicked()) {
      tileChooserCurrentCode = tileCode;
    }

    var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum - 1) * 9, 26, 2);
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
    var tx = col * tileSize + tileSize / 2;
    var ty = topBarSize + row * tileSize + tileSize / 2;
    var tileNum = tileCodeToTileNum[tileChooserCurrentCode];
    var tileBorderColour = "#ff8888";
    var tileBorder = new component(tx, ty, 20, 20, "rect", tileBorderColour);
    tileBorder.update();

    if (tileBorder.isClicked()) {
      roomStore.editTileCode(row, col, tileChooserCurrentCode);
    }

    var tileComp = new component(tx, ty, 16, 16, "sprite", "", "", (tileNum - 1) * 9, 26, 2.5);
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
  const motionDir = directions.fromArrows(controlStates["left"] || myControlLeft.isClicked(), controlStates["right"] || myControlRight.isClicked(), controlStates["up"] || myControlUp.isClicked(), controlStates["down"] || myControlDown.isClicked());

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
  if (myGameArea.frameNo / n % 1 == 0) {
    return true;
  }

  return false;
}

window.addEventListener('load', startGame, false);
},{"./room-store.js":"src/room-store.js","./tile-paths2":"src/tile-paths2.js","./directions":"src/directions.js"}],"../../../AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js":[function(require,module,exports) {
var global = arguments[3];
var OVERLAY_ID = '__parcel__error__overlay__';
var OldModule = module.bundle.Module;

function Module(moduleName) {
  OldModule.call(this, moduleName);
  this.hot = {
    data: module.bundle.hotData,
    _acceptCallbacks: [],
    _disposeCallbacks: [],
    accept: function (fn) {
      this._acceptCallbacks.push(fn || function () {});
    },
    dispose: function (fn) {
      this._disposeCallbacks.push(fn);
    }
  };
  module.bundle.hotData = null;
}

module.bundle.Module = Module;
var checkedAssets, assetsToAccept;
var parent = module.bundle.parent;

if ((!parent || !parent.isParcelRequire) && typeof WebSocket !== 'undefined') {
  var hostname = "" || location.hostname;
  var protocol = location.protocol === 'https:' ? 'wss' : 'ws';
  var ws = new WebSocket(protocol + '://' + hostname + ':' + "54879" + '/');

  ws.onmessage = function (event) {
    checkedAssets = {};
    assetsToAccept = [];
    var data = JSON.parse(event.data);

    if (data.type === 'update') {
      var handled = false;
      data.assets.forEach(function (asset) {
        if (!asset.isNew) {
          var didAccept = hmrAcceptCheck(global.parcelRequire, asset.id);

          if (didAccept) {
            handled = true;
          }
        }
      }); // Enable HMR for CSS by default.

      handled = handled || data.assets.every(function (asset) {
        return asset.type === 'css' && asset.generated.js;
      });

      if (handled) {
        console.clear();
        data.assets.forEach(function (asset) {
          hmrApply(global.parcelRequire, asset);
        });
        assetsToAccept.forEach(function (v) {
          hmrAcceptRun(v[0], v[1]);
        });
      } else {
        window.location.reload();
      }
    }

    if (data.type === 'reload') {
      ws.close();

      ws.onclose = function () {
        location.reload();
      };
    }

    if (data.type === 'error-resolved') {
      console.log('[parcel] ✨ Error resolved');
      removeErrorOverlay();
    }

    if (data.type === 'error') {
      console.error('[parcel] 🚨  ' + data.error.message + '\n' + data.error.stack);
      removeErrorOverlay();
      var overlay = createErrorOverlay(data);
      document.body.appendChild(overlay);
    }
  };
}

function removeErrorOverlay() {
  var overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }
}

function createErrorOverlay(data) {
  var overlay = document.createElement('div');
  overlay.id = OVERLAY_ID; // html encode message and stack trace

  var message = document.createElement('div');
  var stackTrace = document.createElement('pre');
  message.innerText = data.error.message;
  stackTrace.innerText = data.error.stack;
  overlay.innerHTML = '<div style="background: black; font-size: 16px; color: white; position: fixed; height: 100%; width: 100%; top: 0px; left: 0px; padding: 30px; opacity: 0.85; font-family: Menlo, Consolas, monospace; z-index: 9999;">' + '<span style="background: red; padding: 2px 4px; border-radius: 2px;">ERROR</span>' + '<span style="top: 2px; margin-left: 5px; position: relative;">🚨</span>' + '<div style="font-size: 18px; font-weight: bold; margin-top: 20px;">' + message.innerHTML + '</div>' + '<pre>' + stackTrace.innerHTML + '</pre>' + '</div>';
  return overlay;
}

function getParents(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return [];
  }

  var parents = [];
  var k, d, dep;

  for (k in modules) {
    for (d in modules[k][1]) {
      dep = modules[k][1][d];

      if (dep === id || Array.isArray(dep) && dep[dep.length - 1] === id) {
        parents.push(k);
      }
    }
  }

  if (bundle.parent) {
    parents = parents.concat(getParents(bundle.parent, id));
  }

  return parents;
}

function hmrApply(bundle, asset) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (modules[asset.id] || !bundle.parent) {
    var fn = new Function('require', 'module', 'exports', asset.generated.js);
    asset.isNew = !modules[asset.id];
    modules[asset.id] = [fn, asset.deps];
  } else if (bundle.parent) {
    hmrApply(bundle.parent, asset);
  }
}

function hmrAcceptCheck(bundle, id) {
  var modules = bundle.modules;

  if (!modules) {
    return;
  }

  if (!modules[id] && bundle.parent) {
    return hmrAcceptCheck(bundle.parent, id);
  }

  if (checkedAssets[id]) {
    return;
  }

  checkedAssets[id] = true;
  var cached = bundle.cache[id];
  assetsToAccept.push([bundle, id]);

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    return true;
  }

  return getParents(global.parcelRequire, id).some(function (id) {
    return hmrAcceptCheck(global.parcelRequire, id);
  });
}

function hmrAcceptRun(bundle, id) {
  var cached = bundle.cache[id];
  bundle.hotData = {};

  if (cached) {
    cached.hot.data = bundle.hotData;
  }

  if (cached && cached.hot && cached.hot._disposeCallbacks.length) {
    cached.hot._disposeCallbacks.forEach(function (cb) {
      cb(bundle.hotData);
    });
  }

  delete bundle.cache[id];
  bundle(id);
  cached = bundle.cache[id];

  if (cached && cached.hot && cached.hot._acceptCallbacks.length) {
    cached.hot._acceptCallbacks.forEach(function (cb) {
      cb();
    });

    return true;
  }
}
},{}]},{},["../../../AppData/Roaming/npm/node_modules/parcel-bundler/src/builtins/hmr-runtime.js","src/index.js"], null)
//# sourceMappingURL=/src.a2b27638.js.map