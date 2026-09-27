import { Checkbox, NumberInput, Section, Stat, TextArea, TextInput } from '../../../ui/fields';
import { formatNumber } from '../../../ui/format';
import { COIN_LABEL } from '../labels';
import { COINS, newItem, type Inventory, type Item } from '../model';
import { carryingCapacityKg, totalWeightKg } from '../rules';
import { removeById, updateById } from './listOps';
import type { TabProps } from './types';

function inventoryOf({ data, onChange }: TabProps) {
  const inv = data.inventory;
  const setInv = (patch: Partial<Inventory>) => onChange({ ...data, inventory: { ...inv, ...patch } });
  return { inv, setInv };
}

export function CoinsSection(props: TabProps) {
  const { inv, setInv } = inventoryOf(props);
  return (
      <Section title="Monete">
        <div className="coins">
          {COINS.map((k) => (
            <NumberInput
              key={k}
              label={COIN_LABEL[k]}
              value={inv.coins[k]}
              min={0}
              max={9_999_999}
              onChange={(v) => setInv({ coins: { ...inv.coins, [k]: v } })}
            />
          ))}
        </div>
      </Section>
  );
}

export function ItemsSection(props: TabProps) {
  const { inv, setInv } = inventoryOf(props);
  const weight = totalWeightKg(props.data);
  const capacity = carryingCapacityKg(props.data);
  return (
      <Section
        title="Oggetti"
        actions={
          <button type="button" className="btn small" onClick={() => setInv({ items: [...inv.items, newItem()] })}>
            + Oggetto
          </button>
        }
      >
        <div className="stats-row">
          <Stat label="Peso trasportato" value={`${formatNumber(weight)} kg`} />
          <Stat label="Capacità di carico" value={`${formatNumber(capacity)} kg`} />
        </div>
        {weight > capacity && (
          <p className="warning" role="alert">
            Stai trasportando più della tua capacità di carico.
          </p>
        )}
        {inv.items.length === 0 && <p className="muted">Nessun oggetto.</p>}
        <ul className="list">
          {inv.items.map((it) => {
            const patch = (p: Partial<Item>) => setInv({ items: updateById(inv.items, it.id, p) });
            return (
              <li key={it.id} className="list-item">
                <div className="row">
                  <TextInput label="Nome oggetto" value={it.name} onChange={(v) => patch({ name: v })} />
                  <NumberInput label="Quantità" className="narrow" value={it.quantity} min={0} max={99_999} onChange={(v) => patch({ quantity: v })} />
                  <NumberInput
                    label="Peso (kg)"
                    className="narrow"
                    value={it.weightKg}
                    min={0}
                    max={99_999}
                    integer={false}
                    onChange={(v) => patch({ weightKg: v })}
                  />
                  <Checkbox label="Equip." ariaLabel="Equipaggiato" checked={it.equipped} onChange={(v) => patch({ equipped: v })} />
                </div>
                <details>
                  <summary>Note</summary>
                  <TextArea label="Note oggetto" rows={2} value={it.notes} onChange={(v) => patch({ notes: v })} />
                  <button type="button" className="btn small danger" onClick={() => setInv({ items: removeById(inv.items, it.id) })}>
                    Rimuovi oggetto
                  </button>
                </details>
              </li>
            );
          })}
        </ul>
      </Section>
  );
}
