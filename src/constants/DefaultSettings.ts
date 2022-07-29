export const DefaultSettings = {
  encryptionIvLength: 16,
  encryptionKeyDigest: 'sha256',
  encryptionKeyIterations: 2 ** 14,
  encryptionKeyLength: 16,
  encryptionKeySalt: [
    0x63, 0x61, 0xb8, 0x0e, 0x9b, 0xdc, 0xa6, 0x63, 0x8d, 0x07, 0x20, 0xf2,
    0xcc, 0x56, 0x8f, 0xb9,
  ],
  keycodeFormat: /[A-Z0-9]{8}/,
  messageBlockSize: 16,
  messageTerminator: '\r',
  networkPort: 9761,
  networkTimeout: 5000,
  networkWolAddress: '255.255.255.255',
  networkWolPort: 9,
};
