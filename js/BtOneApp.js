const BATTERY_TYPE = [null, 'Flooded', 'Sealed', 'Gel', 'Lithium', 'Custom'];

const NAME_PREFIX = 'BT-TH';
const WRITE_SERVICE_UUID = '0000ffd0-0000-1000-8000-00805f9b34fb';
const NOTIFY_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const WRITE_CHAR_UUID = '0000ffd1-0000-1000-8000-00805f9b34fb';
const NOTIFY_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

const CONTROLLER_ADDRESS = 255;
const READ = 3;
const WRITE = 6;
const LIVE_REGISTER = 0x0100;
const LOAD_REGISTER = 0x010a;
const HISTORY_REGISTER = 0xf000;
const RESPONSE_TIMEOUT = 2000;
const POLL_INTERVAL = 5000;

function modbusCrc(bytes) {
  let crc = 0xffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = (crc >>> 1) ^ ((crc & 1) ? 0xa001 : 0);
    }
  }
  return crc;
}

function roverTemperature(byte) {
  return byte & 0x80 ? -(byte & 0x7f) : byte;
}

class BtOneApp extends BLEDevice {
  constructor() {
    super(NAME_PREFIX, WRITE_SERVICE_UUID, NOTIFY_SERVICE_UUID, WRITE_CHAR_UUID, NOTIFY_CHAR_UUID);
    this.handleDisconnect = () => this.onDisconnect();
  }

  async start() {
    if (this.session) return;
    const search = document.querySelector('#search');
    const simulate = document.querySelector('#simulate');
    search.disabled = simulate.disabled = true;
    this.setStatus('Connecting…');
    try {
      await this.connect();
    } finally {
      search.disabled = simulate.disabled = false;
    }
  }

  startSimulation() {
    if (this.session || document.querySelector('#simulate').disabled) return;
    this.simulator = new RoverSimulator();
    this.showMonitor();
  }

  async stop() {
    if (!this.session) return;
    if (this.simulator) {
      this.onDisconnect();
      return;
    }
    this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
    await this.disconnect();
  }

  async toggleLoad() {
    if (!this.session || this.pending || this.loadOn === undefined) return;
    const session = this.session;
    const value = Number(!this.loadOn);
    const frame = await this.request(WRITE, LOAD_REGISTER, value);
    if (this.session !== session) return;

    if (frame) {
      this.renderLoad(Boolean(value));
      this.setStatus('');
    } else {
      this.renderLoad(undefined);
      this.setStatus('Could not confirm the load change. Waiting for live readings…');
    }
    this.updateLoadControl();
  }

  onConnect() {
    super.onConnect();
    this.device.addEventListener('gattserverdisconnected', this.handleDisconnect);
    this.showMonitor();
  }

  showMonitor() {
    const simulated = Boolean(this.simulator);
    document.querySelector('#connection_label').textContent = simulated ? 'Simulator' : 'Connected';
    document.querySelector('#connection_dot').hidden = false;
    document.querySelector('#disconnect').textContent = simulated ? 'Stop simulator' : 'Disconnect';
    document.querySelectorAll('.hide').forEach(node => node.classList.remove('hidden'));
    document.querySelector('#connection_actions').hidden = true;
    this.setStatus('Waiting for live readings…');
    this.session = {};
    void this.monitor(this.session);
  }

