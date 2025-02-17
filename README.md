# Renogy BT-1 Web
Web application to read Renogy RS232 compatible BT-1 bluetooth adapter. Compatible with Rover / Wanderer / Adventurer series charge controllers. This client does not need a server and works completely using browser side javascript. It might also work with other "SRNE like" devices like Rich Solar, PowMr etc. Please note this is a **completely client side** application similar to the [Renogy BT](https://apps.apple.com/us/app/renogy-bt/id1251320287) app, so make sure your browser device is close to your bt1 adapter.

<img src="https://user-images.githubusercontent.com/5549113/196418782-3f9d06b4-d75b-479d-99da-67616a208ed0.png" width="280px">


### Platform Compatibility
|Browser|Native|Third party|
-|-|-|
|Desktop Chrome|✅ |-|
|iOS Webkit|❌|✅|
|Android Chrome|✅|-|
|ChromeOS Chrome|✅|-|
|Linux Chromium|✅|-| (have to enable 'Experimental Web Platform features', 'Web Bluetooth', 'Web Bluetooth confirm pairing support' but disable 'Use the new permissions backend for Web Bluetooth')

This web app is tested with Chrome Desktop and in iOS devices you can use [Bluefy](https://apps.apple.com/us/app/bluefy-web-ble-browser/id1492822055) or [WebBLE](https://apps.apple.com/us/app/webble/id1193531073).

### Demo
Visit the github page for demo https://cyrils.github.io/web-bt1-monitor/

### References
 - [corbinbs/solarshed](https://github.com/corbinbs/solarshed)
 - [Rover 20A/40A Charge Controller—MODBUS Protocol](https://docs.google.com/document/d/1OSW3gluYNK8d_gSz4Bk89LMQ4ZrzjQY6/edit)
