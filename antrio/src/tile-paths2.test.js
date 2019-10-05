import test from 'ava';
const directions = require('./directions');
const tilePaths = require('./tile-paths2');

const tileSettings = {
  tileSize: 16,
  minDist: 0.01
};

function addVec(posA, posB) {
  return [posA[0] + posB[0], posA[1] + posB[1]];
}

test('stand still on grass-at-top', t => {
  const currentPose = {
    pos: [0, tileSettings.tileSize - tileSettings.minDist],
    dir: directions.fromCardinal('E'),
    normal: directions.fromCardinal('N')
  };
  const motionDir = directions.None;
  const tileCodeProvider = {
    tileCodeAt: function(tileCoordsIgnored) {
      return 'v';
    }
  };
  const motionDistance = 2;
  const result = tilePaths.computeMoves(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  t.is(result.length, 0);
});

test('walk left on grass-at-top', t => {
  const currentPose = {
    pos: [8, tileSettings.tileSize - tileSettings.minDist],
    dir: directions.fromCardinal('E'),
    normal: directions.fromCardinal('N')
  };
  const tileCodeProvider = {
    tileCodeAt: function(tileCoordsIgnored) {
      return 'v';
    }
  };
  const motionDir = directions.fromCardinal('W');
  const motionDistance = 2;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  t.deepEqual(firstMove.pos, addVec(currentPose.pos, [-2, 0]));
  t.deepEqual(firstMove.dir, motionDir);
  t.deepEqual(firstMove.normal, directions.fromCardinal('N'));
});

test('walk right+up on grass-at-top', t => {
  const currentPose = {
    pos: [8, tileSettings.tileSize - tileSettings.minDist],
    dir: directions.fromCardinal('E'),
    normal: directions.fromCardinal('N')
  };
  const motionDir = directions.fromCardinal('NE');
  const tileCodeProvider = {
    tileCodeAt: function(tileCoordsIgnored) {
      return 'v';
    }
  };
  const motionDistance = 2;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  t.deepEqual(firstMove.pos, addVec(currentPose.pos, [2, 0]));
  t.deepEqual(firstMove.dir, directions.fromCardinal('E'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('N'));
});

test('walk right off grass-at-top onto more grass-at-top', t => {
  const currentPose = {
    pos: [tileSettings.tileSize - 2, tileSettings.tileSize - tileSettings.minDist],
    dir: directions.fromCardinal('E'),
    normal: directions.fromCardinal('N')
  };
  const motionDir = directions.fromCardinal('E');
  const tileCodeProvider = {
    tileCodeAt: function(tileCoordsIgnored) {
      return 'v';
    }
  };
  const motionDistance = 3;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  t.deepEqual(firstMove.pos, addVec(currentPose.pos, [3, 0]));
  t.deepEqual(firstMove.dir, directions.fromCardinal('E'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('N'));
});

test('walk right off grass-at-top onto grass-up-and-right-above', t => {
  const currentPose = {
    pos: [tileSettings.tileSize - 2, tileSettings.tileSize - tileSettings.minDist],
    dir: directions.fromCardinal('E'),
    normal: directions.fromCardinal('N')
  };
  const motionDir = directions.fromCardinal('E');
  const tileCodeProvider = {
    tileCodeAt: function(tileCoords) {
      if (tileCoords[0] === 0 && tileCoords[1] === 0) {
        return 'v';
      } else if (tileCoords[0] === 1 && tileCoords[1] === 1) {
        return 'w';
      } else {
        return ' ';
      }
    }
  };
  const motionDistance = 3;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  // todo - this isn't really correct!
  t.deepEqual(firstMove.pos, [16,16]);
  t.deepEqual(firstMove.dir, directions.fromCardinal('E'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('NW'));
});

test('bug 01 - can get to boundary but not next tile', t => {
  const currentPose = {pos: [352.97999999999996, 79.99], dir: 'W', normal: 'N'};
  const motionDir = 'W';
  const tileCodeProvider = {
    tileCodeAt: function(tileCoords) {
      if (tileCoords[0] === 22 && tileCoords[1] === 4) {
        return 'v';
      } else if (tileCoords[0] === 21 && tileCoords[1] === 5) {
        return 'u';
      } else {
        return ' ';
      }
    }
  };
  const motionDistance = 1;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  // todo - this isn't really correct!
  t.deepEqual(firstMove.pos, [351.99, 80.01]);
  t.deepEqual(firstMove.dir, directions.fromCardinal('W'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('NE'));
});

test('bug 02 - can get to boundary but not next tile', t => {
  const currentPose = {pos: [95.99, 143.99], dir: 'NE', normal: 'SE'};
  const motionDir = 'NE';
  const tileCodeProvider = {
    tileCodeAt: function(tileCoords) {
      if (tileCoords[0] === 5 && tileCoords[1] === 8) {
        return 'l';
      } else if (tileCoords[0] === 6 && tileCoords[1] === 9) {
        return 'm';
      } else {
        return ' ';
      }
    }
  };
  const motionDistance = 1;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  // todo - this isn't really correct!
  t.deepEqual(firstMove.pos, [96.97999999999999, 144.01]);
  t.deepEqual(firstMove.dir, directions.fromCardinal('E'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('S'));
});

test('bug 03 - can get to boundary but not next mmmm tile', t => {
  const currentPose = {pos: [319.99, 144.01], dir: 'E', normal: 'N'};
  const motionDir = 'E';
  const tileCodeProvider = {
    tileCodeAt: function(tileCoords) {
      if (tileCoords[1] === 9) {
        return 'm';
      } else {
        return ' ';
      }
    }
  };
  const motionDistance = 1;
  const firstMove = tilePaths.move(currentPose, tileSettings, tileCodeProvider, motionDir, motionDistance);
  t.deepEqual(firstMove.pos, [320.99, 144.01]);
  t.deepEqual(firstMove.dir, directions.fromCardinal('E'));
  t.deepEqual(firstMove.normal, directions.fromCardinal('S'));
});
