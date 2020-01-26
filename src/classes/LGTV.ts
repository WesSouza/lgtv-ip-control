import assert from 'assert';
import { EnergySavingLevels, Inputs, Keys } from '../constants/TV';
import { DefaultSettings } from '../constants/DefaultSettings';
import { LGEncryption } from './LGEncryption';
import { TinySocket } from './TinySocket';

const IntegerMatcher = /^\d+$/;

export class LGTV {
  encryption: LGEncryption;
  socket: TinySocket;

  constructor(
    host: string,
    macAddress: string | null,
    keycode: string,
    settings = DefaultSettings
  ) {
    this.socket = new TinySocket(host, macAddress, settings);
    this.encryption = new LGEncryption(keycode, settings);
  }

  private async sendCommand(command: string) {
    const encryptedData = this.encryption.encrypt(command);
    await this.socket.sendReceive(encryptedData);
  }

  async connect() {
    await this.socket.connect();
  }

  async disconnect() {
    await this.socket.disconnect();
  }

  async powerOff() {
    await this.sendCommand(`POWER off`);
  }

  powerOn() {
    this.socket.wakeOnLan();
  }

  async sendKey(key: Keys) {
    assert(
      Object.values(Keys).some(availableKey => availableKey === key),
      'key must be valid'
    );
    await this.sendCommand(`KEY_ACTION ${key}`);
  }

  async setEnergySaving(level: EnergySavingLevels) {
    assert(
      Object.values(EnergySavingLevels).some(
        availableOption => availableOption === level
      ),
      'level must be valid'
    );
    await this.sendCommand(`ENERGY_SAVING ${level}`);
  }

  async setInput(input: Inputs) {
    assert(
      Object.values(Inputs).some(availableInput => availableInput === input),
      'input must be valid'
    );
    await this.sendCommand(`INPUT_SELECT ${input}`);
  }

  async setVolume(volumeLevel: number) {
    assert(
      typeof volumeLevel === 'number' &&
        IntegerMatcher.test(volumeLevel.toString()) &&
        volumeLevel >= 0 &&
        volumeLevel <= 100,
      'volumeLevel must be an integer between 0 and 100'
    );
    await this.sendCommand(`VOLUME_CONTROL ${volumeLevel}`);
  }

  async setVolumeMute(isMuted: boolean) {
    assert(typeof isMuted === 'boolean', 'isMuted must be a boolean');
    await this.sendCommand(`VOLUME_MUTE ${isMuted ? 'on' : 'off'}`);
  }
}
