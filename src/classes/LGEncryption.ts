import assert from 'assert';
import { createCipheriv, createDecipheriv, pbkdf2Sync } from 'crypto';

import { DefaultSettings } from '../constants/DefaultSettings';

export interface EncryptionSettings {
  encryptionIvLength: number;
  encryptionKeyDigest: string;
  encryptionKeyIterations: number;
  encryptionKeyLength: number;
  encryptionKeySalt: number[];
  keycodeFormat: RegExp;
  messageBlockSize: number;
  messageTerminator: string;
}

function assertSettings(settings: EncryptionSettings) {
  assert(
    typeof settings === 'object' && settings !== null,
    'settings must be an object',
  );

  const {
    encryptionIvLength,
    encryptionKeyDigest,
    encryptionKeyIterations,
    encryptionKeyLength,
    encryptionKeySalt,
    keycodeFormat,
    messageBlockSize,
    messageTerminator,
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
    typeof encryptionKeyIterations === 'number' && encryptionKeyIterations > 0,
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
  assert(
    typeof messageBlockSize === 'number' && messageBlockSize > 0,
    'settings.messageBlockSize must be a number greater than 0',
  );
  assert(
    typeof messageTerminator === 'string' && messageTerminator.length > 0,
    'settings.messageTerminator must be a string with length greater than 0',
  );
}

function deriveKey(keycode: string, settings = DefaultSettings) {
  assertSettings(settings);
  assert(typeof keycode === 'string', 'keycode must be a string');
  assert(settings.keycodeFormat.test(keycode), 'keycode format is invalid');

  return pbkdf2Sync(
    keycode,
    Buffer.from(settings.encryptionKeySalt),
    settings.encryptionKeyIterations,
    settings.encryptionKeyLength,
    settings.encryptionKeyDigest,
  );
}

function generateRandomIv(length = DefaultSettings.encryptionIvLength) {
  assert(typeof length === 'number', 'length must be a number');
  assert(length > 0, 'length must be greater than 0');

  const iv = Buffer.alloc(length, 0);
  for (let i = 0; i < length; i++) {
    iv[i] = Math.floor(Math.random() * 255);
  }
  return iv;
}

export class LGEncryption {
  private derivedKey: Buffer;

  constructor(keycode: string, private settings = DefaultSettings) {
    assertSettings(settings);
    this.derivedKey = deriveKey(keycode, settings);
  }

  private prepareMessage(message: string) {
    assert(typeof message === 'string', 'message must be a string');
    assert(message.length > 0, 'message must have a length greater than 0');

    const { messageTerminator, messageBlockSize } = this.settings;
    assert(
      !message.includes(messageTerminator),
      'message must not include the message terminator character',
    );

    let newMessage = message + messageTerminator;
    if (newMessage.length % messageBlockSize === 0) {
      newMessage += ' ';
    }

    const remainder = newMessage.length % messageBlockSize;
    if (remainder !== 0) {
      const padding = messageBlockSize - remainder;
      newMessage += String.fromCharCode(padding).repeat(padding);
    }

    return newMessage;
  }

  encrypt(message: string) {
    const iv = generateRandomIv(this.settings.encryptionKeyLength);
    const preparedMessage = this.prepareMessage(message);

    const ecbCypher = createCipheriv(
      'aes-128-ecb',
      this.derivedKey,
      Buffer.alloc(0),
    );
    const ivEnc = ecbCypher.update(iv);

    const cbcCypher = createCipheriv('aes-128-cbc', this.derivedKey, iv);
    const dataEnc = cbcCypher.update(preparedMessage, 'utf8');

    return Buffer.concat([ivEnc, dataEnc]);
  }

  decrypt(cipher: Buffer) {
    const ecbDecypher = createDecipheriv(
      'aes-128-ecb',
      this.derivedKey,
      Buffer.alloc(0),
    );
    ecbDecypher.setAutoPadding(false);
    const iv = ecbDecypher.update(
      cipher.slice(0, this.settings.encryptionKeyLength),
    );

    const cbcDecypher = createDecipheriv('aes-128-cbc', this.derivedKey, iv);
    cbcDecypher.setAutoPadding(false);
    return cbcDecypher
      .update(cipher.slice(this.settings.encryptionKeyLength))
      .toString();
  }
}
