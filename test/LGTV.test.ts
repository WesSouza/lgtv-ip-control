import { createSocket, Socket as DgramSocket, SocketType } from 'dgram';
import { AddressInfo, Server, Socket } from 'net';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { LGEncryption } from '../src/classes/LGEncryption.js';
import { LGTV } from '../src/classes/LGTV.js';
import { DefaultSettings } from '../src/constants/DefaultSettings.js';

const CRYPT_KEY = 'M9N0AZ62';
const MAC = 'DA:0A:0F:E1:60:CB';

function stripPadding(padded: string) {
  return padded.substring(0, padded.indexOf('\r'));
}

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
  { ipProto: 'IPv4', address: '127.0.0.1' },
  { ipProto: 'IPv6', address: '::1' },
])('streaming commands $ipProto', ({ address }) => {
  let mockCrypt: LGEncryption;
  let mockServer: Server;
  let mockSocket: Socket;
  let testSettings: typeof DefaultSettings;
  let testTV: LGTV;

  beforeEach(() => {
    mockCrypt = new LGEncryption(CRYPT_KEY);
    mockServer = new Server((socket) => (mockSocket = socket));
    mockServer.listen();
    const port = (<AddressInfo>mockServer.address()).port;
    testSettings = { ...DefaultSettings, networkPort: port };
    testTV = new LGTV(address, MAC, CRYPT_KEY, testSettings);
  });

  afterEach(async () => {
    mockSocket?.destroy();
    await promisify(mockServer.close).bind(mockServer)();
  });

  it('connects', async () => {
    let connected = false;
    const mocking = new Promise((resolve) => {
      mockServer.on('connection', () => {
        connected = true;
        resolve();
      });
    });

    await testTV.connect();
    await mocking;
    expect(connected).toBe(true);
    await testTV.disconnect();
  });

  it('disconnects', async () => {
    let disconnected = false;

    await testTV.connect();
    const mocking = new Promise((resolve) => {
      mockSocket.on('end', () => {
        disconnected = true;
        resolve();
      });
    });
    await testTV.disconnect();
    await mocking;
    expect(disconnected).toBe(true);
  });

  it('gets the current app', async () => {
    let received = false;
    await testTV.connect();
    const mocking = new Promise((resolve) => {
      mockSocket.on('data', async (data) => {
        expect(stripPadding(mockCrypt.decrypt(data))).toBe('CURRENT_APP');
        received = true;
        mockSocket.write(mockCrypt.encrypt('APP:youtube.leanback.v4'), resolve);
      });
    });
    const result = await testTV.getCurrentApp();
    await testTV.disconnect();
    await mocking;
    expect(received).toBe(true);
    expect(stripPadding(result)).toBe('APP:youtube.leanback.v4');
  });
});

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
    let contents = null;
    const mocking = new Promise((resolve) => {
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
