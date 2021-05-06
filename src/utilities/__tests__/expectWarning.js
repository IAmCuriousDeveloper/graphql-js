import { expect } from 'chai';

export function expectWarning(callback: () => any): any {
  const _console = console;
  try {
    let warnCallArg;
    global.console = {
      warn(arg) {
        warnCallArg = arg;
      },
    };
    callback();
    return expect(warnCallArg);
  } finally {
    global.console = _console;
  }
}
