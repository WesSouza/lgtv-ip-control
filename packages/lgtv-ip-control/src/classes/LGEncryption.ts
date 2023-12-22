import assert from 'assert';
import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';

import { DefaultSettings } from '../constants/DefaultSettings.js';

export interface EncryptionSettings {
  encryptionIvLength: number;
  encryptionKeyDigest: string;
  encryptionKeyIterations: number;
  encryptionKeyLength: number;
  encryptionKeySalt: number[];
  keycodeFormat: RegExp;
  messageBlockSize: number;
  messageTerminator: string;
  responseTerminator: string;
}

export class LGEncoder {
  constructor(protected settings: EncryptionSettings = DefaultSettings) {
    assert(
      typeof settings === 'object' && settings !== null,
      'settings must be an object',
    );

    const { messageBlockSize, messageTerminator, responseTerminator } =
      settings;
    assert(
      typeof messageBlockSize === 'number' && messageBlockSize > 0,
      'settings.messageBlockSize must be a number greater than 0',
    );
    assert(
      typeof messageTerminator === 'string' && messageTerminator.length > 0,
      'settings.messageTerminator must be a string with length greater than 0',
    );
    assert(
      typeof responseTerminator === 'string' && responseTerminator.length > 0,
      'settings.responseTerminator must be a string with length greater than 0',
    );
  }

  protected terminateMessage(message: string): string {
    const { messageTerminator } = this.settings;
    assert(typeof message === 'string', 'message must be a string');
    assert(message.length > 0, 'message must have a length greater than 0');
    assert(
      !message.includes(messageTerminator),
      'message must not include the message terminator character',
    );
    return message + messageTerminator;
  }

  protected stripEnd(message: string): string {
    const { responseTerminator } = this.settings;
    return message.substring(0, message.indexOf(responseTerminator));
  }

  encode(message: string): Buffer {
    return Buffer.from(this.terminateMessage(message), 'utf8');
  }

  decode(data: Buffer): string {
    return this.stripEnd(data.toString());
  }
}

export class LGEncryption extends LGEncoder {
  private derivedKey: Buffer;

  constructor(keycode: string, settings: EncryptionSettings = DefaultSettings) {
    super(settings);

    const {
      encryptionIvLength,
      encryptionKeyDigest,
      encryptionKeyIterations,
      encryptionKeyLength,
      encryptionKeySalt,
      keycodeFormat,
    } = settings;
    assert(
      typeof encryptionIvLength === 'number' && encryptionIvLength > 0,
      'settings.encryptionIvLength must be a number greater than 0',
    );
    assert(
      typeof encryptionKeyDigest === 'string' && encryptionKeyDigest.length > 0,
      'settings.encryptionKeyDigest must be a string with length greater than 0',
    );
    assert(
      typeof encryptionKeyIterations === 'number' &&
        encryptionKeyIterations > 0,
      'settings.encryptionKLeyIterations must be a number greater than 0',
    );
    assert(
      typeof encryptionKeyLength === 'number' && encryptionKeyLength > 0,
      'settings.encryptionKeyLength must be a number greater than 0',
    );
    assert(
      Array.isArray(encryptionKeySalt) &&
        encryptionKeySalt.some((data) => typeof data === 'number' && data > 0),
      'settings.encryptionKeySalt must be an array of numbers with length greater than 0',
    );
    assert(
      keycodeFormat instanceof RegExp,
      'settings.keycodeFormat must be an instance of RegExp',
    );

    this.derivedKey = this.deriveKey(keycode);
  }

  private deriveKey(keycode: string) {
    assert(typeof keycode === 'string', 'keycode must be a string');
    assert(
      this.settings.keycodeFormat.test(keycode),
      'keycode format is invalid',
    );

    return pbkdf2Sync(
      keycode,
      Buffer.from(this.settings.encryptionKeySalt),
      this.settings.encryptionKeyIterations,
      this.settings.encryptionKeyLength,
      this.settings.encryptionKeyDigest,
    );
  }

  private generateRandomIv() {
    const { encryptionIvLength } = this.settings;
    const iv = Buffer.alloc(encryptionIvLength, 0);
    for (let i = 0; i < encryptionIvLength; i++) {
      iv[i] = Math.floor(Math.random() * 255);
    }
    return iv;
  }

  protected padMessage(message: string): string {
    const { messageBlockSize } = this.settings;
    let newMessage = message;
    if (message.length % messageBlockSize === 0) {
      newMessage += ' ';
    }

    const remainder = newMessage.length % messageBlockSize;
    if (remainder !== 0) {
      const padding = messageBlockSize - remainder;
      newMessage += String.fromCharCode(padding).repeat(padding);
    }
    return newMessage;
  }

  encode(message: string): Buffer {
    const iv = this.generateRandomIv();
    const paddedMessage = this.padMessage(this.terminateMessage(message));

    const ecbCypher = createCipheriv(
      'aes-128-ecb',
      this.derivedKey,
      Buffer.alloc(0),
    );
    const ivEnc = ecbCypher.update(iv);

    const cbcCypher = createCipheriv('aes-128-cbc', this.derivedKey, iv);
    const dataEnc = cbcCypher.update(paddedMessage);

    return Buffer.concat([ivEnc, dataEnc]);
  }

  decode(cipher: Buffer): string {
    const { encryptionKeyLength } = this.settings;
    const ecbDecypher = createDecipheriv(
      'aes-128-ecb',
      this.derivedKey,
      Buffer.alloc(0),
    );
    ecbDecypher.setAutoPadding(false);
    const iv = ecbDecypher.update(cipher.slice(0, encryptionKeyLength));

    const cbcDecypher = createDecipheriv('aes-128-cbc', this.derivedKey, iv);
    cbcDecypher.setAutoPadding(false);
    const decrypted = cbcDecypher.update(cipher.slice(encryptionKeyLength));
    return this.stripEnd(decrypted.toString());
  }
}
