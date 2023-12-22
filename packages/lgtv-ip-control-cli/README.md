# LG TV IP Control CLI

<a href="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml"><img src="https://github.com/WesSouza/lgtv-ip-control/actions/workflows/lint-typecheck-test-build.yml/badge.svg" alt="Lint, Type Check, Test, Build"></a>

<a href="https://www.npmjs.com/package/lgtv-ip-control-cli"><img src="https://img.shields.io/npm/v/lgtv-ip-control-cli" alt="npm version badge"></a>

For simple use cases, a command line interface is provided. Prebuilt binaries are made available for Linux, MacOS, and Windows. All prebuilds are x64 only (no ARM support for MacOS yet, but Rosetta 2 should work).

### Usage

Some commands take discrete identifiers as arguments (e.g. mode, level, key) which are [listed below](#Identifiers).

```
Usage: lgtv-ip-control [options] [command]

Options:
  -o, --host <address>         IP or DNS address of TV.
  -m, --mac <address>          MAC address of TV. Required for power on.
  -k, --keycode <keycode>      Encryption keycode provided by TV.
  -p, --port <port>            LG IP control server port. (default: 9761)
  -w, --wol_address <address>  Broadcast address used by WOL for power on. Must be set if
                               TV is not on local subnet.
  -t, --timeout <seconds>      Time for television to respond to a command before an error
                               is returned. (default: 5)
  -h, --help                   display help for command

Commands:
  power <state>                Turn TV on or off.
  volume [level]               Set the volume level.
  mute [state]                 Mute TV audio.
  input <input>                Select input.
  energysaving <level>         Select energy saving level.
  key [options] <keys...>      Remote control key presses with optional pauses.
  mac <iface>                  Retrieve the TV's MAC addresses.
  picturemode <mode>           Select picture mode.
  screenmute <mode>            Blank either the input video or the entire screen.
  help [command]               display help for command
```

### Excluding

Note that the CLI is optional and can be excluded when installing the library as described below. The CLI will only function if the optional dependencies `commander` and `@commander-js/extra-typings` are present. If not present, the library will continue to work normally.

## License

MIT, https://wes.dev/LICENSE.txt
