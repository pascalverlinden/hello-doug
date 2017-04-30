# urvogel
Chickens on a Chain - Eris/IoT

## Hardware Requirements
* Raspberry Pi 2/Pi 3
* [NFC/RFID reader](https://www.adafruit.com/product/364)
* [NFC/RFID tags][Amazon NFC stickers]

[Amazon NFC stickers]: https://www.amazon.com/gp/product/B01D8RDNZ0/ref=oh_aui_detailpage_o07_s00?ie=UTF8&psc=1

## Software Requirement
* [Hypriot Docker](http://blog.hypriot.com/downloads/)
* [eris Blockchain tools](https://erisindustries.com/)

## Dependency Projects
* [node-nfc](https://github.com/camme/node-nfc)

## Try The Code
### Throw in your eggs
```bash
sudo node eggs.js
```

And place the tag to the reader, you'll see the eggs number goes up.

## Known Problems
0. The `node-nfc` node dependency has issue with the `nfc.parse` function. 

   You can pull the [forked node-nfc repo](https://github.com/shuangjj/node-nfc),  
   which fixed the problem and build the module by `node-gyp`.

