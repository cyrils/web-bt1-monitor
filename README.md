# Renogy BT-1 Web
Web application to read Renogy RS232 compatible BT-1 bluetooth adapter. Compatible with Rover / Wanderer / Adventurer series charge controllers. This client does not need a server and works completely using browser side javascript. It might also work with other "SRNE like" devices like Rich Solar, PowMr etc. Please note this is a **completely client side** application similar to the [Renogy BT](https://apps.apple.com/us/app/renogy-bt/id1251320287) app, so make sure your browser device is close to your bt1 adapter.

<img  width="280px" src="https://github.com/user-attachments/assets/eb751f00-edfc-499a-bb63-7abf408e5867" />

### Rover readings

- **Live** shows solar input, battery readings, and load output. It also includes the load switch.
- **Energy** shows today's charge and discharge totals, peak power, lifetime generation, and up to seven daily records. History is read when you connect.
- **Controller** shows the model, device address, battery type, and controller temperature. Optional fields may be unavailable on some models.

### Simulator

Open `index.html` or the hosted monitor and choose **Start simulator** to try the Rover tabs without a Bluetooth adapter. Solar input and energy totals change with each poll. Use the load switch to change the simulated load, then choose **Stop simulator** to return to device search.

### Platform Compatibility
|Browser|Native|Third party|
-|-|-|
|Desktop Chrome|✅ |-|
|iOS Webkit|❌|✅|
|Android Chrome|✅|-|
|ChromeOS Chrome|✅|-|
|Linux Chromium|✅|-| 


This web app is tested with Chrome Desktop and in iOS devices you can use [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) app. In Linux Chromium you have to enable 'Experimental Web Platform features', 'Web Bluetooth', 'Web Bluetooth confirm pairing support' but disable 'Use the new permissions backend for Web Bluetooth'

### Demo
Visit the github page for demo https://cyrils.github.io/web-bt1-monitor/

### References
 - [corbinbs/solarshed](https://github.com/corbinbs/solarshed)
 - [Rover 20A/40A Charge Controller—MODBUS Protocol](https://docs.google.com/document/d/1OSW3gluYNK8d_gSz4Bk89LMQ4ZrzjQY6/edit)
 - [renogy-bt Rover register mappings](https://github.com/cyrils/renogy-bt/tree/main/renogybt)
