import { describe, expect, it } from 'vitest';
import { SKILL_LABEL } from './labels';
import { createBlank, dnd5eSchema, newAttack, newClass, newFeature, newItem, newSpell, SKILLS } from './model';

describe('modello D&D 5e', () => {
  it('createBlank produce dati validi', () => {
    expect(() => dnd5eSchema.parse(createBlank())).not.toThrow();
  });

  it('createBlank ha 18 abilità, 9 slot e una classe', () => {
    const c = createBlank();
    expect(Object.keys(c.skills)).toHaveLength(18);
    expect(c.spellcasting.slotsUsed).toHaveLength(9);
    expect(c.classes).toHaveLength(1);
  });

  it('i dati con voci in tutte le liste restano validi', () => {
    const c = createBlank();
    c.attacks.push(newAttack());
    c.spellcasting.spells.push(newSpell());
    c.features.push(newFeature(), { ...newFeature(), uses: { max: 2, used: 1, recharge: 'short' } });
    c.inventory.items.push(newItem());
    c.classes.push(newClass());
    expect(() => dnd5eSchema.parse(c)).not.toThrow();
  });

  it('rifiuta punteggi fuori intervallo', () => {
    const c = createBlank();
    c.abilities.str = 31;
    expect(() => dnd5eSchema.parse(c)).toThrow();
  });

  it('rifiuta abilità mancanti', () => {
    const c = createBlank() as unknown as { skills: Record<string, unknown> };
    delete c.skills.stealth;
    expect(() => dnd5eSchema.parse(c)).toThrow();
  });

  it('ogni abilità ha una etichetta italiana', () => {
    for (const s of SKILLS) expect(SKILL_LABEL[s]).toBeTruthy();
  });
});
