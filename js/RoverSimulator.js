const SIMULATED_HISTORY = [
  { energy: 432, charge: 34, peak: 143 },
  { energy: 1754, charge: 135, peak: 234 },
  { energy: 1907, charge: 147, peak: 344 },
  { energy: 1899, charge: 147, peak: 360 },
  { energy: 1804, charge: 139, peak: 335 },
  { energy: 1841, charge: 142, peak: 331 },
  { energy: 1630, charge: 125, peak: 307 }
];

class RoverSimulator {
  constructor() {
    this.loadOn = false;
    this.sample = 0;
    this.generated = SIMULATED_HISTORY[0].energy;
    this.consumed = 0;
  }

  respond(command) {
    const request = new DataView(command.buffer, command.byteOffset, command.byteLength);
    const address = request.getUint8(0);
    const operation = request.getUint8(1);
    const register = request.getUint16(2);
    const value = request.getUint16(4);

    if (operation === WRITE && register === LOAD_REGISTER && value <= 1) {
      this.loadOn = value === 1;
      return request;
    }

    const frame = new DataView(new ArrayBuffer(value * 2 + 5));
    frame.setUint8(0, address);
    frame.setUint8(1, READ);
    frame.setUint8(2, value * 2);
    const history = SIMULATED_HISTORY[register - HISTORY_REGISTER];

    if (operation === READ && register === LIVE_REGISTER && value === 34) {
      this.populateLiveFrame(frame);
    } else if (operation === READ && register === 0x000c && value === 8) {
      const model = new TextEncoder().encode('Rover Simulator');
      new Uint8Array(frame.buffer).set(model, 3);
    } else if (operation === READ && register === 0x001a && value === 1) {
      frame.setUint8(4, 97);
    } else if (operation === READ && register === 0xe004 && value === 1) {
      frame.setUint16(3, 4);
    } else if (operation === READ && history && value === 10) {
      frame.setUint16(11, history.peak);
      frame.setUint16(15, history.charge);
      frame.setUint16(19, history.energy);
    } else {
      const exception = new DataView(new ArrayBuffer(5));
      exception.setUint8(0, address);
      exception.setUint8(1, operation | 0x80);
      exception.setUint8(2, 2);
      return this.withCrc(exception);
    }

    return this.withCrc(frame);
  }

  withCrc(frame) {
    const offset = frame.byteLength - 2;
    frame.setUint16(offset, modbusCrc(new Uint8Array(frame.buffer, 0, offset)), true);
    return frame;
  }

  populateLiveFrame(frame) {
    const solarPower = [35, 72, 110, 94, 51, 18];
    const power = solarPower[this.sample % solarPower.length];
    if (this.sample > 0) {
      this.generated += Math.round(power / 12);
      this.consumed += this.loadOn ? 2 : 0;
    }

    const today = SIMULATED_HISTORY[0];
    frame.setUint16(3, 87);
    frame.setUint16(5, 129);
    frame.setUint16(7, Math.round(power * 0.9 / 12.9 * 100));
    frame.setUint8(9, 33 + this.sample % 4);
    frame.setUint8(10, 25);
    frame.setUint16(11, this.loadOn ? 129 : 0);
    frame.setUint16(13, this.loadOn ? 186 : 0);
    frame.setUint16(15, this.loadOn ? 24 : 0);
    frame.setUint16(17, 171);
    frame.setUint16(19, Math.round(power / 17.1 * 100));
    frame.setUint16(21, power);
    frame.setUint16(33, today.peak);
    frame.setUint16(35, this.consumed || this.loadOn ? 24 : 0);
    frame.setUint16(37, today.charge + Math.floor((this.generated - today.energy) / 13));
    frame.setUint16(39, Math.floor(this.consumed / 13));
    frame.setUint16(41, this.generated);
    frame.setUint16(43, this.consumed);
    frame.setUint32(59, 425606 + this.generated);
    frame.setUint8(67, this.loadOn ? 0x80 : 0);
    frame.setUint8(68, 2);
    this.sample++;
  }
}
