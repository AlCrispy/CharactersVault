import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { readFileText, shareOrDownload } from './fileShare';

beforeAll(() => {
  // jsdom non implementa gli object URL.
  Object.defineProperty(URL, 'createObjectURL', { value: () => 'blob:test', configurable: true });
  Object.defineProperty(URL, 'revokeObjectURL', { value: () => {}, configurable: true });
});

afterEach(() => {
  Reflect.deleteProperty(window, 'matchMedia');
  Reflect.deleteProperty(navigator, 'canShare');
  Reflect.deleteProperty(navigator, 'share');
});

describe('shareOrDownload', () => {
  it('su desktop scarica il file', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    await shareOrDownload('ada.json', '{}');
    expect(click).toHaveBeenCalledTimes(1);
    const anchor = click.mock.contexts[0] as HTMLAnchorElement;
    expect(anchor.download).toBe('ada.json');
    expect(anchor.href).toBe('blob:test');
  });

  it('su mobile usa il menu di condivisione', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', { value: share, configurable: true });
    await shareOrDownload('ada.json', '{}');
    expect(share).toHaveBeenCalledTimes(1);
    expect(share.mock.calls[0][0].files[0].name).toBe('ada.json');
    expect(click).not.toHaveBeenCalled();
  });

  it('se l’utente annulla la condivisione non scarica', async () => {
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    Object.defineProperty(window, 'matchMedia', { value: () => ({ matches: true }), configurable: true });
    Object.defineProperty(navigator, 'canShare', { value: () => true, configurable: true });
    Object.defineProperty(navigator, 'share', {
      value: vi.fn().mockRejectedValue(new DOMException('annullato', 'AbortError')),
      configurable: true,
    });
    await shareOrDownload('ada.json', '{}');
    expect(click).not.toHaveBeenCalled();
  });
});

it('readFileText legge il contenuto', async () => {
  expect(await readFileText(new Blob(['ciao']))).toBe('ciao');
});
