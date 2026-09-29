import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HpBar, hpState } from './HpBar';

describe('barra PF', () => {
  it.each([
    [20, 20, 'good'],
    [11, 20, 'good'],
    [10, 20, 'mid'],
    [6, 20, 'mid'],
    [5, 20, 'bad'],
    [1, 20, 'bad'],
    [0, 20, 'down'],
    [5, 0, 'down'],
  ] as const)('%i/%i → %s', (current, max, state) => {
    expect(hpState(current, max)).toBe(state);
  });

  it('segna il colpo solo quando i PF scendono', () => {
    const { container, rerender } = render(<HpBar current={20} max={20} temp={0} />);
    const bar = () => container.querySelector('.hp-bar')!;
    expect(bar()).not.toHaveAttribute('data-hit');
    rerender(<HpBar current={8} max={20} temp={0} />);
    expect(bar()).toHaveAttribute('data-hit');
    expect(bar()).toHaveAttribute('data-state', 'mid');
    expect(container.querySelector<HTMLElement>('.hp-fill')!.style.width).toBe('40%');
  });

  it('una cura non fa sussultare la barra', () => {
    const { container, rerender } = render(<HpBar current={5} max={20} temp={0} />);
    rerender(<HpBar current={15} max={20} temp={0} />);
    expect(container.querySelector('.hp-bar')).not.toHaveAttribute('data-hit');
  });
});
