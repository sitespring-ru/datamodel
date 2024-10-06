/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel";
import axios from "axios";
import {jest} from '@jest/globals'

// Эмулируем модуль целиком
jest.mock('axios');

class TestModel extends BaseModel {
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



describe('Валидация на стороне клиента', () => {
    test('Валидация всех аттрибутов', () => {
        const $model = new TestModel({name: '123456'});
        expect($model.validate()).toBeTruthy();
        expect($model.hasErrors).toBeFalsy();

        $model.setAttributes({age: '122', name: '   qw'});
        expect($model.validate()).toBeFalsy();
        expect($model.hasErrors).toBeTruthy();
        expect($model.errors).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});
        expect($model.firstErrorMessage).toEqual('must be less than 120');
    });


    test('Валидация отдельных полей', () => {
        const $model = new TestModel({age: '122', name: '   qw'});
        expect($model.validate(['name'])).toBeFalsy();
        expect($model.errors).toEqual({name: ['is too short (minimum is 3 characters)']});
    });

    test('Валидация перед запросом', async () => {
        const $model = new TestModel({age: '122', name: '   qw'});
        // Автовалидация всех аттрибутов
        try {
            await $model.doRequest({}, true);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.errors).toEqual({age: ['must be less than 120'], name: ['is too short (minimum is 3 characters)']});
        }
        // Автовалидация выбранных аттрибутов
        try {
            await $model.doRequest({}, ['age']);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.errors).toEqual({age: ['must be less than 120']});
        }
    });
});

describe('Валидация на стороне сервера', () => {
    test('422 Ошибка', async () => {
        const $model = new TestModel();
        $model.proxy.doRequest = jest.fn().mockResolvedValue({
            response: {
                status: 422,
                data: [
                    {field: 'dob', message: 'Date of Birth is required'}
                ]
            }
        });


        try {
            await $model.doRequest({url: 'myapi'});
        } catch (e) {
            expect($model.hasErrors).toBeTruthy();
            expect($model.errors).toEqual({dob: ['Date of Birth is required']});
            expect($model.firstErrorMessage).toEqual('Date of Birth is required');
        }
    });

    test('500 Ошибка', async () => {
        const $model = new TestModel();
        $model.proxy.doRequest = jest.fn().mockResolvedValue({
            response: {
                status: 500, data: {message: 'Internal Server Error'}
            }
        });

        try {
            await $model.doRequest({url: 'myapi'});
        } catch (e) {
            // Ошибка не является ошибкой валидации
            expect($model.hasErrors).toBeFalsy();
            expect(e).toEqual('Internal Server Error');
            expect($model.proxy.errorMessage).toEqual('Internal Server Error');
        }
    });
});


describe('CRUD rest api', () => {
    test('Fetch', (done) => {
        const $model = new TestModel({id: 55}, {hasEmitter: true});
        expect($model.isPhantom).toBeTruthy();

        $model.proxy.doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike'});
        $model.on(TestModel.EVENT_FETCH, ($data) => {
            expect($model.proxy.doRequest).toHaveBeenNthCalledWith(1, {
                method: 'GET', url: 'test-model/55', params: {
                    fields: 'id,name',
                    expand: 'passport'
                }
            });
            expect($model.isPhantom).toBeFalsy();
            expect($data).toMatchObject({dob: '2000-02-03', name: 'Mike'});
            expect($model.getAttributes()).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            done();
        });
        $model.fetch({
            params: {
                fields: 'id,name',
                expand: 'passport'
            }
        });
    });

    test('Create', (done) => {
        const $model = new TestModel({created_at: '2022-03-11T01:33:07', id: 55}, {hasEmitter: true});
        expect($model.isPhantom).toBeTruthy();

        $model.proxy.doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike', id: 55});
        $model.on(TestModel.EVENT_CREATE, ($data) => {
            expect($data).toMatchObject({dob: '2000-02-03', name: 'Mike', id: 55});
            expect($model.isPhantom).toBeFalsy();
            expect($model.isDirty).toBeFalsy();
            expect($model.getAttributes()).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            expect($model.getAttributes(null, false)).toMatchObject({dob: new Date('2000-02-03'), name: 'Mike'});
            expect($model.proxy.doRequest).toHaveBeenNthCalledWith(1, {
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
        const $model = new TestModel({created_at: '2022-03-11T01:33:07', name: 'Xoxa', id: 18}, {hasEmitter: true});
        expect($model.isDirty).toBeFalsy();

        $model.proxy.doRequest = jest.fn().mockResolvedValue({name: 'Mike'});
        $model.setAttribute('name', 'Evgeny');
        expect($model.getAttribute('name', false)).toEqual('Xoxa');
        expect($model.getAttribute('name')).toEqual('Evgeny');
        expect($model.isDirty).toBeTruthy();

        $model.on(TestModel.EVENT_SAVE, ($data) => {
            expect($data).toMatchObject({name: 'Mike'});
            expect($model.isDirty).toBeFalsy();
            expect($model.getAttribute('name', false)).toEqual('Mike');
            expect($model.getAttribute('name')).toEqual('Mike');

            expect($model.proxy.doRequest).toHaveBeenNthCalledWith(1, {
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
        const $model = new TestModel({id: 16}, {hasEmitter: true});
        $model.proxy.doRequest = jest.fn().mockResolvedValue(null);
        $model.on(TestModel.EVENT_DELETE, () => {
            expect($model.isDeleted).toBeTruthy();
            expect($model.proxy.doRequest).toHaveBeenNthCalledWith(1, {method: 'DELETE', url: 'test-model/16'});
            done();
        });
        $model.delete();

    });
});