  onDisconnect() {
    if (this.simulator) {
      this.simulator = null;
    } else {
      super.onDisconnect();
      this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect);
      this.notifyChar.removeEventListener('characteristicvaluechanged', this.handleNotification);
    }
    document.querySelector('#connection_label').textContent = 'Renogy BT-1';
    document.querySelector('#connection_dot').hidden = true;
    this.session = null;
    clearTimeout(this.pollTimer);
    this.pending?.finish(null);
    this.pending = null;
    this.liveFields?.forEach(key => {
      document.getElementById(key).textContent = '—';
    });
    this.renderData({ model: '—', device_id: '—', battery_type: '—' });
    document.querySelector('#soc').style.width = '0%';
    this.renderLoad(undefined);
    document.querySelector('#history_rows').replaceChildren();
    document.querySelector('#history_table').hidden = true;
    document.querySelector('#history_status').textContent = 'Reading history…';
    document.querySelectorAll('.hide').forEach(node => node.classList.add('hidden'));
    document.querySelector('#connection_actions').hidden = false;
    this.setStatus('');
  }

  onError(error) {
    super.onError(error);
    this.setStatus(error.name === 'NotFoundError' ? '' : 'Could not connect to a BT-1 device.');
  }

  setStatus(message) {
    document.querySelector('#connection_status').textContent = message;
  }

  async monitor(session) {
    await this.readLive(session);
    if (this.session !== session) return;
    await this.readDetails(session);
    if (this.session !== session) return;
    await this.readHistory(session);

    const poll = async () => {
      if (this.session !== session) return;
      if (!this.pending) await this.readLive(session);
      if (this.session === session) this.pollTimer = setTimeout(poll, POLL_INTERVAL);
    };
    if (this.session === session) this.pollTimer = setTimeout(poll, POLL_INTERVAL);
  }

  async readLive(session) {
    const frame = await this.request(READ, LIVE_REGISTER, 34);
    if (this.session !== session) return;
    if (!frame) {
      this.renderLoad(undefined);
      this.setStatus('Live readings unavailable. Retrying…');
      return;
    }
    const data = this.parseChargeControllerInfo(frame);
    this.liveFields ??= Object.keys(data);
    this.renderData(data);
    document.querySelector('#soc').style.width = `${Math.min(data.battery_percentage, 100)}%`;
    this.renderLoad(Boolean(frame.getUint8(67) & 0x80));
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelector('#connection_dot').animate?.(
        [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }],
        { duration: 650, easing: 'ease-in-out' }
      );
    }
    this.setStatus('');
  }

  async readDetails(session) {
    const model = await this.request(READ, 0x000c, 8);
    if (this.session !== session) return;
    if (model) {
      const bytes = new Uint8Array(model.buffer, model.byteOffset + 3, 16);
      this.renderData({ model: new TextDecoder().decode(bytes).replace(/\0/g, '').trim() || '—' });
    }

    const address = await this.request(READ, 0x001a, 1);
    if (this.session !== session || address === null) return;
    // A timed-out address reply has the same shape as a battery-type reply.
    if (address) this.renderData({ device_id: address.getUint8(4) });
    const battery = await this.request(READ, 0xe004, 1);
    if (this.session === session && battery) {
      const code = battery.getUint16(3);
      this.renderData({ battery_type: BATTERY_TYPE[code] ?? `Unknown (${code})` });
    }
  }

  async readHistory(session) {
    const rows = document.querySelector('#history_rows');
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const frame = await this.request(READ, HISTORY_REGISTER + daysAgo, 10);
      if (this.session !== session) return;
      if (!frame) break;

      const row = rows.insertRow();
      row.insertCell().textContent = daysAgo === 0 ? 'Today' : `${daysAgo} d ago`;
      row.insertCell().textContent = (frame.getUint16(19) / 1000).toFixed(3);
      row.insertCell().textContent = frame.getUint16(15);
      row.insertCell().textContent = frame.getUint16(11);
    }
    document.querySelector('#history_table').hidden = rows.rows.length === 0;
    const status = document.querySelector('#history_status');
    if (!rows.rows.length) status.textContent = 'Daily history is unavailable on this controller.';
    else if (rows.rows.length < 7) status.textContent = 'Partial history read at connection.';
    else status.textContent = 'History read at connection.';
  }

  async request(operation, register, value) {
    if (!this.session || this.pending) return null;

    const command = Uint8Array.of(
      CONTROLLER_ADDRESS, operation, register >> 8, register & 0xff, value >> 8, value & 0xff, 0, 0
    );
    const crc = modbusCrc(command.subarray(0, 6));
    command[6] = crc & 0xff;
    command[7] = crc >> 8;

    let pending;
    const response = new Promise(resolve => {
      const finish = frame => {
        clearTimeout(timeout);
        resolve(frame);
      };
      const timeout = setTimeout(() => finish(null), RESPONSE_TIMEOUT);
      pending = { operation, command, byteCount: value * 2, bytes: [], finish };
      this.pending = pending;
    });
    this.updateLoadControl();
    try {
      const [frame] = await Promise.all([response, this.write(command)]);
      return frame;
    } catch (error) {
      console.error(error);
      return null;
    } finally {
      pending.finish(null);
      if (this.pending === pending) {
        this.pending = null;
        this.updateLoadControl();
      }
    }
  }

  async write(command) {
    if (this.simulator) {
      this.onData(this.simulator.respond(command));
      return;
    }
    await super.write(command);
  }

  onData(view) {
    const pending = this.pending;
    if (!pending) return;

    pending.bytes.push(...new Uint8Array(view.buffer, view.byteOffset, view.byteLength));
    const bytes = pending.bytes;
    if (bytes.length < 3) return;
    const operation = bytes[1];
    const exception = operation === (pending.operation | 0x80);
    let length = 5;
    if (!exception && operation === READ) length = bytes[2] + 5;
    if (!exception && operation === WRITE) length = 8;
    if (bytes.length < length) return;
    pending.bytes = [];

    if (bytes.length !== length || modbusCrc(bytes) !== 0) return;
    // An explicit Modbus exception has no outstanding reply, unlike a timeout.
    if (exception) pending.finish(false);
    else if (operation === READ && pending.operation === READ && bytes[2] === pending.byteCount) {
      pending.finish(new DataView(Uint8Array.from(bytes).buffer));
    } else if (operation === WRITE && pending.operation === WRITE &&
               bytes.every((byte, index) => byte === pending.command[index])) {
      pending.finish(new DataView(Uint8Array.from(bytes).buffer));
    }
  }

  updateLoadControl() {
    document.querySelector('#load_toggle').disabled = Boolean(this.pending) || this.loadOn === undefined;
  }

  renderLoad(on) {
    this.loadOn = on;
    const toggle = document.querySelector('#load_toggle');
    toggle.classList.toggle('off', !on);
    toggle.classList.toggle('unavailable', on === undefined);
    toggle.setAttribute('aria-checked', String(Boolean(on)));
    document.querySelector('#load_state').textContent = on === undefined ? '—' : on ? 'On' : 'Off';
    this.updateLoadControl();
  }

  renderData(data) {
    for (const [key, value] of Object.entries(data)) {
      document.getElementById(key).textContent = value;
    }
  }

  parseChargeControllerInfo(view) {
    const scaled = (offset, divisor, digits) => (view.getUint16(offset) / divisor).toFixed(digits);
    return {
      battery_percentage: view.getUint16(3),
      battery_voltage: scaled(5, 10, 2),
      battery_current: scaled(7, 100, 2),
      controller_temperature: roverTemperature(view.getUint8(9)),
      battery_temperature: roverTemperature(view.getUint8(10)),
      load_voltage: scaled(11, 10, 2),
      load_current: scaled(13, 100, 2),
      load_power: view.getUint16(15),
      pv_voltage: scaled(17, 10, 2),
      pv_current: scaled(19, 100, 2),
      pv_power: view.getUint16(21),
      max_charging_power_today: view.getUint16(33),
      max_discharging_power_today: view.getUint16(35),
      charging_amp_hours_today: view.getUint16(37),
      discharging_amp_hours_today: view.getUint16(39),
      power_generation_today: scaled(41, 1000, 3),
      power_consumption_today: scaled(43, 1000, 3),
      power_generation_total: (view.getUint32(59) / 1000).toFixed(3)
    };
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new BtOneApp();
  document.querySelector('#search').addEventListener('click', () => app.start());
  document.querySelector('#simulate').addEventListener('click', () => app.startSimulation());
  document.querySelector('#disconnect').addEventListener('click', () => app.stop());
  document.querySelector('#load_toggle').addEventListener('click', () => app.toggleLoad());
  window.addEventListener('beforeunload', () => app.stop());

  const tabs = [...document.querySelectorAll('.monitor-tabs [role="tab"]')];
  function selectTab(selected) {
    for (const tab of tabs) {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.getElementById(tab.getAttribute('aria-controls')).hidden = !active;
    }
  }

  for (const [index, tab] of tabs.entries()) {
    tab.addEventListener('click', () => selectTab(tab));
    tab.addEventListener('keydown', event => {
      const next = {
        ArrowLeft: (index - 1 + tabs.length) % tabs.length,
        ArrowRight: (index + 1) % tabs.length,
        Home: 0,
        End: tabs.length - 1
      }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectTab(tabs[next]);
      tabs[next].focus();
    });
  }
});
