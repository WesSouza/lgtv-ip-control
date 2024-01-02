# LG TV IP Control

<a href="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml"><img src="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml/badge.svg" alt="Lint, Type Check, Test, Build"></a>

<a href="https://www.npmjs.com/package/lgtv-ip-control"><img src="https://img.shields.io/npm/v/lgtv-ip-control" alt="npm version badge"></a>

This is a JS library that implements TCP network control for LG TVs manufactured
since 2018. It utilizes encryption rules based on a guide found on the internet.
A non-encrypted mode is provided for older models, but hasn't been tested.

This library is not provided by LG, and it is not a complete implementation
for every TV model.

Check compatibility and TV setup instructions on the [root's README.md](../../README.md).

### Requirements

- Node 16+ (at least ES2017)
- NPM or Yarn Classic

### Installation

```sh
# Using NPM
npm install lgtv-ip-control


# Using Yarn
yarn add lgtv-ip-control
```

### Usage

Here's a very basic example of how to control the TV:

```js
import { Inputs, LGTV } from 'lgtv-ip-control';

const lgtv = new LGTV('192.168.1.100', '1a:2b:3c:4d:5e:6f', 'KEY1C0DE');

lgtv
  .connect()
  .then(async () => {
    console.log('Disconnect now');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    console.log('Unmutting...');
    await lgtv.setVolumeMute(false);
    console.log('Select HDMI1 input...');
    await lgtv.setInput(Inputs.hdmi1);
    console.log('Done!');
  })
  // Log any errors
  .catch(console.error)
  // Tries disconnecting once done
  .finally(() => lgtv.disconnect());
```

To use `import`, you need to make sure to save the file as `.mjs` or to specify `"type": "module"` on your `package.json`. [Learn more about Node.js' support for ESM.](https://nodejs.org/api/esm.html)

Otherwise replace the first line with:

```js
const { Inputs, LGTV } = require('lgtv-ip-control');
```

### `new LGTV()`

Returns a new instance to control a TV.

```js
const lgtv = new LGTV(
  /**
   * TV IP Address
   */
  '192.168.1.100',

  /**
   * TV MAC Address for being able to turn the TV on remotely, `null` otherwise
   */
  '1a:2b:3c:4d:5e:6f',

  /**
   * Encryption Keycode, as generated during "Setting Up the TV" above.
   * If not provided, uses clear text, but is required by most models.
   */
  'KEY1C0DE',

  /**
   * Additional options (optional)
   *
   * See src/constants/DefaultSettings.ts file.
   */
  {
    ...DefaultSettings,
  },
);
```

### `.connect(): Promise<void>`

Connects to the TV using TCP.

Required before sending any commands.

```js
await lgtv.connect();
```

### `.disconnect(): Promise<void>`

Disconnects from the TV.

```js
await lgtv.disconnect();
```

### `.getCurrentApp(): Promise<Apps | string | null>`

Gets the current app. May be one of the `Apps` enum or an arbitrary string if
the app type is unknown. Might return `null` if the TV is powered off but still
responding.

```js
const currentApp = await lgtv.getCurrentApp();
```

### `.getCurrentVolume(): Promise<number>`

Gets the current volume as an integer from `0` to `100`.

```js
const currentVolume = await lgtv.getCurrentVolume();
```

### `.getIpControlState(): Promise<boolean>`

Gets the ip control state.

```js
const ipControlState = await lgtv.getIpControlState();
```

### `.getMacAddress(type: 'wired' | 'wifi'): Promise<string>`

Gets the MAC address by network interface.

```js
const macAddress = await lgtv.getMacAddress('wired');
```

### `.getMuteState(): Promise<boolean>`

Gets the mute state.

```js
const muteState = await lgtv.getMuteState();
```

### `.getPowerState(): Promise<PowerStates>`

Gets the current TV power state.

Because the TV might be offline, you should call this function before calling
`.connect()`, otherwise you can get a `TimeoutError`.

```js
const powerState = await lgtv.getPowerState();
```

See [`PowerStates`](#PowerStates) for available states.

### `.powerOff(): Promise<void>`

Powers the TV off.

```js
await lgtv.powerOff();
```

### `.powerOn(): void`

Powers the TV on, using Wake On Lan. Requires MAC address to be set when
creating the `LGTV` instance.

```js
lgtv.powerOn();
```

### `.powerOnAndConnect(): Promise<void>`

Powers the TV on, using Wake On Lan, and connects to it. Requires MAC address to
be set when creating the `LGTV` instance. Returns a promise that resolves once
the connection is established, or rejects after a number of retries.

```js
await lgtv.powerOnAndConnect();
```

### `.sendKey(key: Keys): Promise<void>`

Sends a `key`, as if it was pressed on the TV remote control.

```js
await lgtv.sendKey(Keys.menu);
```

See [`Keys`](#Keys) for available keys.

### `.setEnergySaving(level: EnergySavingLevels): Promise<void>`

Sets the current energy saving level. Note that `screenOff` is known not to
work for some models.

```js
await lgtv.setEnergySaving(EnergySavingLevels.maximum);
```

See [`EnergySavingLevels`](#EnergySavingLevels) for available levels.

### `.setInput(input: Inputs): Promise<void>`

Sets the current TV input.

```js
await lgtv.setInput(Inputs.hdmi1);
```

See [`Inputs`](#Inputs) for available inputs.

### `.setVolume(volume: number): Promise<void>`

Sets the volume level as an integer from `0` to `100`.

```js
await lgtv.setVolume(15);
```

### `.setVolumeMute(isMuted: boolean): Promise<void>`

Sets the volume mute state.

```js
await lgtv.setVolumeMute(false);
```

### `.setScreenMute(mode: ScreenMuteModes): Promise<void>`

Sets the current screen mute mode. This can be used to either completely blank
the screen or just blank the video feed while leaving the OSD visible.
Returns a promise.

```js
await lgtv.setScreenMute(ScreenMuteModes.screenmuteon);
```

See [`ScreenMuteModes`](#ScreenMuteModes) for available modes.

## Available Lists

### EnergySavingLevels

| Key       | Brightness Level |
| --------- | ---------------- |
| auto      | Automatic        |
| screenOff | Screen Off       |
| maximum   | Low              |
| medium    | Medium           |
| minimum   | High             |
| off       | Maximum          |

### Inputs

| Key       | Input            |
| --------- | ---------------- |
| dtv       | Digital TV       |
| atv       | Analog TV        |
| cadtv     | Cable Digital TV |
| catv      | Cable TV         |
| av        | AV Composite     |
| component | Component        |
| hdmi1     | HDMI 1           |
| hdmi2     | HDMI 2           |
| hdmi3     | HDMI 3           |
| hdmi4     | HDMI 4           |

### Keys

| Key             | Remote Button        |
| --------------- | -------------------- |
| arrowDown       | Arrow Down           |
| arrowLeft       | Arrow Left           |
| arrowRight      | Arrow Right          |
| arrowUp         | Arrow Up             |
| aspectRatio     | Aspect Ratio Toggle  |
| audioMode       | Audio Mode Toggle    |
| back            | Back                 |
| blueButton      | Blue Button          |
| captionSubtitle | –                    |
| channelDown     | Channel Down         |
| channelList     | Channel List         |
| channelUp       | Channel Up           |
| deviceInput     | Device Input Toggle  |
| energySaving    | Energy Saving Toggle |
| fastForward     | –                    |
| greenButton     | Green Button         |
| home            | Home                 |
| info            | Info                 |
| liveTV          | Live TV              |
| menu            | Open Menu            |
| number0         | Number 0             |
| number1         | Number 1             |
| number2         | Number 2             |
| number3         | Number 3             |
| number4         | Number 4             |
| number5         | Number 5             |
| number6         | Number 6             |
| number7         | Number 7             |
| number8         | Number 8             |
| number9         | Number 9             |
| ok              | Ok                   |
| play            | –                    |
| previousChannel | Previous Channel     |
| programGuide    | Show Program Guide   |
| record          | –                    |
| redButton       | Red Button           |
| rewind          | –                    |
| sleepTimer      | Sleep Timer Toggle   |
| userGuide       | Open User Guide      |
| videoMode       | Video Mode Toggle    |
| volumeDown      | Volume Down          |
| volumeMute      | Mute Toggle          |
| volumeUp        | Volume Up            |
| yellowButton    | Yellow Button        |

### PowerStates

| Key     | State                                        |
| ------- | -------------------------------------------- |
| on      | The TV is on and responding to connections   |
| off     | The TV is off or powering off                |
| unknown | The state of the TV is unknown, possibly off |

### ScreenMuteModes

| Key          | Effect                   |
| ------------ | ------------------------ |
| screenMuteOn | Blank screen             |
| videoMuteOn  | Blank video, OSD visible |
| allMuteOff   | Normal Operation         |
