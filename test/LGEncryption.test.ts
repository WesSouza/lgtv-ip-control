import { describe, expect, it, vi } from 'vitest';

import { LGEncoder, LGEncryption } from '../src/classes/LGEncryption.js';
import { DefaultSettings } from '../src/constants/DefaultSettings.js';

describe('LGencoder', () => {
  it('constructs with valid parameters', () => {
    const encoder = new LGEncoder(DefaultSettings);
    expect(encoder).toBeTruthy();
  });

  it('encode', () => {
    const exampleCommand = 'VOLUME_MUTE on';

    const encoder = new LGEncoder();
    const encodeedData = encoder.encode(exampleCommand).toString();
    expect(encodeedData).toEqual(`${exampleCommand}\r`);
  });

  it('decode', () => {
    const expectedPlainText = 'VOLUME_MUTE on';

    const encoder = new LGEncoder();
    const decodeedData = encoder.decode(
      Buffer.from(`${expectedPlainText}\nsdf34`, 'utf8'),
    );
    expect(decodeedData).toEqual(expectedPlainText);
  });
});

describe('LGEncryption', () => {
  it('constructs with valid parameters', () => {
    const encryption = new LGEncryption('1234ABCD', DefaultSettings);
    expect(encryption).toBeTruthy();
  });

  it('throws if keycode has wrong length', () => {
    expect(() => {
      new LGEncryption('123');
    }).toThrowErrorMatchingInlineSnapshot(`"keycode format is invalid"`);
  });

  it('throws if keycode has lowercase characters', () => {
    expect(() => {
      new LGEncryption('1234abcd');
    }).toThrowErrorMatchingInlineSnapshot(`"keycode format is invalid"`);
  });

  it('encode', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    // This data comes from the LG document
    const exampleKeyCode = '12345678';
    const exampleCommand = 'VOLUME_MUTE on';
    const expectedEncryptedIv = 'd2b21ca0ad6486cb2056a8b815033508';
    const expectedEncryptedData = 'dfe77a7de05603a59ed5316ec552fac1';

    const encryption = new LGEncryption(exampleKeyCode);
    const encryptedData = encryption.encode(exampleCommand).toString('hex');
    expect(encryptedData).toEqual(
      `${expectedEncryptedIv}${expectedEncryptedData}`,
    );

    vi.mocked(Math.random).mockRestore();
  });

  it('decode', () => {
    // This data comes from the LG document
    const exampleKeyCode = '12345678';
    const encryptedIv = 'd2b21ca0ad6486cb2056a8b815033508';
    const encryptedData = 'dfe77a7de05603a59ed5316ec552fac1';
    const exampleCipherText = Buffer.from(
      `${encryptedIv}${encryptedData}`,
      'hex',
    );
    const expectedPlainText = 'VOLUME_MUTE on';

    const encryption = new LGEncryption(exampleKeyCode, {
      ...DefaultSettings,
      responseTerminator: '\r',
    });
    const decryptedData = encryption.decode(exampleCipherText);

    expect(decryptedData).toEqual(expectedPlainText);
  });
});
