const NAME_PREFIX = 'PICO';
const WRITE_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
const NOTIFY_SERVICE_UUID = '00000001-0000-1000-8000-00805f9b34fb';
const WRITE_CHAR_UUID = '00000002-0000-1000-8000-00805f9b34fb';
const NOTIFY_CHAR_UUID = '00000003-0000-1000-8000-00805f9b34fb';

class PicoRelay extends BLEDevice {
  constructor() {
    super(NAME_PREFIX, WRITE_SERVICE_UUID, NOTIFY_SERVICE_UUID, WRITE_CHAR_UUID, NOTIFY_CHAR_UUID);
  }

  async start() {
    await this.connect();
  }

  async stop() {
    await this.disconnect();
    if (this.timer) window.clearInterval(this.timer);
  }

  async writeCommand(predefinedCommand = '') {
    document.querySelector("#response").textContent = 'Loading..';
    const command = predefinedCommand || document.querySelector('#command').value;
    console.log(`writing: ${command}`);
    const encoder = new TextEncoder('utf-8')
    await this.writeChar.writeValue(encoder.encode(command));
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
    const decoder = new TextDecoder('utf-8');
    console.log(`data received: ${decoder.decode(dataView)}`);
    this.renderData(decoder.decode(dataView));
  }

  onError(exception) {
    this.renderData(exception);
    super.onError(exception);
  }

  renderData(data) {
    document.querySelector("#response").textContent = data;
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  let app = new PicoRelay();

  document.querySelector("#search").addEventListener("click", async () => await app.start());
  document.querySelector("#disconnect").addEventListener("click", async () => await app.stop());
  document.querySelector("#send").addEventListener("click", async () => await app.writeCommand());
  document.querySelector("#command_get_status").addEventListener("click", async () => await app.writeCommand('get status'));
  document.querySelector("#command_connect").addEventListener("click", async () => await app.writeCommand('set relay connect'));
  document.querySelector("#command_disconnect").addEventListener("click", async () => await app.writeCommand('set relay disconnect'));
  document.querySelector("#command_get_error").addEventListener("click", async () => await app.writeCommand('get error'));
  document.querySelector("#command_restart").addEventListener("click", async () => await app.writeCommand('restart'));
  document.querySelector("#command_update").addEventListener("click", async () => await app.writeCommand('update'));
  window.addEventListener('beforeunload', async () => await app.stop())
  
});
