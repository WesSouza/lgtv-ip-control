import { createSocket, Socket as DgramSocket, SocketType } from 'dgram';
import { AddressInfo, Server, Socket } from 'net';
import { promisify } from 'util';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { DefaultSettings } from '../src/constants/DefaultSettings.js';
import { TinySocket } from '../src/classes/TinySocket.js';

const MAC = 'DA:0A:0F:E1:60:CB';

describe.each([
  { ipProto: 'IPv4', address: '127.0.0.1' },
  { ipProto: 'IPv6', address: '::1' },
])('TinySocket using $ipProto', ({ address }) => {
  let mockServer: Server;
  let mockServerSocket: Socket;
  let testSettings: typeof DefaultSettings;
  let socket: TinySocket;

  beforeEach(() => {
    mockServer = new Server((socket) => {
      mockServerSocket = socket;
    }).listen();
    const port = (<AddressInfo>mockServer.address()).port;
    testSettings = { ...DefaultSettings, networkPort: port };
    socket = new TinySocket(address, null, testSettings);
  });

  afterEach(async () => {
    if (socket.connected) {
      await socket.disconnect();
    }

    await new Promise((resolve) => {
      mockServerSocket.end(() => {
        resolve(undefined);
      });
      mockServer.unref();
    });
  });

  it('connects', async () => {
    const mocking = new Promise<void>((resolve) => {
      mockServer.on('connection', () => {
        resolve();
      });
    });
    await socket.connect();
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
    await socket.connect();
    await socket.disconnect();
    await expect(mocking).resolves.not.toThrow();
  });

  it('throws when already connected', async () => {
    await socket.connect();

    expect(socket.connect()).rejects.toEqual(
      expect.objectContaining({
        message: 'should not be connected',
      }),
    );
  });

  it('disconnecting a disconnected socket is a noop', async () => {
    expect(socket.disconnect()).resolves.not.toThrow();
  });

  it('reads', async () => {
    const buffer = Buffer.from('abc', 'utf-8');

    const mockedResponse = new Promise((resolve, reject) => {
      mockServer.on('connection', (socket) => {
        socket.write(buffer, (err) => (err ? reject(err) : resolve(undefined)));
      });
    });

    await socket.connect();
    const actual = socket.read();
    await expect(mockedResponse).resolves.not.toThrow();
    await expect(actual).resolves.toStrictEqual(buffer);
  });

  it('writes', async () => {
    const mockedReader = new Promise((resolve) => {
      mockServer.on('connection', (socket) => {
        socket.on('data', (data) => {
          resolve(data);
        });
      });
    });

    const buffer = Buffer.from('abc', 'utf-8');

    await socket.connect();
    const actual = socket.write(buffer);
    await expect(actual).resolves.not.toThrow();
    await expect(mockedReader).resolves.toStrictEqual(buffer);
  });

  it('writes then reads', async () => {
    const bufferSent = Buffer.from('abc', 'utf-8');
    const bufferReceive = Buffer.from('def', 'utf-8');

    const mockedReader = new Promise((resolve, reject) => {
      mockServer.on('connection', (socket) => {
        socket.on('data', (data) => {
          socket.write(bufferReceive, (err) =>
            err ? reject(err) : resolve(undefined),
          );
          resolve(data);
        });
      });
    });

    await socket.connect();
    const actual = socket.sendReceive(bufferSent);
    await expect(actual).resolves.toStrictEqual(bufferReceive);
    await expect(mockedReader).resolves.toStrictEqual(bufferSent);
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
  let socket: TinySocket;

  beforeEach(async () => {
    mockSocket = createSocket(socketType);
    await promisify(mockSocket.bind).bind(mockSocket)();
    const port = mockSocket.address().port;
    testSettings = {
      ...DefaultSettings,
      networkWolPort: port,
      networkWolAddress: address,
    };
    socket = new TinySocket(address, MAC, testSettings);
  });

  afterEach(async () => {
    await promisify(mockSocket.close).bind(mockSocket)();
  });

  it('sends wake on lan payload', async () => {
    let received = false;
    let contents: Buffer | null = null;
    const mocking = new Promise<void>((resolve) => {
      mockSocket.on('message', (msg) => {
        received = true;
        contents = msg;
        resolve();
      });
    });
    socket.wakeOnLan();
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
