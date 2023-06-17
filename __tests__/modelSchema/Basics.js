/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import ModelSchema from "../../src/ModelSchema";

class TestSchema extends ModelSchema {
    entityName = 'test-model';

    fields() {
        return {
            ...super.fields(),
            created_at: new Date(),
            dob: null,
            age: null,
            name: ''
        };
    }

    innerFilters() {
        return {
            created_at: 'date',
            dob: 'date',
            age: 'int',
            name: 'string'
        }
    }

    outerFilters() {
        return {
            created_at: 'submitDateTime',
            dob: 'submitDate'
        }
    }

    rules() {
        return {
            age: {
                numericality: {
                    greaterThan: 0,
                    lessThan: 120
                }
            },
            name: {
                presence: {
                    allowEmpty: true
                },
                length: {
                    minimum: 3
                }
            }
        }
    }
}

describe('Работа с аттрибутами', () => {
    test('Аттрибуты через конструктор', () => {
        const $model = new TestSchema({age: '16'});
        expect($model.getAttributes()).toMatchObject({
            id: null,
            age: 16,
            dob: null
        });
        expect($model.isPhantom).toBeTruthy();
        expect($model.isDirty).toBeFalsy();
        expect($model.getAttribute('created_at')).toBeInstanceOf(Date);
    });

    test('Неизвестный аттрибут', () => {
        const $model = new TestSchema({bar: 'baz'});
        $model.setAttribute('bar', 'foo');
        expect(() => $model.getAttribute('bar')).toThrow('Unknown attribute name "bar"');
    });

    test('Изменение данных', (done) => {
        const $model = new TestSchema({age: '22'});
        const $newData = {name: '  should be trimmed ', age: '22', dob: '2000-10-01'};
        const $expData = {name: 'should be trimmed', dob: new Date('2000-10-01')};

        $model.on(TestSchema.EVENT_ATTRIBUTES_CHANGE, ($attr) => {
            expect($model.isDirty).toBeTruthy();
            expect($model.getAttributes()).toMatchObject($expData);
            expect($attr).toEqual($expData);
            done();
        });
        $model.setAttributes($newData);
    });

    test('Сброс значений к исходным', () => {
        const $model = new TestSchema({age: 22});
        expect($model.isDirty).toBeFalsy();
        $model.setAttributes({age: 23});
        expect($model.isDirty).toBeTruthy();
        expect($model.getAttribute('age')).toEqual(23);
        expect($model.getAttribute('age', false)).toEqual(22);
        $model.resetAttributes();
        expect($model.isDirty).toBeFalsy();
        expect($model.getAttribute('age')).toEqual(22);
    });


    test('Сериализация данных', () => {
        const $model = new TestSchema({age: '22', dob: '2000-10-01', created_at: '2022-10-03 22:13:57'});
        expect($model.serialize(['age', 'dob', 'created_at'])).toEqual('{"age":22,"dob":"2000-10-01","created_at":"2022-10-03 22:13:57"}');
    });

    test('Десериализация данных', () => {
        const $model = new TestSchema();
        $model.deserialize('{"age":22,"dob":"2000-10-01","created_at":"2022-10-03 22:13:57"}');
        expect($model.getAttributes()).toMatchObject({
            age: 22,
            dob: new Date('2000-10-01'),
            created_at: new Date('2022-10-03 22:13:57')
        });
    });

    test('Dirty changes', () => {
        const model = new TestSchema({age: 16});
        model.age = 17;
        expect(model.isDirty).toBeTruthy();
        model.age = 16;
        expect(model.age).toBe(16);
        expect(model.isDirty).toBeFalsy();
    });
});


describe('Валидация на стороне клиента', () => {
    test('Валидация всех аттрибутов', () => {
        const $model = new TestSchema({name: '123456'});
        expect($model.validate()).toBeTruthy();
        expect($model.hasErrors).toBeFalsy();

        $model.setAttributes({age: '122', name: '   qw'});
        expect($model.validate()).toBeFalsy();
        expect($model.hasErrors).toBeTruthy();
        expect($model.errors).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});
        expect($model.firstErrorMessage).toEqual('must be less than 120');
    });


    test('Валидация отдельных полей', () => {
        const $model = new TestSchema({age: '122', name: '   qw'});
        expect($model.validate(['name'])).toBeFalsy();
        expect($model.errors).toEqual({name: ['is too short (minimum is 3 characters)']});
    });

    test('Валидация перед запросом', async () => {
        const $model = new TestSchema({age: '122', name: '   qw'});
        // Автовалидация всех аттрибутов
        $model.validate({});
        expect($model.errors).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});

        // Drop errors and revalidate custom field
        $model.validate(['age']);
        expect($model.errors).toEqual({age: ['must be less than 120']});
    });
});