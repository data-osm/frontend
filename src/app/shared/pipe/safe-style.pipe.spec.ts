import { SafeStylePipe } from './safe-style.pipe';

describe('SafeStylePipe', () => {
  it('create an instance', () => {
    const pipe = new SafeStylePipe();
    expect(pipe).toBeTruthy();
  });
});
