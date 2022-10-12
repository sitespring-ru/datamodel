/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel";
import axios from "axios";

// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();

class TestModel extends BaseModel {
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
        const $model = new TestModel({age: '16'});

        expect($model.age).toEqual(16);
        expect($model.created_at).toBeInstanceOf(Date);
    });

    test('Cеттеры', () => {
        const $model = TestModel.createInstance({
            idProperty: 'name'
        });

        $model.id = 13;
        expect($model.id).toEqual(13);

        $model.name = 'Xoxa';
        expect($model.getId()).toEqual('Xoxa');

        $model.age = '66';
        expect($model.age).toEqual(66);

        $model.dob = new Date('1984-09-10');
        expect($model.dob).toBeInstanceOf(Date);
    });
});

