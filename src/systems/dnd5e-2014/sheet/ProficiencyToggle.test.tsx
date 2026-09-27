import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { expect, it, vi } from 'vitest';
import type { ProficiencyLevel } from '../model';
import { ProficiencyToggle } from './ProficiencyToggle';

function Controlled({ onLevel }: { onLevel: (l: ProficiencyLevel) => void }) {
  const [level, setLevel] = useState<ProficiencyLevel>('none');
  return (
    <ProficiencyToggle
      label="Furtività"
      level={level}
      onChange={(l) => {
        setLevel(l);
        onLevel(l);
      }}
    />
  );
}

it('cicla nessuna → competente → maestria → nessuna', async () => {
  const user = userEvent.setup();
  const onLevel = vi.fn();
  render(<Controlled onLevel={onLevel} />);
  const button = screen.getByRole('button', { name: 'Competenza Furtività: nessuna' });
  expect(button).toHaveAttribute('data-level', 'none');

  await user.click(button);
  expect(onLevel).toHaveBeenLastCalledWith('proficient');
  expect(button).toHaveAccessibleName('Competenza Furtività: competente');

  await user.click(button);
  expect(onLevel).toHaveBeenLastCalledWith('expertise');
  expect(button).toHaveAccessibleName('Competenza Furtività: maestria');
  expect(button).toHaveAttribute('data-level', 'expertise');

  await user.click(button);
  expect(onLevel).toHaveBeenLastCalledWith('none');
});

it('mostra lo stato come suggerimento', () => {
  render(<ProficiencyToggle label="Arcano" level="proficient" onChange={() => {}} />);
  expect(screen.getByRole('button')).toHaveAttribute('title', 'Competente');
});
