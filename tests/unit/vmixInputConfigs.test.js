import { describe, it, expect, vi } from 'vitest';
import { getDefaultFieldsForInput } from '../../src/main/vmix-input-configs.ts';

describe('getDefaultFieldsForInput - setScore inputs', () => {
  it('должен возвращать правильные поля для set1Score', () => {
    const fields = getDefaultFieldsForInput('set1Score');
    expect(fields).toBeDefined();
    expect(fields.teamA).toBeDefined();
    expect(fields.teamB).toBeDefined();
    expect(fields.scoreASets).toBeDefined();
    expect(fields.scoreBSets).toBeDefined();
    expect(fields.set1Duration).toBeDefined();
    expect(fields.set1ScoreA).toBeDefined();
    expect(fields.set1ScoreB).toBeDefined();
    
    // Проверяем, что нет полей для других партий
    expect(fields.set2Duration).toBeUndefined();
  });

  it('должен возвращать правильные поля для set3Score', () => {
    const fields = getDefaultFieldsForInput('set3Score');
    expect(fields).toBeDefined();
    // Проверяем наличие полей для всех трех партий
    expect(fields.set1Duration).toBeDefined();
    expect(fields.set2Duration).toBeDefined();
    expect(fields.set3Duration).toBeDefined();
    expect(fields.set1ScoreA).toBeDefined();
    expect(fields.set2ScoreA).toBeDefined();
    expect(fields.set3ScoreA).toBeDefined();
    expect(fields.set1ScoreB).toBeDefined();
    expect(fields.set2ScoreB).toBeDefined();
    expect(fields.set3ScoreB).toBeDefined();
    
    // Проверяем, что нет полей для 4 и 5 партий
    expect(fields.set4Duration).toBeUndefined();
    expect(fields.set5Duration).toBeUndefined();
  });

  it('должен возвращать правильные поля для set5Score', () => {
    const fields = getDefaultFieldsForInput('set5Score');
    expect(fields).toBeDefined();
    // Проверяем наличие полей для всех пяти партий
    for (let i = 1; i <= 5; i++) {
      expect(fields[`set${i}Duration`]).toBeDefined();
      expect(fields[`set${i}ScoreA`]).toBeDefined();
      expect(fields[`set${i}ScoreB`]).toBeDefined();
    }
  });

  it('должен возвращать правильные fieldIdentifier для всех полей set1Score', () => {
    const fields = getDefaultFieldsForInput('set1Score');
    expect(fields.teamA.fieldIdentifier).toBe('TeamA');
    expect(fields.teamB.fieldIdentifier).toBe('TeamB');
    expect(fields.scoreASets.fieldIdentifier).toBe('ScoreASets');
    expect(fields.scoreBSets.fieldIdentifier).toBe('ScoreBSets');
    expect(fields.set1Duration.fieldIdentifier).toBe('Set1Duration');
    expect(fields.set1ScoreA.fieldIdentifier).toBe('Set1ScoreA');
    expect(fields.set1ScoreB.fieldIdentifier).toBe('Set1ScoreB');
  });

  it('должен возвращать правильные fieldName для всех полей', () => {
    const fields = getDefaultFieldsForInput('set3Score');
    expect(fields.teamA.fieldName).toBe('Команда А');
    expect(fields.teamB.fieldName).toBe('Команда Б');
    expect(fields.set1Duration.fieldName).toBe('Время партии 1');
    expect(fields.set2Duration.fieldName).toBe('Время партии 2');
    expect(fields.set3Duration.fieldName).toBe('Время партии 3');
    expect(fields.set1ScoreA.fieldName).toBe('Команда А партия 1');
    expect(fields.set2ScoreA.fieldName).toBe('Команда А партия 2');
    expect(fields.set3ScoreA.fieldName).toBe('Команда А партия 3');
  });

  it('должен возвращать null для несуществующего инпута', () => {
    const fields = getDefaultFieldsForInput('nonExistentInput');
    expect(fields).toBeNull();
  });
});
