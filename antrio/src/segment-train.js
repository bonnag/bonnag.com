const directions = require('./directions');

class SegmentTrain {

  constructor(headPose) {

    this._history = [];
    const maxSegments = 5;
    this._segmentDistance = 10;
    this._historyDistanceNeeded = this._segmentDistance * (1 + maxSegments);
    this._epsilon = 1e-8;

    // Pretend the head moved in a straight-line to get to the initial pose.
    let fakeOldHeadPose = headPose;
    let backwardsDir = directions.reverse(headPose.dir);
    let fakeDistanceSinceLast = 1;
    for (let fakeTotalDistance = 0; fakeTotalDistance < this._historyDistanceNeeded; fakeTotalDistance += fakeDistanceSinceLast) {
      this._history.unshift([fakeDistanceSinceLast, fakeOldHeadPose]);
      fakeOldHeadPose = {
        pos: directions.translateChebyshev(fakeOldHeadPose.pos, backwardsDir, 1),
        dir: headPose.dir,
        normal: headPose.normal
      }
    }
    //console.log(this._history);
  }

  reportCurrentHeadPose(pose) {
    const lastEntry = this._history[this._history.length - 1];
    const lastPose = lastEntry[1];
    //console.log(this._history.length, lastPose, pose);
    const distanceSinceLast = directions.euclideanDistanceBetween(lastPose.pos, pose.pos);
    if (distanceSinceLast < this._epsilon) {
      return;
    }
    this._history.push([distanceSinceLast, pose]);
    // TODO - need some way to purge if too long
  }

  getSegmentPoses(numSegments) {
    const segmentPoses = [];
    let totalDistance = 0;
    let pose = undefined;
    let numEntries = this._history.length;
    for (let entryIdx = numEntries-1; entryIdx >= 0; entryIdx--) {
      if (segmentPoses.length === numSegments) {
        break;
      }
      let entry = this._history[entryIdx];
      let targetDistance = this._segmentDistance * (1.5 + segmentPoses.length);
      let prevTotalDistance = totalDistance;
      let prevPose = pose;
      let distance = entry[0];
      pose = entry[1];
      totalDistance += distance;
      if (prevTotalDistance <= targetDistance && totalDistance >= targetDistance) {
        segmentPoses.push(this._interpolatePose(prevPose, pose, prevTotalDistance, totalDistance, targetDistance));
      }
    }
    while (segmentPoses.length < numSegments) {
      const fakePoseBetterThanNothing = pose;
      segmentPoses.push(fakePoseBetterThanNothing);
    }
    return segmentPoses;
  }

  // TODO - this isn't very good interpolation
  _interpolatePose(prevPose, pose, prevTotalDistance, totalDistance, targetDistance) {
    return prevPose;
  }

}

module.exports = SegmentTrain;