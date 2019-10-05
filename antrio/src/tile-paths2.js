const directions = require('./directions');

const epsilon = 1e-8;

function quantize(tileSettings, currentPos) {
  const tileSize = tileSettings.tileSize;
  const tileCoords = [ Math.floor(currentPos[0] / tileSize), Math.floor(currentPos[1] / tileSize) ];
  const tileRelativePos = [ currentPos[0] - (tileCoords[0] * tileSize), currentPos[1] - (tileCoords[1] * tileSize) ];
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
  if (tileCode === 'v') { // grass-at-top
    tilePaths = [ {
      tileRelativeLinePos: [0, tileSizeMinusMinDist],
      startToEndDir: directions.fromCardinal('E')
    } ]
  } else if (tileCode === 'q') { // grass-at-right
    tilePaths = [ {
      tileRelativeLinePos: [tileSizeMinusMinDist, tileSize],
      startToEndDir: directions.fromCardinal('S')
    } ]
  } else if (tileCode === 'm') { // grass-at-bottom
    tilePaths = [ {
      tileRelativeLinePos: [tileSize, minDist],
      startToEndDir: directions.fromCardinal('W')
    } ]
  } else if (tileCode === 'p') { // grass-at-left
    tilePaths = [ {
      tileRelativeLinePos: [minDist, 0],
      startToEndDir: directions.fromCardinal('N')
    } ]
  } else if (tileCode === 'w') { // grass-up-and-right-above
    tilePaths = [ {
      tileRelativeLinePos: [0, 0],
      startToEndDir: directions.fromCardinal('NE')
    } ]
  } else if (tileCode === 'u') { // grass-down-and-right-above
    tilePaths = [ {
      tileRelativeLinePos: [0, tileSize],
      startToEndDir: directions.fromCardinal('SE')
    } ]
  } else if (tileCode === 'l') { // grass-down-and-left-below
    tilePaths = [ {
      tileRelativeLinePos: [tileSize, tileSize],
      startToEndDir: directions.fromCardinal('SW')
    } ]
  } else if (tileCode === 'n') { // grass-up-and-left-below
    tilePaths = [ {
      tileRelativeLinePos: [tileSize, 0],
      startToEndDir: directions.fromCardinal('NW')
    } ]
  }
  return tilePaths;
}

function computeMoves(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance) {
  const [tileCoords, tileRelativePos, tileOriginPos] = quantize(tileSettings, currentPose.pos);
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
        let moreMoves = computeMovesR(originalPose, tileSettings, tileCodeProvider,
          ndtrp.tileCoords,
          ndtrp.dubiousTileRelativePos,
          ndtrp.tileOriginPos,
          motionDir, stillRemainingMotionDistance, depth + 1);
        if (moreMoves.length > 0) {
          foundMoreMoves = true;
          moves.push(...moreMoves);
        }
      }
    }
    // TODO - maybe we should just always do this and let move choose the best ?
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
  }
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
  }
}

function* generateNeighbouringDubiousTileRelativePositions(tileSettings, tileCoords, tileRelativePos) {
  for (let dir of directions.All) {
    if (directions.isNone(dir)) {
      continue;
    }
    let offsetCoords = directions.translateChebyshev([0,0], dir, 1);
    let oppositeOffsetRelativePos = directions.translateChebyshev([0,0], dir, -tileSettings.tileSize);
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
  const outOfBoundsBy = outOfTileBy(tileSettings, unclippedSnappedTileRelativePos);
  // TODO - using the centre is a bit questionable
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
