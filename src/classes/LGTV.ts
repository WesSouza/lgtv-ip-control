import assert from 'assert';

import { DefaultSettings } from '../constants/DefaultSettings.js';
import {
  Apps,
  EnergySavingLevels,
  Inputs,
  Keys,
  PictureModes,
} from '../constants/TV.js';
import { LGEncryption } from './LGEncryption.js';
import { TinySocket } from './TinySocket.js';

export class ResponseParseError extends Error {}

function throwIfNotOK(response: string) {
  if (response != 'OK')
    throw new ResponseParseError(`response not 'OK': ${response}`);
}

export class LGTV {
  encryption: LGEncryption;
  socket: TinySocket;

  constructor(
    host: string,
    macAddress: string | null,
    keycode: string,
    settings = DefaultSettings,
  ) {
    this.socket = new TinySocket(host, macAddress, settings);
    this.encryption = new LGEncryption(keycode, settings);
  }

  private async sendCommand(command: string) {
    const encryptedData = this.encryption.encrypt(command);
    const encryptedResponse = await this.socket.sendReceive(encryptedData);
    return this.encryption.decrypt(encryptedResponse);
  }

  async connect(): Promise<void> {
    await this.socket.connect();
  }

  async disconnect(): Promise<void> {
    await this.socket.disconnect();
  }

  async getCurrentApp(): Promise<Apps | string> {
    const response = await this.sendCommand('CURRENT_APP');
    const match = response.match(/^APP:([\w.]+)$/);
    if (!match)
      throw new ResponseParseError(`failed to parse response: ${response}`);
    return match[1];
  }

  async getCurrentVolume(): Promise<number> {
    const response = await this.sendCommand('CURRENT_VOL');
    const match = response.match(/^VOL:(\d+)$/);
    if (!match)
      throw new ResponseParseError(`failed to parse response: ${response}`);
    return parseInt(match[1], 10);
  }

  async getIpControlState(): Promise<boolean> {
    const response = await this.sendCommand('GET_IPCONTROL_STATE');
    if (response != 'ON')
      throw new ResponseParseError(`failed to parse response: ${response}`);
    return true;
  }

  async getMacAddress(type: 'wired' | 'wifi'): Promise<string> {
    return await this.sendCommand(`GET_MACADDRESS ${type}`);
  }

  async getMuteState(): Promise<boolean> {
    const response = await this.sendCommand('MUTE_STATE');
    const match = response.match(/^MUTE:(on|off)$/);
    if (!match)
      throw new ResponseParseError(`failed to parse response: ${response}`);
    if (match[1] == 'on') return true;
    return false;
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

  async sendKey(key: Keys): Promise<void> {
    assert(Object.values(Keys).includes(key), 'key must be valid');
    throwIfNotOK(await this.sendCommand(`KEY_ACTION ${key}`));
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
