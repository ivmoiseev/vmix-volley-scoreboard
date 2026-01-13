/**
 * Тесты для миграции конфигураций полей vMix
 */

const {
  migrateFieldConfig,
  migrateInputConfig,
  migrateVMixConfig,
} = require('../../../src/main/vmix-field-migration');

describe('vmix-field-migration', () => {
  describe('migrateFieldConfig', () => {
    test('должен мигрировать поле типа color в fill', () => {
      const field = {
        enabled: true,
        type: 'color',
        fieldName: 'Цвет А',
        fieldIdentifier: 'ColorA',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('fill');
      expect(migrated.fieldIdentifier).toBe('ColorA');
      expect(migrated.enabled).toBe(true);
      expect(migrated.fieldName).toBe('Цвет А');
    });

    test('должен мигрировать поле типа visibility в text с visible: true', () => {
      const field = {
        enabled: true,
        type: 'visibility',
        fieldName: 'Поинт А',
        fieldIdentifier: 'PointA',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('text');
      expect(migrated.visible).toBe(true);
      expect(migrated.fieldIdentifier).toBe('PointA');
      expect(migrated.enabled).toBe(true);
      expect(migrated.fieldName).toBe('Поинт А');
    });

    test('должен удалять суффикс .Fill.Color из fieldIdentifier при миграции color', () => {
      const field = {
        enabled: true,
        type: 'color',
        fieldIdentifier: 'ColorA.Fill.Color',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('fill');
      expect(migrated.fieldIdentifier).toBe('ColorA');
    });

    test('должен удалять суффикс .Text из fieldIdentifier при миграции visibility', () => {
      const field = {
        enabled: true,
        type: 'visibility',
        fieldIdentifier: 'PointA.Text',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('text');
      expect(migrated.fieldIdentifier).toBe('PointA');
      expect(migrated.visible).toBe(true);
    });

    test('должен сохранять поля типа text без изменений', () => {
      const field = {
        enabled: true,
        type: 'text',
        fieldIdentifier: 'TeamA',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('text');
      expect(migrated.fieldIdentifier).toBe('TeamA');
      expect(migrated).toEqual(field);
    });

    test('должен сохранять поля типа image без изменений', () => {
      const field = {
        enabled: true,
        type: 'image',
        fieldIdentifier: 'TeamALogo',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('image');
      expect(migrated.fieldIdentifier).toBe('TeamALogo');
      expect(migrated).toEqual(field);
    });

    test('должен удалять суффикс .Source из fieldIdentifier для image', () => {
      const field = {
        enabled: true,
        type: 'image',
        fieldIdentifier: 'TeamALogo.Source',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('image');
      expect(migrated.fieldIdentifier).toBe('TeamALogo');
    });

    test('должен удалять суффикс .Text из fieldIdentifier для text', () => {
      const field = {
        enabled: true,
        type: 'text',
        fieldIdentifier: 'TeamA.Text',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('text');
      expect(migrated.fieldIdentifier).toBe('TeamA');
    });

    test('должен сохранять все дополнительные свойства поля', () => {
      const field = {
        enabled: false,
        type: 'color',
        fieldIdentifier: 'ColorA',
        fieldName: 'Цвет А',
        customProperty: 'customValue',
      };

      const migrated = migrateFieldConfig(field);

      expect(migrated.type).toBe('fill');
      expect(migrated.customProperty).toBe('customValue');
      expect(migrated.enabled).toBe(false);
    });
  });

  describe('migrateInputConfig', () => {
    test('должен мигрировать все поля в конфигурации инпута', () => {
      const inputConfig = {
        enabled: true,
        inputIdentifier: 'Input1',
        overlay: 1,
        fields: {
          teamA: { enabled: true, type: 'text', fieldIdentifier: 'TeamA.Text' },
          colorA: { enabled: true, type: 'color', fieldIdentifier: 'ColorA' },
          pointA: { enabled: true, type: 'visibility', fieldIdentifier: 'PointA' },
        },
      };

      const migrated = migrateInputConfig(inputConfig);

      expect(migrated.fields.teamA.type).toBe('text');
      expect(migrated.fields.teamA.fieldIdentifier).toBe('TeamA');
      expect(migrated.fields.colorA.type).toBe('fill');
      expect(migrated.fields.colorA.fieldIdentifier).toBe('ColorA');
      expect(migrated.fields.pointA.type).toBe('text');
      expect(migrated.fields.pointA.visible).toBe(true);
      expect(migrated.fields.pointA.fieldIdentifier).toBe('PointA');
    });

    test('должен сохранять структуру инпута без полей', () => {
      const inputConfig = {
        enabled: true,
        inputIdentifier: 'Input1',
        overlay: 1,
      };

      const migrated = migrateInputConfig(inputConfig);

      expect(migrated).toEqual(inputConfig);
    });
  });

  describe('migrateVMixConfig', () => {
    test('должен мигрировать всю конфигурацию vMix', () => {
      const config = {
        host: 'localhost',
        port: 8088,
        inputs: {
          currentScore: {
            enabled: true,
            inputIdentifier: 'Input1',
            overlay: 1,
            fields: {
              colorA: { enabled: true, type: 'color', fieldIdentifier: 'ColorA' },
              pointA: { enabled: true, type: 'visibility', fieldIdentifier: 'PointA' },
            },
          },
          lineup: {
            enabled: true,
            inputIdentifier: 'Input2',
            overlay: 1,
            fields: {
              teamA: { enabled: true, type: 'text', fieldIdentifier: 'TeamA.Text' },
            },
          },
        },
      };

      const migrated = migrateVMixConfig(config);

      expect(migrated.inputs.currentScore.fields.colorA.type).toBe('fill');
      expect(migrated.inputs.currentScore.fields.pointA.type).toBe('text');
      expect(migrated.inputs.currentScore.fields.pointA.visible).toBe(true);
      expect(migrated.inputs.lineup.fields.teamA.fieldIdentifier).toBe('TeamA');
      expect(migrated.host).toBe('localhost');
      expect(migrated.port).toBe(8088);
    });

    test('должен обрабатывать конфигурацию без inputs', () => {
      const config = {
        host: 'localhost',
        port: 8088,
      };

      const migrated = migrateVMixConfig(config);

      expect(migrated).toEqual(config);
    });

    test('должен обрабатывать пустую конфигурацию', () => {
      const config = {};

      const migrated = migrateVMixConfig(config);

      expect(migrated).toEqual(config);
    });
  });
});
