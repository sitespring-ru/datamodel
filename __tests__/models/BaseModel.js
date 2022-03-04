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

    submitFilters() {
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
        const $model = new TestModel({age: '16'});
        expect($model.getAttributes()).toMatchObject({
            id: 'TestModel-1',
            age: 16,
            dob: null
        });
        expect($model.isPhantom()).toBeTruthy();
        expect($model.isDirty()).toBeFalsy();
        expect($model.getAttribute('created_at')).toBeInstanceOf(Date);
    });

    test('Неизвестный аттрибут', () => {
        const $model = new TestModel({bar: 'baz'});
        $model.setAttribute('bar', 'foo');
        expect(() => $model.getAttribute('bar')).toThrow('Unknown attribute name "bar"');
    });

    test('Изменение данных', (done) => {
        const $model = new TestModel({age: '22'});
        const $newData = {name: '  should be trimmed ', age: '22', dob: '2000-10-01'};
        const $expData = {name: 'should be trimmed', dob: new Date('2000-10-01')};

        $model.on(TestModel.EVENT_ATTRIBUTES_CHANGE, ($attr) => {
            expect($model.isDirty()).toBeTruthy();
            expect($model.getAttributes()).toMatchObject($expData);
            expect($attr).toEqual($expData);
            done();
        });
        $model.setAttributes($newData);
    });

    test('Сброс значений к исходным', () => {
        const $model = new TestModel({age: 22});
        expect($model.isDirty()).toBeFalsy();
        $model.setAttributes({age: 23});
        expect($model.isDirty()).toBeTruthy();
        expect($model.getAttribute('age')).toEqual(23);
        expect($model.getAttribute('age', false)).toEqual(22);
        $model.resetAttributes();
        expect($model.isDirty()).toBeFalsy();
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
});


describe('Валидация на стороне клиента', () => {
    test('Валидация всех аттрибутов', () => {
        const $model = new TestModel({name: '123456'});
        expect($model.validate()).toBeTruthy();
        expect($model.hasErrors()).toBeFalsy();

        $model.setAttributes({age: '122', name: '   qw'});
        expect($model.validate()).toBeFalsy();
        expect($model.hasErrors()).toBeTruthy();
        expect($model.getErrors()).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});
        expect($model.getFirstErrorMessage()).toEqual('must be less than 120');
    });


    test('Валидация отдельных полей', () => {
        const $model = new TestModel({age: '122', name: '   qw'});
        expect($model.validate(['name'])).toBeFalsy();
        expect($model.getErrors()).toEqual({name: ['is too short (minimum is 3 characters)']});
    });

    test('Валидация перед запросом', async () => {
        const $model = new TestModel({age: '122', name: '   qw'});
        // Автовалидация всех аттрибутов
        try {
            await $model.doRequest({}, true);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.getErrors()).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});
        }
        // Автовалидация выбранных аттрибутов
        try {
            await $model.doRequest({}, ['age']);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.getErrors()).toEqual({age: ['must be less than 120']});
        }
    });
});

describe('Валидация на стороне сервера', () => {
    test('422 Ошибка', async () => {
        axios.request.mockRejectedValue({
            response: {
                status: 422,
                data: [
                    {field: 'dob', message: 'Date of Birth is required'}
                ]
            }
        });
        const $model = new TestModel();
        try {
            await $model.doRequest({url: 'myapi'});
        } catch (e) {
            expect($model.hasErrors()).toBeTruthy();
            expect($model.getErrors()).toEqual({dob: ['Date of Birth is required']});
            expect($model.getFirstErrorMessage()).toEqual('Date of Birth is required');
        }
    });

    test('500 Ошибка', async () => {
        axios.request.mockRejectedValue({
            response: {
                status: 500, data: {message: 'Internal Server Error'}
            }
        });
        const $model = new TestModel();
        try {
            await $model.doRequest({url: 'myapi'});
        } catch (e) {
            // Ошибка не является ошибкой валидации
            expect($model.hasErrors()).toBeFalsy();
            expect(e).toEqual('Internal Server Error');
            expect($model.getProxy().errorMessage).toEqual('Internal Server Error');
        }
    });
});


describe('CRUD rest api', () => {
    test('Fetch', (done) => {
        const $model = new TestModel();
        expect($model.isPhantom()).toBeTruthy();

        $model.getProxy().doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike'});
        $model.on(TestModel.EVENT_FETCH, ($data) => {
            expect($model.getProxy().doRequest).toHaveBeenNthCalledWith(1, {method: 'GET', url: 'test-model/55'});
            expect($model.isPhantom()).toBeFalsy();
            expect($data).toMatchObject({dob: '2000-02-03', name: 'Mike'});
            expect($model.getAttributes()).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            done();
        });
        $model.fetch(55);
    });

    test('Create', (done) => {
        const $model = new TestModel({created_at: '2022-03-11T01:33:07', id: 55});
        expect($model.isPhantom()).toBeTruthy();

        $model.getProxy().doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike', id: 55});
        $model.on(TestModel.EVENT_CREATE, ($data) => {
            expect($data).toMatchObject({dob: '2000-02-03', name: 'Mike', id: 55});
            expect($model.isPhantom()).toBeFalsy();
            expect($model.isDirty()).toBeFalsy();
            expect($model.getAttributes()).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            expect($model.getAttributes(null, false)).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            expect($model.getProxy().doRequest).toHaveBeenNthCalledWith(1, {
                method: 'POST'
                , url: 'test-model'
                , data: {
                    "age": null,
                    "created_at": "2022-03-11 01:33:07",
                    "dob": null,
                    "id": 55,
                    "name": "",
                }
            });
            done();
        });
        $model.create();
    });

    test('Update', (done) => {
        const $model = new TestModel({created_at: '2022-03-11T01:33:07', name: 'Xoxa', id: 18});
        expect($model.isDirty()).toBeFalsy();

        $model.getProxy().doRequest = jest.fn().mockResolvedValue({name: 'Mike'});
        $model.setAttribute('name', 'Evgeny');
        expect($model.getAttribute('name', false)).toEqual('Xoxa');
        expect($model.getAttribute('name')).toEqual('Evgeny');
        expect($model.isDirty()).toBeTruthy();

        $model.on(TestModel.EVENT_SAVE, ($data) => {
            expect($data).toMatchObject({name: 'Mike'});
            expect($model.isDirty()).toBeFalsy();
            expect($model.getAttribute('name', false)).toEqual('Mike');
            expect($model.getAttribute('name')).toEqual('Mike');

            expect($model.getProxy().doRequest).toHaveBeenNthCalledWith(1, {
                method: 'PUT'
                , url: 'test-model/18'
                , data: {
                    "name": "Evgeny",
                }
            });
            done();
        });

        $model.save();
    });


    test('Delete', (done) => {
        const $model = new TestModel({id: 16});
        $model.getProxy().doRequest = jest.fn().mockResolvedValue(null);
        $model.on(TestModel.EVENT_DELETE, () => {
            expect($model.isDeleted()).toBeTruthy();
            expect($model.getProxy().doRequest).toHaveBeenNthCalledWith(1, {method: 'DELETE', url: 'test-model/16'});
            done();
        });
        $model.delete();

    });
});