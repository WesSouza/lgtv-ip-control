import { createSocket, Socket as DgramSocket, SocketType } from 'dgram';
import { AddressInfo, Server } from 'net';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LGEncoder, LGEncryption } from '../src/classes/LGEncryption.js';
import { LGTV } from '../src/classes/LGTV.js';
import { DefaultSettings } from '../src/constants/DefaultSettings.js';
import {
  Apps,
  EnergySavingLevels,
  Inputs,
  Keys,
  PictureModes,
  ScreenMuteModes,
} from '../src/constants/TV.js';

const CRYPT_KEY = 'M9N0AZ62';
const MAC = 'DA:0A:0F:E1:60:CB';

describe('LGTV', () => {
  it('constructs with valid parameters', () => {
    const tv = new LGTV('127.0.0.1', MAC, CRYPT_KEY);
    expect(tv).toBeTruthy();
  });

  it('constructs with IPv6', () => {
    const tv = new LGTV('::1', MAC, CRYPT_KEY);
    expect(tv).toBeTruthy();
  });

  it('constructs without a MAC address', () => {
    const tv = new LGTV('127.0.0.1', null, CRYPT_KEY);
    expect(tv).toBeTruthy();
  });
});

describe.each([
  { ipProto: 'IPv4', address: '127.0.0.1', crypt: false, ctext: 'out' },
  { ipProto: 'IPv4', address: '127.0.0.1', crypt: true, ctext: '' },
  { ipProto: 'IPv6', address: '::1', crypt: false, ctext: 'out' },
  { ipProto: 'IPv6', address: '::1', crypt: true, ctext: '' },
])(
  'streaming commands $ipProto, with$ctext encryption',
  ({ address, crypt }) => {
    let mockEncode: LGEncoder;
    let mockServer: Server;
    let testSettings: typeof DefaultSettings;
    let testTV: LGTV;

    async function mockResponse(request: string, response: string) {
      const mockedResponse = new Promise((resolve) => {
        mockServer.on('connection', (socket) => {
          socket.on('data', async (data) => {
            expect(mockEncode.decode(data)).toBe(request);
            socket.write(mockEncode.encode(response), resolve);
          });
        });
      });
      return expect(mockedResponse).resolves.not.toThrow();
    }

    beforeEach(() => {
      if (!crypt) {
        mockEncode = new LGEncoder({
          ...DefaultSettings,
          messageTerminator: '\n',
          responseTerminator: '\r',
        });
      } else {
        mockEncode = new LGEncryption(CRYPT_KEY, {
          ...DefaultSettings,
          messageTerminator: '\n',
          responseTerminator: '\r',
        });
      }
      mockServer = new Server().listen();
      const port = (<AddressInfo>mockServer.address()).port;
      testSettings = { ...DefaultSettings, networkPort: port };
      testTV = new LGTV(address, MAC, crypt ? CRYPT_KEY : null, testSettings);
    });

    afterEach(async () => {
      await testTV.disconnect();
      // Graceful shutdown of net.Server doesn't work correctly on macOS.
      // Work around it by making sure the socket has a chance to close first.
      await new Promise((resolve) => setImmediate(resolve));
      await promisify(mockServer.close).bind(mockServer)();
    });

    it('connects', async () => {
      const mocking = new Promise<void>((resolve) => {
        mockServer.on('connection', () => {
          resolve();
        });
      });
      await testTV.connect();
      await expect(mocking).resolves.not.toThrow();
    });

    it('disconnects', async () => {
      const mocking = new Promise<void>((resolve) => {
        mockServer.on('connection', (socket) => {
          socket.on('end', () => {
            resolve();
          });
        });
      });
      await testTV.connect();
      await testTV.disconnect();
      await expect(mocking).resolves.not.toThrow();
    });

    it.each([
      { response: 'APP:youtube.leanback.v4', expected: Apps.youtube },
      { response: 'APP:com.hbo.hbomax', expected: Apps.hbomax },
      { response: 'APP:netflix', expected: Apps.netflix },
    ])('gets current app: $response', async ({ response, expected }) => {
      const mocking = mockResponse('CURRENT_APP', response);
      await testTV.connect();
      const actual = testTV.getCurrentApp();
      await expect(mocking).resolves.not.toThrow();
      if (expected === null) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.toBe(expected);
    });

    it.each([
      { response: 'VOL:0', expected: 0 },
      { response: 'VOL:43', expected: 43 },
      { response: 'VOL:100', expected: 100 },
      { response: 'VOL:1d00', expected: null },
    ])('gets current volume: $response', async ({ response, expected }) => {
      const mocking = mockResponse('CURRENT_VOL', response);
      await testTV.connect();
      const actual = testTV.getCurrentVolume();
      await expect(mocking).resolves.not.toThrow();
      if (expected === null) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.toBe(expected);
    });

    it.each([
      { response: 'MUTE:on', expected: true },
      { response: 'MUTE:off', expected: false },
      { response: 'MUTE:foo', expected: null },
    ])('gets current mute state: $response', async ({ response, expected }) => {
      const mocking = mockResponse('MUTE_STATE', response);
      await testTV.connect();
      const actual = testTV.getMuteState();
      await expect(mocking).resolves.not.toThrow();
      if (expected === null) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.toBe(expected);
    });

    it.each([
      { response: 'ON', expected: true },
      { response: 'OFF', expected: null },
    ])('gets ip control state: $expected', async ({ response, expected }) => {
      const mocking = mockResponse('GET_IPCONTROL_STATE', response);
      await testTV.connect();
      const actual = testTV.getIpControlState();
      await expect(mocking).resolves.not.toThrow();
      if (expected === null) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.toBe(expected);
    });

    it.each([
      { response: 'OK', error: false },
      { response: 'FOO', error: true },
    ])('powers off: $expected', async ({ response, error }) => {
      const mocking = mockResponse('POWER off', response);
      await testTV.connect();
      const actual = testTV.powerOff();
      await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { mode: PictureModes.cinema, error: false },
      { mode: 'foobar', error: true },
    ])('sets picture mode: $mode', async ({ mode, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`PICTURE_MODE ${mode}`, 'OK');
      await testTV.connect();
      const actual = testTV.setPictureMode(mode as PictureModes);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { key: Keys.number5, error: false },
      { key: 'foobar', error: true },
    ])('sends key: $key', async ({ key, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`KEY_ACTION ${key}`, 'OK');
      await testTV.connect();
      const actual = testTV.sendKey(key as Keys);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { mode: ScreenMuteModes.screenMuteOn, error: false },
      { mode: 'foobar', error: true },
    ])('sets picture mode: $mode', async ({ mode, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`SCREEN_MUTE ${mode}`, 'OK');
      await testTV.connect();
      const actual = testTV.setScreenMute(mode as ScreenMuteModes);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { level: EnergySavingLevels.maximum, error: false },
      { level: 'foobar', error: true },
    ])('sets energy saving level: $level', async ({ level, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`ENERGY_SAVING ${level}`, 'OK');
      await testTV.connect();
      const actual = testTV.setEnergySaving(level as EnergySavingLevels);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { input: Inputs.hdmi3, error: false },
      { input: 'foobar', error: true },
    ])('sets input: $input', async ({ input, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`INPUT_SELECT ${input}`, 'OK');
      await testTV.connect();
      const actual = testTV.setInput(input as Inputs);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { level: 0, error: false },
      { level: 43, error: false },
      { level: 100, error: false },
      { level: 101, error: true },
      { level: -1, error: true },
      { level: 1.5, error: true },
    ])('sets volume: $level', async ({ level, error }) => {
      let mocking: Promise<void> | null = null;
      if (!error) mocking = mockResponse(`VOLUME_CONTROL ${level}`, 'OK');
      await testTV.connect();
      const actual = testTV.setVolume(level);
      if (!error) await expect(mocking).resolves.not.toThrow();
      if (error) await expect(actual).rejects.toThrow();
      else await expect(actual).resolves.not.toThrow();
    });

    it.each([
      { isMuted: true, request: 'VOLUME_MUTE on' },
      { isMuted: false, request: 'VOLUME_MUTE off' },
    ])('sets volume mute: $isMuted', async ({ isMuted, request }) => {
      const mocking = mockResponse(request, 'OK');
      await testTV.connect();
      const actual = testTV.setVolumeMute(isMuted);
      await expect(mocking).resolves.not.toThrow();
      await expect(actual).resolves.not.toThrow();
    });
  },
);

