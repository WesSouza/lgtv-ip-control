import assert from 'assert';

import { DefaultSettings } from '../constants/DefaultSettings.js';
import {
  Apps,
  EnergySavingLevels,
  Inputs,
  Keys,
  PictureModes,
  PowerStates,
  ScreenMuteModes,
} from '../constants/TV.js';
import { AppDetails } from '../types.js';
import { LGEncoder, LGEncryption } from './LGEncryption.js';
import { TimeoutError, TinySocket } from './TinySocket.js';

export class ResponseParseError extends Error {}

function throwIfNotOK(response: string) {
  if (response != 'OK') {
    throw new ResponseParseError(`response not 'OK': ${response}`);
  }
}

export class LGTV {
  encoder: LGEncoder;
  socket: TinySocket;

  constructor(
    host: string,
    macAddress: string | null,
    keycode: string | null,
    settings = DefaultSettings,
  ) {
    this.socket = new TinySocket(host, macAddress, settings);
    this.encoder = keycode
      ? new LGEncryption(keycode, settings)
      : new LGEncoder(settings);
  }

  private async sendCommand(command: string) {
    const request = this.encoder.encode(command);
    const response = await this.socket.sendReceive(request);
    return this.encoder.decode(response);
  }

  get connected() {
    return this.socket.connected;
  }

  async connect(
    options?: Parameters<typeof TinySocket.prototype.connect>[0],
  ): Promise<void> {
    await this.socket.connect(options);
  }

  disconnect() {
    this.socket.disconnect();
  }

  async getCurrentApp(): Promise<Apps | string | null> {
    const appDetails = await this.getCurrentAppDetails();
    return appDetails?.app ?? null;
  }

  async getCurrentAppDetails(): Promise<AppDetails | null> {
    const response = await this.sendCommand('CURRENT_APP');
    if (response === '') {
      return null;
    }

    const pairs: Record<string, string> = {};
    for (const match of response.matchAll(/([\w\s]+):(\S+)/g)) {
      pairs[match[1].trim()] = match[2];
    }
    if (!pairs['APP']) {
      throw new ResponseParseError(`failed to parse response: ${response}`);
    }

    return {
      app: pairs['APP'],
      hotPlug: pairs['Hot plug'],
      signal: pairs['Signal'] ? pairs['Signal'] === 'Yes' : undefined,
      hdcpVersion: pairs['HDCP'],
      hdcpStatus: pairs['HDCP Status'],
    };
  }

  async getCurrentVolume(): Promise<number> {
    const response = await this.sendCommand('CURRENT_VOL');
    const match = response.match(/^VOL:(\d+)$/);
    if (!match) {
      throw new ResponseParseError(`failed to parse response: ${response}`);
    }
    return parseInt(match[1], 10);
  }

  async getIpControlState(): Promise<boolean> {
    const response = await this.sendCommand('GET_IPCONTROL_STATE');
    if (response != 'ON') {
      throw new ResponseParseError(`failed to parse response: ${response}`);
    }
    return true;
  }

  async getMacAddress(type: 'wired' | 'wifi'): Promise<string> {
    return await this.sendCommand(`GET_MACADDRESS ${type}`);
  }

  async getMuteState(): Promise<boolean> {
    const response = await this.sendCommand('MUTE_STATE');
    const match = response.match(/^MUTE:(on|off)$/);
    if (!match) {
      throw new ResponseParseError(`failed to parse response: ${response}`);
    }
    if (match[1] == 'on') {
      return true;
    }
    return false;
  }

  async getPowerState(): Promise<PowerStates> {
    const testPowerState = async () => {
      const currentApp = await this.getCurrentApp();
      return currentApp === null ? PowerStates.off : PowerStates.on;
    };

    if (this.connected) {
      return testPowerState();
    }

    try {
      await this.connect();
      return await testPowerState();
    } catch (error) {
      if (error instanceof TimeoutError) {
        return PowerStates.unknown;
      } else {
        throw error;
      }
    } finally {
      this.disconnect();
    }
  }

  async powerOff(): Promise<void> {
    throwIfNotOK(await this.sendCommand(`POWER off`));
  }

  async launchApp(name: Apps | string): Promise<void> {
    throwIfNotOK(await this.sendCommand(`APP_LAUNCH ${name}`));
  }

  async setPictureMode(mode: PictureModes): Promise<void> {
    assert(Object.values(PictureModes).includes(mode), 'mode must be valid');
    throwIfNotOK(await this.sendCommand(`PICTURE_MODE ${mode}`));
  }

  powerOn() {
    this.socket.wakeOnLan();
  }

  powerOnAndConnect(
    options?: Parameters<typeof TinySocket.prototype.connect>[0],
  ) {
    this.socket.wakeOnLan();
    return this.connect({
      maxRetries: 10,
      ...options,
    });
  }

  async sendKey(key: Keys): Promise<void> {
    assert(Object.values(Keys).includes(key), 'key must be valid');
    throwIfNotOK(await this.sendCommand(`KEY_ACTION ${key}`));
  }

  async setScreenMute(mode: ScreenMuteModes) {
    assert(Object.values(ScreenMuteModes).includes(mode), 'mode must be valid');
    throwIfNotOK(await this.sendCommand(`SCREEN_MUTE ${mode}`));
  }

  async setEnergySaving(level: EnergySavingLevels): Promise<void> {
    assert(
      Object.values(EnergySavingLevels).includes(level),
      'level must be valid',
    );
    throwIfNotOK(await this.sendCommand(`ENERGY_SAVING ${level}`));
  }

  async setInput(input: Inputs): Promise<void> {
    assert(Object.values(Inputs).includes(input), 'input must be valid');
    throwIfNotOK(await this.sendCommand(`INPUT_SELECT ${input}`));
  }

  async setVolume(volumeLevel: number): Promise<void> {
    assert(
      typeof volumeLevel === 'number' &&
        Number.isInteger(volumeLevel) &&
        volumeLevel >= 0 &&
        volumeLevel <= 100,
      'volumeLevel must be an integer between 0 and 100',
    );
    throwIfNotOK(await this.sendCommand(`VOLUME_CONTROL ${volumeLevel}`));
  }

  async setVolumeMute(isMuted: boolean): Promise<void> {
    assert(typeof isMuted === 'boolean', 'isMuted must be a boolean');
    throwIfNotOK(
      await this.sendCommand(`VOLUME_MUTE ${isMuted ? 'on' : 'off'}`),
    );
  }
}
