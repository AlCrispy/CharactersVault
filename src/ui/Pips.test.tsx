import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { Pips } from './Pips';

it('spuntare aumenta, togliere la spunta riduce', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<Pips label="Slot" count={1} max={3} onChange={onChange} />);
  const boxes = within(screen.getByRole('group', { name: 'Slot' })).getAllByRole('checkbox');
  expect(boxes).toHaveLength(3);
  expect(boxes[0]).toBeChecked();
  await user.click(boxes[2]);
  expect(onChange).toHaveBeenLastCalledWith(3);
  await user.click(boxes[0]);
  expect(onChange).toHaveBeenLastCalledWith(0);
});

it('oltre 10 usa un campo numerico', () => {
  render(<Pips label="Utilizzi" count={4} max={20} onChange={() => {}} />);
  expect(screen.getByLabelText('Utilizzi')).toHaveValue('4');
});
