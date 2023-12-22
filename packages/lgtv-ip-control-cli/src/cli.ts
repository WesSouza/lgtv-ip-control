import {
  Argument,
  Command,
  InvalidArgumentError,
} from '@commander-js/extra-typings';

import {
  DefaultSettings,
  EnergySavingLevels,
  Inputs,
  Keys,
  LGTV,
  PictureModes,
  ScreenMuteModes,
} from 'lgtv-ip-control';

function createCommand(name: string, description: string) {
  return new Command(name).description(description).allowExcessArguments(false);
}

function positiveNumber(value: string) {
  const parsed = parseFloat(value);
  if (parsed < 0) throw new InvalidArgumentError(`Must be a positive number.`);
  return parsed;
}

// Returns a parsing function
function rangeInt(min: number, max: number) {
  return (value: string) => {
    const parsed = parseFloat(value);
    if (!Number.isSafeInteger(parsed) || parsed < min || parsed > max)
      throw new InvalidArgumentError(
        `Must be an integer between ${min} and ${max}.`,
      );
    return parsed;
  };
}

export function makeProgram() {
  function wrapTVAction<A extends unknown[], R>(
    action: (tv: LGTV, ...args: A) => Promise<R>,
  ) {
    return async (...args: A): Promise<R> => {
      try {
        const opts = program.opts();
        const tv = new LGTV(opts.host, opts.mac ?? null, opts.keycode);
        return await action(tv, ...args);
      } catch (err) {
        if (err instanceof Error) program.error(err.message);
        throw err;
      }
    };
  }

  const power = createCommand('power', 'Turn TV on or off.')
    .addArgument(new Argument('<state>', 'Power state.').choices(['on', 'off']))
    .action(
      wrapTVAction(async (tv, state) => {
        switch (state) {
          case 'on':
            await tv.powerOn();
            break;
          case 'off':
            await tv.connect();
            await tv.powerOff();
            await tv.disconnect();
            break;
        }
      }),
    );

  const volume = createCommand('volume', 'Set the volume level.')
    .addArgument(
      new Argument(
        '[level]',
        'Integer from 0 to 100. If not specified, returns current volume level.',
      ).argParser(rangeInt(0, 100)),
    )
    .action(
      wrapTVAction(async (tv, level) => {
        await tv.connect();
        if (level === undefined)
          process.stdout.write(String(await tv.getCurrentVolume()) + '\n');
        else await tv.setVolume(level);
        await tv.disconnect();
      }),
    );

  const mute = createCommand('mute', 'Mute TV audio.')
    .addArgument(
      new Argument(
        '[state]',
        'If not specified, returns current mute state.',
      ).choices(Object.values(['on', 'off'])),
    )
    .action(
      wrapTVAction(async (tv, state) => {
        await tv.connect();
        switch (state) {
          case 'on':
            await tv.setVolumeMute(true);
            break;
          case 'off':
            await tv.setVolumeMute(false);
            break;
          default:
            process.stdout.write((await tv.getMuteState()) ? 'on\n' : 'off\n');
            break;
        }
        await tv.disconnect();
      }),
    );

  const input = createCommand('input', 'Select input.')
    .addArgument(
      new Argument('<input>', 'Video input source.').choices([
        ...Object.keys(Inputs),
      ]),
    )
    .action(
      wrapTVAction(async (tv, input) => {
        await tv.connect();
        await tv.setInput(Inputs[input as keyof typeof Inputs]);
        await tv.disconnect();
      }),
    );

  const energysaving = createCommand(
    'energysaving',
    'Select energy saving level.',
  )
    .addArgument(
      new Argument('<level>', 'Named energy saving level.').choices([
        ...Object.keys(EnergySavingLevels),
      ]),
    )
    .action(
      wrapTVAction(async (tv, level) => {
        await tv.connect();
        await tv.setEnergySaving(
          EnergySavingLevels[level as keyof typeof EnergySavingLevels],
        );
        await tv.disconnect();
      }),
    );

  const key = createCommand(
    'key',
    'Remote control key presses with optional pauses.',
  )
    .addArgument(
      new Argument(
        '<keys...>',
        'Ordered list of keys to press or "pause".',
      ).choices([...Object.keys(Keys), 'pause']),
    )
    .option(
      '-u, --pause_duration <secs>',
      'Duration of pause in seconds.',
      parseFloat,
      1,
    )
    .action(
      wrapTVAction(async (tv, keys, options) => {
        await tv.connect();
        for (const pressed of keys) {
          switch (pressed) {
            case 'pause':
              await new Promise((resolve) =>
                setTimeout(resolve, options.pause_duration * 1000),
              );
              break;
            default:
              await tv.sendKey(Keys[pressed as keyof typeof Keys]);
              break;
          }
        }
        await tv.disconnect();
      }),
    );

  const mac = createCommand('mac', "Retrieve the TV's MAC addresses.")
    .addArgument(
      new Argument('<iface>', 'Interface to report MAC address for.')
        .argParser((value) => value as 'wired' | 'wifi')
        .choices(['wired', 'wifi']),
    )
    .action(
      wrapTVAction(async (tv, iface) => {
        await tv.connect();
        process.stdout.write((await tv.getMacAddress(iface)) + '\n');
        await tv.disconnect();
      }),
    );

  const picturemode = createCommand('picturemode', 'Select picture mode.')
    .addArgument(
      new Argument('<mode>', 'Named picture mode.').choices([
        ...Object.keys(PictureModes),
      ]),
    )
    .action(
      wrapTVAction(async (tv, mode) => {
        await tv.connect();
        await tv.setPictureMode(
          PictureModes[mode as keyof typeof PictureModes],
        );
        await tv.disconnect();
      }),
    );

  const screenmute = createCommand(
    'screenmute',
    'Blank either the input video or the entire screen.',
  )
    .addArgument(
      new Argument('<mode>', 'Named screen mute mode.').choices([
        ...Object.keys(ScreenMuteModes),
      ]),
    )
    .action(
      wrapTVAction(async (tv, mode) => {
        await tv.connect();
        await tv.setScreenMute(
          ScreenMuteModes[mode as keyof typeof ScreenMuteModes],
        );
        await tv.disconnect();
      }),
    );

  const program = new Command()
    .requiredOption('-o, --host <address>', 'IP or DNS address of TV.')
    .option('-m, --mac <address>', 'MAC address of TV. Required for power on.')
    .requiredOption(
      '-k, --keycode <keycode>',
      'Encryption keycode provided by TV.',
    )
    .option(
      '-p, --port <port>',
      'LG IP control server port.',
      rangeInt(0, 65535),
      DefaultSettings.networkPort,
    )
    .option(
      '-w, --wol_address <address>',
      'Broadcast address used by WOL for power on. Must be set if TV is not on ' +
        'local subnet.',
    )
    .option(
      '-t, --timeout <seconds>',
      'Time for television to respond to a command before an error is returned.',
      positiveNumber,
      DefaultSettings.networkTimeout / 1000,
    )
    .addCommand(power)
    .addCommand(volume)
    .addCommand(mute)
    .addCommand(input)
    .addCommand(energysaving)
    .addCommand(key)
    .addCommand(mac)
    .addCommand(picturemode)
    .addCommand(screenmute);

  return program;
}
