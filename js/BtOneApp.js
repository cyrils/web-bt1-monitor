const CHARGING_STATE = {
  0: 'deactivated',
  1: 'activated',
  2: 'mppt',
  3: 'equalizing',
  4: 'boost',
  5: 'floating',
  6: 'current limiting'
}

const LOAD_STATE = {
  0: 'off',
  1: 'on',
}

const FUNCTION = {
  3: "READ",
  6: "WRITE"
}

const NAME_PREFIX = 'BT-TH';
const WRITE_SERVICE_UUID = '0000ffd0-0000-1000-8000-00805f9b34fb';
const NOTIFY_SERVICE_UUID = '0000fff0-0000-1000-8000-00805f9b34fb';
const WRITE_CHAR_UUID = '0000ffd1-0000-1000-8000-00805f9b34fb';
const NOTIFY_CHAR_UUID = '0000fff1-0000-1000-8000-00805f9b34fb';

class BtOneApp extends BLEDevice {
  constructor() {
    super(NAME_PREFIX, WRITE_SERVICE_UUID, NOTIFY_SERVICE_UUID, WRITE_CHAR_UUID, NOTIFY_CHAR_UUID);
  }

  async start() {
    await this.connect();
    const payload = new Int8Array([255, 3, 1, 0, 0, 34, 209, 241]);
    this.write(payload);
    this.timer =  window.setInterval( () => this.write(payload), 5000);
  }

  async stop() {
    await this.disconnect();
    if (this.timer) window.clearInterval(this.timer);
  }

  async toggleLoad() {
    if (this.parsedData && this.parsedData['load_status'] == 'off') {
      const payload = new Int8Array([255, 6, 1, 10, 0, 1, 124, 42]);
      this.write(payload);
    } else {
      const payload = new Int8Array([255, 6, 1, 10, 0, 0, 189, 234]);
      this.write(payload);
    }
  }

  onConnect() {
    super.onConnect();
    document.querySelectorAll(".hide").forEach(node => {
      node.classList.remove('hidden');
    })
    document.querySelector('#search').classList.add('hidden');
  }

  onDisconnect() {
    super.onDisconnect();
    document.querySelectorAll(".hide").forEach(node => {
      node.classList.add('hidden');
    })
    document.querySelector('#search').classList.remove('hidden');
  }

  onData(dataView) {
    const operation = FUNCTION[dataView.getInt8(1)];
    let parsedResponse = {};

    if (operation == 'READ') {
      this.parsedData = parsedResponse = this.parseChargeControllerInfo(dataView);
    } else {
      parsedResponse = this.parseSetLoadResponse(dataView);
    }
    console.log(parsedResponse);
    this.renderData(parsedResponse)
  }

  onError(exception) {
    super.onError(exception);
  }

  renderData(parsedData) {
    for(const key in parsedData) {
      const node = document.querySelector(`#${key}`);
      if (node) node.textContent = parsedData[key];
    }
    document.querySelector('#soc').style.width = `${parsedData['battery_percentage']}%`;
    document.querySelector('#load_toggle').classList = `toggle ${parsedData['load_status']}`;
  }

  parseChargeControllerInfo(dataView) {
    const data = {}
    data['function'] = FUNCTION[dataView.getInt8(1)];
    data['battery_percentage'] = dataView.getInt16(3);
    data['battery_voltage'] = (dataView.getInt16(5) * 0.1).toFixed(2);
    data['controller_temperature'] = dataView.getInt8(9);
    data['battery_temperature'] = dataView.getInt8(10);
    const loadStatus = dataView.getUint8(67) >> 7;
    data['load_status'] = LOAD_STATE[loadStatus];
    data['load_voltage'] = (dataView.getInt16(11) * 0.1).toFixed(2);
    data['load_current'] = (dataView.getInt16(13) * 0.01).toFixed(2);
    data['load_power'] = dataView.getInt16(15);
    data['pv_voltage'] = (dataView.getInt16(17) * 0.1).toFixed(2);
    data['pv_current'] = (dataView.getInt16(19) * 0.01).toFixed(2);
    data['pv_power'] = dataView.getInt16(21);
    data['max_charging_power_today'] = dataView.getInt16(33);
    data['max_discharging_power_today'] = dataView.getInt16(35);
    data['charging_amp_hours_today'] = dataView.getInt16(37);
    data['discharging_amp_hours_today'] = dataView.getInt16(39);
    data['power_generation_today'] = parseFloat((dataView.getInt16(41) * 0.001).toFixed(3));
    data['power_generation_total'] = parseFloat((dataView.getInt16(41) * 0.001).toFixed(3));
    const chargingStatusCode = dataView.getInt8(68);
    data['charging_status'] = CHARGING_STATE[chargingStatusCode];

    return data
  }

  parseSetLoadResponse(dataView) {
    const data = {};
    data['function'] = FUNCTION[dataView.getInt8(1)];
    data['load_status'] = LOAD_STATE[dataView.getInt8(5)];
    return data;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  let app = new BtOneApp();

  document.querySelector("#search").addEventListener("click", async () => await app.start());
  document.querySelector("#disconnect").addEventListener("click", async () => await app.stop());
  document.querySelector("#load_toggle").addEventListener("click", async () => await app.toggleLoad());
  window.addEventListener('beforeunload', async () => await app.stop())
});
