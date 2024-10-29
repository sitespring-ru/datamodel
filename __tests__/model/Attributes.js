import Model from "../../src/Model.js";

/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
class TestModel extends Model {
    get entityName() {
        return 'test-model';
    }

    get fields() {
        return {
            ...super.fields,
            created_at: new Date(),
            dob: null,
            age: null,
            name: ''
        };
    }

    get innerFilters() {
        return {
            created_at: 'date',
            dob: 'date',
            age: 'int',
            name: 'string'
        }
    }

    get submitFilters() {
        return {
            created_at: 'submitDateTime',
            dob: 'submitDate'
        }
    }

    get rules() {
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
        let model = new TestModel({age: '16'});
        const attrs = model.attributes;
        expect(attrs).toMatchObject({
            id: 'TestModel-1',
            age: 16,
            dob: null,
            name: ''
        });
        expect(model.isPhantom).toBeTruthy();
        expect(model.isDirty).toBeFalsy();
        expect(model.getAttribute('created_at')).toBeInstanceOf(Date);

        model = new TestModel({name: 'second'});
        expect(model.$).toMatchObject({
            id: 'TestModel-2',
            age: null,
            dob: null,
            name: 'second'
        });
    });

    test('Неизвестный аттрибут', () => {
        const $model = new TestModel({bar: 'baz'});
        $model.setAttribute('bar', 'foo');
        expect(() => $model.getAttribute('bar')).toThrow('Unknown attribute name "bar"');
    });

    test('Изменение данных', (done) => {
        const $model = new TestModel({age: '22'}, {hasEmitter: true});
        const $newData = {name: '  should be trimmed ', age: '22', dob: '2000-10-01'};
        const $expData = {name: 'should be trimmed', dob: new Date('2000-10-01')};

        $model.on(TestModel.EVENT_ATTRIBUTES_CHANGE, ($attr) => {
            expect($model.isDirty).toBeTruthy();
            expect($model.getAttributes()).toMatchObject($expData);
            expect($attr).toEqual($expData);
            done();
        });
        $model.setAttributes($newData);
    });

    test('Сброс значений к исходным', () => {
        const $model = new TestModel({age: 22});
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
        const $model = new TestModel({age: '22', dob: '2000-10-01', created_at: '2022-10-03 22:13:57'});
        expect($model.serialize(['age', 'dob', 'created_at'])).toEqual('{"age":22,"dob":"2000-10-01","created_at":"2022-10-03 22:13:57"}');
    });

    test('Десериализация данных', () => {
        const $model = new TestModel();
        $model.deserialize('{"age":22,"dob":"2000-10-01","created_at":"2022-10-03 22:13:57"}');
        expect($model.getAttributes()).toMatchObject({
            age: 22,
            dob: new Date('2000-10-01'),
            created_at: new Date('2022-10-03 22:13:57')
        });
    });

    test('Dirty changes', () => {
        const model = new TestModel({age: 16});
        model.age = 17;
        expect(model.isDirty).toBeTruthy();
        model.age = 16;
        expect(model.age).toBe(16);
        expect(model.isDirty).toBeFalsy();
    });

    test('Saved attributes value', () => {
        const model = new TestModel({age: 16});
        model.age = 17;
        expect(model.$.age).toBe(16);
    });
});
