# LG TV IP Control

<a href="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml"><img src="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml/badge.svg" alt="Lint, Type Check, Test, Build"></a>

<a href="https://www.npmjs.com/package/lgtv-ip-control"><img src="https://img.shields.io/npm/v/lgtv-ip-control" alt="npm version badge"></a>

This is a JS library that implements TCP network control for LG TVs manufactured
since 2018. It utilizes encryption rules based on a guide found on the internet.
A non-encrypted mode is provided for older models, but hasn't been tested.

This library is not provided by LG, and it is not a complete implementation
for every TV model.

## Televisions

According to LG's own documentation, this tool should generally work with all
models after 2018, though not every feature included here may work on every TV.
Due to scarce documentation by LG, functionality specific to some model
variants may be missing.

All models since 2018 should require encryption and will generate a keycode that
needs to be used by the client to initialize the encryption.
Some LG docs indicate that there were older models that supported this interface
without encryption.
A non-encrypted mode is provided in an attempt to support these models, but
hasn't been tested.

### Tested Models

- OLED65B9PUA
- OLED42C2PUA

Users report that CX models work, but with the limitation that the Freesat input
can't be directly selected.

### TV Setup

Before the TV can be controlled using this library, Network IP Control needs to
be enabled.
It's found in a hidden menu that can be easily accessed.

1. Open the "All Settings" menu on the TV.
2. Using the remote arrows, navigate the focus to "Connection" but do not enter
   it.
   For some TVs, this may say "Network" instead.
3. Quickly, press `82888` using the remote numeric buttons.
4. Note the MAC and IP addresses for client configuration.
   The MAC address is required to remotely power on the TV.
5. Select and enable "Network IP Control".
6. For TVs that require encryption, there is a "Generate Keycode" option.
   Click it and note the 8 characters code displayed for client configuration.
   This keycode is required for all commands except power on.
   A new keycode can be generated at any time.
7. To allow the TV to be powered on remotely, enable "Wake On LAN".

## CLI

See [CLI's README.md](./packages/lgtv-ip-control-cli/README.md)

## Library

### Requirements

- Node 16+ (at least ES2017)
- NPM or Yarn Classic

### Installation

```sh
# Using NPM
npm install lgtv-ip-control

# Using NPM, but excluding the CLI
npm install --no-optional lgtv-ip-control

# Using Yarn
yarn add lgtv-ip-control
```

### Usage

Here's a very basic example of how to control the TV:

```ts
import { LGTV } from 'lgtv-ip-control';

const tv = new LGTV('192.168.1.100', '1a:2b:3c:4d:5e:6f', 'KEY1C0DE');

tv.connect()
  .then(async () => {
    console.log('Unmutting...');
    await tv.setVolumeMute(false);
    console.log('Setting volume to 15...');
    await tv.setVolume(50);
    console.log('Done!');
  })
  .catch(console.error);
```

To use `import`, you need to make sure to save the file as `.mjs` or to specify `"type": "module"` on your `package.json`. [Learn more about Node.js' support for ESM.](https://nodejs.org/api/esm.html)

Otherwise replace the first line with:

```js
const { LGTV } = require('lgtv-ip-control');
```

### `new LGTV()`

Returns a new instance to control a TV.

```ts
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
  }
);
```

### `.connect(): Promise<void>`

Connects to the TV using TCP.

Required before sending any commands.

```ts
await lgtv.connect();
```

### `.disconnect(): Promise<void>`

Disconnects from the TV.

```ts
await lgtv.disconnect();
```

### `.getCurrentApp(): Promise<Apps | string>`

Gets the current app. May be one of the `Apps` enum or an arbitrary string if
the app type is unknown.

```ts
const currentApp = await lgtv.getCurrentApp();
```

### `.getCurrentVolume(): Promise<number>`

Gets the current volume as an integer from `0` to `100`.

```ts
const currentVolume = await lgtv.getCurrentVolume();
```

### `.getIpControlState(): Promise<boolean>`

Gets the ip control state.

```ts
const ipControlState = await lgtv.getIpControlState();
```

### `.getMacAddress(type: 'wired' | 'wifi'): Promise<string>`

Gets the MAC address by network interface.

```ts
const macAddress = await lgtv.getMacAddress('wired');
```

### `.getMuteState(): Promise<boolean>`

Gets the mute state.

```ts
const muteState = await lgtv.getMuteState();
```

### `.powerOff(): Promise<void>`

Powers the TV off.

```ts
await lgtv.powerOff();
```

### `.powerOn(): void`

Powers the TV on, using Wake On Lan. Requires MAC address to be set when
creating the `LGTV` instance.

```ts
lgtv.powerOn();
```

### `.sendKey(key: Keys): Promise<void>`

Sends a `key`, as if it was pressed on the TV remote control.

```ts
await lgtv.sendKey(Keys.menu);
```

See [`Keys`](#Keys) for available keys.

### `.setEnergySaving(level: EnergySavingLevels): Promise<void>`

Sets the current energy saving level. Note that `screenOff` is known not to
work for some models.

```ts
await lgtv.setEnergySaving(EnergySavingLevels.maximum);
```

See [`EnergySavingLevels`](#EnergySavingLevels) for available levels.

### `.setInput(input: Inputs): Promise<void>`

Sets the current TV input.

```ts
await lgtv.setInput(Inputs.hdmi1);
```

See [`Inputs`](#Inputs) for available inputs.

### `.setVolume(volume: number): Promise<void>`

Sets the volume level as an integer from `0` to `100`.

```ts
await lgtv.setVolume(15);
```

### `.setVolumeMute(isMuted: boolean): Promise<void>`

Sets the volume mute state.

```ts
await lgtv.setVolumeMute(false);
```

### `.setScreenMute(mode: ScreenMuteModes): Promise<void>`

Sets the current screen mute mode. This can be used to either completely blank
the screen or just blank the video feed while leaving the OSD visible.
Returns a promise.

```ts
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

### ScreenMuteModes

| Key          | Effect                   |
| ------------ | ------------------------ |
| screenMuteOn | Blank screen             |
| videoMuteOn  | Blank video, OSD visible |
| allMuteOff   | Normal Operation         |

## Development

Install
[Node.js](https://nodejs.org/en/learn/getting-started/how-to-install-nodejs) and
[Yarn v1](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable).

On a terminal, run:

```sh
yarn install
```

Before committing, make sure to check the code is formatted, linted, and tests
and building work:

```sh
yarn check:format
yarn check:types
yarn test
yarn build
```

## License

MIT, https://wes.dev/LICENSE.txt
