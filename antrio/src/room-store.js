export default class RoomStore {

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
      xhr.onload = function() {
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
      xhr.onload = function() {
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
    }
    // TODO - check bounds?
    this._tileCodeRows[row] = this._replaceCharInStr(this._tileCodeRows[row], col, newTileCode);
    this._unsavedEdits.push({
      x: col,
      y: row,
      tileCode: newTileCode
    })
  }

  _buildEditRequest() {
    return {
      number: this.roomNumber,
      existingVersion: this._version,
      tileEdits: this._unsavedEdits.slice(),
      optionalNewName: null
    }
  }

  _replaceCharInStr(str, index, replacement) {
    return str.substr(0, index) + replacement + str.substr(index + replacement.length);
  }

}
