import { Apps } from './constants/TV.js';

export type AppDetails = {
  app: Apps | string | undefined;
  hdcpStatus: string | undefined;
  hdcpVersion: string | undefined;
  hotPlug: string | undefined;
  signal: boolean | undefined;
};
