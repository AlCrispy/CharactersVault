import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox, NumberInput, Select, Stat } from './fields';

function ControlledNumber(props: { min?: number; max?: number; integer?: boolean; onValue: (v: number) => void }) {
  const [v, setV] = useState(10);
  return (
    <NumberInput
      label="Forza"
      value={v}
      min={props.min}
      max={props.max}
      integer={props.integer}
      onChange={(n) => {
        setV(n);
        props.onValue(n);
      }}
    />
  );
}

describe('NumberInput', () => {
  it('permette di svuotare e riscrivere il valore', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    expect(input).toHaveValue('');
    expect(onValue).not.toHaveBeenCalled();
    await user.type(input, '15');
    expect(onValue).toHaveBeenLastCalledWith(15);
  });

  it('limita al massimo', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber max={30} onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '45');
    expect(onValue).toHaveBeenLastCalledWith(30);
    await user.tab();
    expect(input).toHaveValue('30');
  });

  it('accetta la virgola se non intero', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber integer={false} onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '1,5');
    expect(onValue).toHaveBeenLastCalledWith(1.5);
  });

  it('ignora testo non numerico', async () => {
    const user = userEvent.setup();
    const onValue = vi.fn();
    render(<ControlledNumber onValue={onValue} />);
    const input = screen.getByLabelText('Forza');
    await user.clear(input);
    await user.type(input, '-');
    expect(onValue).not.toHaveBeenCalled();
    await user.type(input, '2');
    expect(onValue).toHaveBeenLastCalledWith(-2);
  });
});

describe('altri campi', () => {
  it('Checkbox usa ariaLabel come nome accessibile', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Checkbox label="TS" ariaLabel="Competenza tiro salvezza Forza" checked={false} onChange={onChange} />);
    await user.click(screen.getByLabelText('Competenza tiro salvezza Forza'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('Select restituisce il valore scelto', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <Select
        label="Protezione"
        value="none"
        options={[
          { value: 'none', label: 'Nessuna' },
          { value: 'light', label: 'Leggera' },
        ]}
        onChange={onChange}
      />,
    );
    await user.selectOptions(screen.getByLabelText('Protezione'), 'light');
    expect(onChange).toHaveBeenCalledWith('light');
  });

  it('Stat espone il valore tramite etichetta', () => {
    render(<Stat label="Mod" ariaLabel="Modificatore Forza" value="+3" />);
    expect(screen.getByLabelText('Modificatore Forza')).toHaveTextContent('+3');
  });
});
