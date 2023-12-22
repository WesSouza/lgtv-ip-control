import { Command, CommanderError } from '@commander-js/extra-typings';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LGTV } from 'lgtv-ip-control';
import { makeProgram } from '../src/cli.js';

describe('commands', () => {
  let program: Command;
  const commonOptions = [
    'foo',
    'bar.js',
    '-o',
    '1.2.3.4',
    '-m',
    'DA:0A:0F:E1:60:CB',
    '-k',
    'M9N0AZ62',
  ];

  beforeEach(() => {
    program = makeProgram()
      .exitOverride()
      .configureOutput({
        writeOut: () => {},
        writeErr: () => {},
      });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('powers on', async () => {
    const spy = vi
      .spyOn(LGTV.prototype, 'powerOn')
      .mockImplementation(() => {});
    await program.parseAsync([...commonOptions, 'power', 'on']);
    expect(spy).toHaveBeenCalledTimes(1);
  });

  it('helps', () => {
    expect(program.parseAsync(['help'])).rejects.toThrow(CommanderError);
  });
});
