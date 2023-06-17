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
}

describe('Магические свойства модели', () => {
    test('Геттеры', () => {
        const $model = new TestSchema({age: '16'});

        expect($model.age).toEqual(16);
        expect($model.created_at).toBeInstanceOf(Date);
    });

    test('Cеттеры', () => {
        const $model = TestSchema.createInstance({
            idProperty: 'name'
        });

        $model.id = 13;
        expect($model.id).toEqual('13'); // Expect string due name is idProperty and have string filter

        $model.name = 'Xoxa';
        expect($model.id).toEqual('Xoxa');

        $model.age = '66';
        expect($model.age).toEqual(66);

        $model.dob = new Date('1984-09-10');
        expect($model.dob).toBeInstanceOf(Date);
    });
});

