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

See [the library's README.md](./packages/lgtv-ip-control/README.md)

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
