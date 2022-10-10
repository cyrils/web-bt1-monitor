class BLEDevice {
  constructor() {
    this.namePrefix = 'BT-TH';
    this.writeServiceUuid = '0000ffd0-0000-1000-8000-00805f9b34fb';
    this.notifyServiceUuid = '0000fff0-0000-1000-8000-00805f9b34fb';
    this.writeCharUuid = '0000ffd1-0000-1000-8000-00805f9b34fb';
    this.notifyCharUuid = '0000fff1-0000-1000-8000-00805f9b34fb';
    this.deviceName = '';
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
  }

  async connect() {
    try {
      if (typeof navigator.bluetooth.getDevices !== "undefined") {
        const devices = await navigator.bluetooth.getDevices()
        if (devices.length > 0) this.device = self.devices.find(device => device.name.startsWith(this.namePrefix));
      }

      if (!this.device) {
        this.device = await navigator.bluetooth.requestDevice({
          filters: [{ namePrefix: this.namePrefix }],
          optionalServices: [this.writeServiceUuid, this.notifyServiceUuid]
        })
      }

      console.log(`Connecting to device ${this.device.name}`)

      this.server = await this.device.gatt.connect();
      const writeService = await this.server.getPrimaryService(this.writeServiceUuid);
      const notifyService = await this.server.getPrimaryService(this.notifyServiceUuid);
      this.writeChar = await writeService.getCharacteristic(this.writeCharUuid);
      this.notifyChar = await notifyService.getCharacteristic(this.notifyCharUuid);
      await this.notifyChar.startNotifications()
      await this.notifyChar.addEventListener('characteristicvaluechanged', this.read.bind(this))
      this.onConnect()
    } catch (e) {
      this.onError(e)
    }
  }

  async write(command) {
    await this.writeChar.writeValue(command);
  }

  async disconnect() {
    if (this.device.gatt.connected) {
      await this.device.gatt.disconnect();
    } else {
      console.log('Bluetooth Device is already disconnected');
    }
    this.onDisconnect()
  }

  read(event) {
    console.log(event.target.value);
    this.onData(event.target.value)
  }

  onConnect() {
    console.log(`Connected to ${this.device.name}`)
  }

  onDisconnect() {
    console.log(`Disonnected from ${this.device.name}`)
  }

  onData(data) {
    console.log(data)
  }

  onError(exception) {
    console.error(exception);
  }
}
