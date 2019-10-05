/*
 * antR.io uses a slightly unusual geometry (sometimes called Chebyshev distance or chess-board distance) where:
 *  1) the only movement directions are the 8 cardinal compass points (N, NE, E, SE, S, SW, W, NW)
 *     (well, and there's a 'Z' to represent not moving at all - not sure how useful really)
 *  2) moving one unit NE is the same as moving one unit N and one unit E
 *     (e.g. moving from [1,1] to [3,3] is the same distance as moving from [1,1] to [3,1])
*/

const None = 'Z';

const All = ['Z','N','NE','E','SE','S','SW','W','NW'];

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
    default: throw new Error('unsupported direction ' + cardinal);
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
    case 'N':  return 0;
    case 'NE': return 1;
    case 'E':  return 2;
    case 'SE': return 3;
    case 'S':  return 4;
    case 'SW': return 5;
    case 'W':  return 6;
    case 'NW': return 7;
    default: throw new Error('unsupported direction ' + dir);
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
    case 0: return 'N';
    case 1: return 'NE';
    case 2: return 'E';
    case 3: return 'SE';
    case 4: return 'S';
    case 5: return 'SW';
    case 6: return 'W';
    case 7: return 'NW';
    default: throw new Error('unsupported ordinal ' + num);
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
  return ((ordA + 1) % 8) == ordB || ((ordB + 1) % 8) == ordA;
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
  return [
    dir,
    rotateClockwise(dir, -1),
    rotateClockwise(dir, +1)
  ];
}

// distance is never negative
function chebyshevDistanceBetween(posA, posB) {
  return Math.max(Math.abs(posA[0] - posB[0]), Math.abs(posA[1] - posB[1]));
}

// back in the real-world, how far is it between two points?
function euclideanDistanceBetween(posA, posB) {
  return Math.sqrt(Math.pow(posA[0] - posB[0], 2) + Math.pow(posA[1] - posB[1], 2));
}

// the direction to move from fromPos to get closest to toPos
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
}

// distance can be negative (moves in reverse direction)
function translateChebyshev(pos, dir, distance) {
  switch (dir) {
    case 'Z':  return [pos[0],pos[1]];
    case 'N':  return [pos[0],pos[1]+distance];
    case 'NE': return [pos[0]+distance,pos[1]+distance];
    case 'E':  return [pos[0]+distance,pos[1]];
    case 'SE': return [pos[0]+distance,pos[1]-distance];
    case 'S':  return [pos[0],pos[1]-distance];
    case 'SW': return [pos[0]-distance,pos[1]-distance];
    case 'W':  return [pos[0]-distance,pos[1]];
    case 'NW': return [pos[0]-distance,pos[1]+distance];
    default: throw new Error('unsupported direction ' + dir);
  }
}

// distance can be negative (moves in reverse direction)
function translateEuclidean(pos, dir, distance) {
  return translateChebyshev(pos, dir, isDiagonal(dir) ? distance * Math.sqrt(2) * 0.5: distance);
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
    case 'Z': snappedRelPos = [0, 0]; break;
    case 'N':  
    case 'S': snappedRelPos = [0, relPos[1]]; break;
    case 'E':  
    case 'W': snappedRelPos = [relPos[0], 0]; break;
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
    default: throw new Error('bad direction ' + dir);
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
