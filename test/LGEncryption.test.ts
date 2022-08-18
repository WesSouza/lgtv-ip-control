import { describe, expect, it, vi } from 'vitest';

import { LGEncryption } from '../src/classes/LGEncryption.js';
import { DefaultSettings } from '../src/constants/DefaultSettings.js';

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
});

describe('encrypt', () => {
  it('works with data from the LG document', () => {
    vi.spyOn(Math, 'random').mockImplementation(() => 0);

    const exampleKeyCode = '12345678';
    const exampleCommand = 'VOLUME_MUTE on';
    const expectedEncryptedIv = 'd2b21ca0ad6486cb2056a8b815033508';
    const expectedEncryptedData = 'dfe77a7de05603a59ed5316ec552fac1';

    const encryption = new LGEncryption(exampleKeyCode);
    const encryptedData = encryption.encrypt(exampleCommand).toString('hex');
    expect(encryptedData).toEqual(
      `${expectedEncryptedIv}${expectedEncryptedData}`,
    );

    vi.mocked(Math.random).mockRestore();
  });
});

describe('decrypt', () => {
  it('works with data from the LG document', () => {
    const exampleKeyCode = '12345678';
    const encryptedIv = 'd2b21ca0ad6486cb2056a8b815033508';
    const encryptedData = 'dfe77a7de05603a59ed5316ec552fac1';
    const exampleCipherText = Buffer.from(
      `${encryptedIv}${encryptedData}`,
      'hex',
    );
    const expectedPlainText = 'VOLUME_MUTE on\x0d\x01';

    const encryption = new LGEncryption(exampleKeyCode);
    const decryptedData = encryption.decrypt(exampleCipherText);

    expect(decryptedData).toEqual(expectedPlainText);
  });
});
