class BLEDevice {
  constructor(namePrefix, writeServiceUuid, notifyServiceUuid, writeCharUuid, notifyCharUuid) {
    this.namePrefix = namePrefix;
    this.writeServiceUuid = writeServiceUuid;
    this.notifyServiceUuid = notifyServiceUuid;
    this.writeCharUuid = writeCharUuid;
    this.notifyCharUuid = notifyCharUuid;
    this.deviceName = '';
    this.server = null;
    this.writeChar = null;
    this.notifyChar = null;
    this.isBluefy = navigator.userAgent.indexOf('Bluefy') > 0;

    if (this.constructor == BLEDevice) {
      throw new Error("Abstract classes can't be instantiated.");
    }
  }

  async connect() {
    try {
      if (!this.isBluefy && typeof navigator.bluetooth.getDevices !== "undefined") {
        const devices = await navigator.bluetooth.getDevices()
        if (devices.length > 0) this.device = self.devices.find(device => device.name && device.name.startsWith(this.namePrefix));
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