describe.each([
  {
    ipProto: 'IPv4',
    address: '127.0.0.1',
    socketType: 'udp4' as SocketType,
  },
  { ipProto: 'IPv6', address: '::1', socketType: 'udp6' as SocketType },
])('datagram commands $ipProto', ({ address, socketType }) => {
  let mockSocket: DgramSocket;
  let testSettings: typeof DefaultSettings;
  let testTV: LGTV;

  beforeEach(async () => {
    mockSocket = createSocket(socketType);
    await promisify(mockSocket.bind).bind(mockSocket)();
    const port = mockSocket.address().port;
    testSettings = {
      ...DefaultSettings,
      networkWolPort: port,
      networkWolAddress: address,
    };
    testTV = new LGTV(address, MAC, CRYPT_KEY, testSettings);
  });

  afterEach(async () => {
    await promisify(mockSocket.close).bind(mockSocket)();
  });

  it('powers on', async () => {
    let received = false;
    let contents: Buffer | null = null;
    const mocking = new Promise<void>((resolve) => {
      mockSocket.on('message', (msg) => {
        received = true;
        contents = msg;
        resolve();
      });
    });
    testTV.powerOn();
    await mocking;
    expect(received).toBe(true);
    expect(contents).toStrictEqual(
      Buffer.from([
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb, 0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
        0xda, 0x0a, 0x0f, 0xe1, 0x60, 0xcb,
      ]),
    );
  });
});
