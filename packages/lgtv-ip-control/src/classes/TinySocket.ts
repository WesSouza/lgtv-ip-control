import assert from 'assert';
import { createSocket } from 'dgram';
import { isIP, isIPv6, Socket } from 'net';

import { DefaultSettings } from '../constants/DefaultSettings.js';

export interface SocketSettings {
  networkPort: number;
  networkTimeout: number;
  networkWolAddress: string;
  networkWolPort: number;
}

const MacAddressMatcher = /^([0-9a-f]{2}:){5}([0-9a-f]{2})$/i;
const MacAddressBlockSeparator = ':';
const MacAddressBlocksCount = 6;
const WolMacAddressCount = 16;
const WolSyncByte = 0xff;
const WolSyncCount = 6;

function assertSettings(settings: SocketSettings) {
  assert(
    typeof settings === 'object' && settings !== null,
    'settings must be an object',
  );

  const { networkPort, networkTimeout, networkWolAddress, networkWolPort } =
    settings;
  assert(
    typeof networkPort === 'number' && networkPort > 0,
    'settings.networkPort must be a number greater than 0',
  );
  assert(
    typeof networkTimeout === 'number' && networkTimeout > 0,
    'settings.networkTimeout must be a number greater than 0',
  );
  assert(
    typeof networkWolAddress === 'string' && networkWolAddress.length > 0,
    'settings.networkWolAddress must be a string with length greater than 0',
  );
  assert(
    isIP(networkWolAddress),
    'settings.networkWolAddress must be a valid IPv4 or IPv6',
  );
  assert(
    typeof networkWolPort === 'number' && networkWolPort > 0,
    'settings.networkWolPort must be a number greater than 0',
  );
}

export class MaxRetriesError extends Error {}

export class TimeoutError extends Error {}

export class TinySocket {
  #client = new Socket();
  #connected = false;

  constructor(
    private host: string,
    private macAddress: string | null,
    private settings = DefaultSettings,
  ) {
    assertSettings(settings);
    assert(
      macAddress === null || MacAddressMatcher.test(macAddress),
      'invalid mac address',
    );
  }

  #assertConnected() {
    assert(this.connected, 'should be connected');
  }

  #assertDisconnected() {
    assert(!this.connected, 'should not be connected');
  }

  get connected() {
    return (
      this.#connected && !this.#client.connecting && !this.#client.destroyed
    );
  }

  wrap<T>(
    method: (
      resolve: (value: T) => void,
      reject: (error: Error) => void,
    ) => void,
    options: { destroyClientOnError?: boolean } = {},
  ): Promise<T> {
    const { destroyClientOnError = false } = options;

    return new Promise((resolve, reject) => {
      const cleanup = () => {
        this.#client.removeListener('error', handleError);
        this.#client.removeListener('timeout', handleTimeout);
      };

      const handleError = (error: Error) => {
        if (destroyClientOnError) {
          this.#connected = false;
          this.#client.destroy();
          this.#client = new Socket();
        }

        reject(error);
      };

      const handleTimeout = () => {
        cleanup();
        handleError(new TimeoutError());
      };

      this.#client.once('error', handleError);
      this.#client.once('timeout', handleTimeout);

      method(
        (value: T) => {
          cleanup();
          resolve(value);
        },
        (error: Error) => {
          cleanup();
          handleError(error);
        },
      );
    });
  }

  async connect(
    options: {
      maxRetries?: number;
      retryTimeout?: number;
    } = {},
  ): Promise<void> {
    this.#assertDisconnected();

    const { maxRetries = 0, retryTimeout = 750 } = options;
    if (maxRetries > 0) {
      return new Promise((resolve, reject) => {
        let retries = 0;

        const connect = (error?: Error) => {
          this.#client.removeAllListeners();
          this.#client.destroy();
          this.#client = new Socket();

          if (retries >= maxRetries) {
            const maxRetriesError = new MaxRetriesError(
              `maximum retries of ${retries} reached`,
            );
            maxRetriesError.cause = error;
            reject(maxRetriesError);
            return;
          }

          this.#client.setTimeout(retryTimeout);
          this.#client.connect(this.settings.networkPort, this.host);
          this.#client.on('error', (error) => {
            setTimeout(connect, retryTimeout);
          });
          this.#client.on('timeout', connect);
          this.#client.on('connect', connected);
          retries++;
        };

        const connected = () => {
          this.#client.removeAllListeners();
          this.#client.setTimeout(this.settings.networkTimeout);
          this.#connected = true;
          resolve(undefined);
        };

        connect();
      });
    }

    await this.wrap<undefined>(
      (resolve) => {
        this.#client.setTimeout(this.settings.networkTimeout);
        this.#client.connect(this.settings.networkPort, this.host, () => {
          this.#connected = true;
          resolve(undefined);
        });
      },
      { destroyClientOnError: true },
    );
  }

  read(): Promise<Buffer> {
    this.#assertConnected();

    return this.wrap((resolve) => {
      this.#client.once('data', resolve);
    });
  }

  write(data: Buffer): Promise<void> {
    this.#assertConnected();

    return this.wrap((resolve, reject) => {
      this.#client.write(data, (error?: Error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      });
    });
  }

  async sendReceive(data: Buffer): Promise<Buffer> {
    this.#assertConnected();

    await this.write(data);
    return this.read();
  }

  disconnect() {
    if (!this.connected) {
      return;
    }

    this.#connected = false;
    this.#client.removeAllListeners();
    this.#client.end();
    this.#client = new Socket();
  }

  wakeOnLan() {
    if (!this.macAddress) {
      throw new Error('Unable to wake on lan: mac address was not configured');
    }
    const socket = createSocket(
      isIPv6(this.settings.networkWolAddress) ? 'udp6' : 'udp4',
    );
    socket.on('error', socket.close);
    socket.on('listening', () => {
      socket.setBroadcast(true);
    });

    const magicPacket = Buffer.alloc(
      WolSyncCount + MacAddressBlocksCount * WolMacAddressCount,
      WolSyncByte,
    );
    const macAddressBlocks = this.macAddress
      .split(MacAddressBlockSeparator)
      .map((string) => parseInt(string, 16));
    for (let i = 0; i < WolMacAddressCount; i++) {
      for (let j = 0; j < macAddressBlocks.length; j++) {
        const index = WolSyncCount + i * MacAddressBlocksCount + j;
        magicPacket[index] = macAddressBlocks[j];
      }
    }

    socket.send(
      magicPacket,
      0,
      magicPacket.length,
      this.settings.networkWolPort,
      this.settings.networkWolAddress,
      () => {
        socket.close();
      },
    );
  }
}
