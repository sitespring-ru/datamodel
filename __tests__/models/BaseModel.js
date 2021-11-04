/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/models/BaseModel";
import axios from "axios";
import validate from "validate.js";
import {watch} from "vue";

// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();

class TestModel extends BaseModel {
    defaults() {
        return {
            ...super.defaults(),
            bar: 'foo',
            name: null
        };
    }

    validationConstraints() {
        return {
            bar: {
                presence: true
            },
            name: {
                presence: {
                    allowEmpty: false,
                    message: 'required'
                },
                length: {
                    minimum: 3,
                    tooShort: 'tooShort'
                }
            }
        }
    }
}

describe('Работа с аттрибутами', () => {
    test('Аттрибуты через конструктор', () => {
        const $model = new TestModel({some: 'her', bar: 'baz'});
        // Ожидаем только изменения для bar, т.к. аттрибут some не был определен для Модели
        expect($model.getAttributes()).toEqual({
            id: null,
            bar: 'baz',
            name: null
        });
        expect($model.isPhantom()).toBeTruthy();
    });

    test('Неизвестный аттрибут', () => {
        const $model = new TestModel({id: 666});
        $model.setAttribute('unknown', 'foo')
        expect(() => $model.getAttribute('unknown').toBeNull());
        expect($model.getAttributes()).toEqual({
            id: 666,
            bar: 'foo',
            name: null
        });
        expect($model.isPhantom()).toBeFalsy();
    });

    test('Изменение после инициализации', (done) => {
        const $model = new TestModel();
        watch($model.attributes, (attrs) => {
            expect(attrs).toEqual({
                id: null, bar: 'nofood',
                name: null
            });
            done();
        });
        $model.setAttribute('bar', 'nofood');
    });

    test('Групповое Изменение', () => {
        const $model = new TestModel();
        $model.setAttributes({bar: 'nofood', id: 3});
        expect($model.getAttribute('bar')).toEqual('nofood');
        expect($model.getAttribute('id')).toEqual(3);
    });

    test('Сброс значений к исходным', () => {
        const $model = new TestModel({some: 'her', bar: 'baz'});
        $model.setAttributes({
            some: 'asd',
            bar: 'hoy',
            mother: ['fucker']
        });
        $model.resetAttributes();
        expect($model.getAttributes()).toEqual({id: null, bar: 'foo', name: null});
    });

    test('Генерация id', () => {
        expect(TestModel.generateId()).toEqual('TestModel-1');
        expect(TestModel.generateId()).toEqual('TestModel-2');
    });

    test('Сериализация данных', () => {
        const $model = new TestModel({bar: 'baz'});
        expect($model.serialize()).toEqual('{"bar":"baz"}');
        $model.deserialize('{"id":666,"bar":"superBoom"}')
        expect($model.getAttributes()).toEqual({id: 666, bar: 'superBoom', name: null});
    });
});

describe('Валидация данных', () => {
    test('Валидация на стороне клиента', () => {
        validate.validators.presence.options = {message: 'Expect not to be empty'};

        const $model = new TestModel();
        $model.setAttributes({bar: null});
        expect($model.validate()).toBeFalsy();
        expect($model.hasErrors.value).toBeTruthy();
        expect($model.errors.value).toEqual({bar: ['Expect not to be empty'], name: ['required']});

        $model.setAttribute('bar', 'some');
        $model.setAttribute('name', 'Xoxa');
        expect($model.validate()).toBeTruthy();
        expect($model.hasErrors.value).toBeFalsy();
    });

    test('Валидация с доп. параметрами', () => {
        const $model = new TestModel({bar: ""});
        const constraints = {bar: {presence: {allowEmpty: false, message: 'Bar required'}}};
        expect($model.validate(['bar'], constraints)).toBeFalsy();
        expect($model.errors.value).toEqual({bar: ['Bar required']});
    });


    test('Валидация отдельных полей', () => {
        const $model = new TestModel({name: "xo"});
        expect($model.validate(['name'])).toBeFalsy();
        expect($model.errors.value).toEqual({name: ['tooShort']});
    });


    test('Сброс ошибок', () => {
        const $model = new TestModel();
        $model.setErrors({'foo': ['bar']});
        expect($model.hasErrors.value).toBeTruthy();
        $model.dropErrors();
        expect($model.hasErrors.value).toBeFalsy();
    });

    test('Валидация на стороне сервера', async () => {
        axios.request.mockRejectedValue({
            response: {
                status: 422, data: [
                    {field: 'bar', message: 'Foo required'}
                ]
            }
        });

        const $model = new TestModel();
        try {
            const response = await $model.doRequest({url: 'myapi'});
        } catch (e) {
            expect($model.hasErrors.value).toBeTruthy();
            expect($model.errors.value).toEqual({'bar': ['Foo required']});
            expect($model.getFirstErrorMessage()).toEqual('Foo required');
        }
    });


    test('Автовалидация перед запросом', async () => {
        validate.validators.presence.options = {message: 'Expect not to be empty'};
        const $model = new TestModel({bar: null});
        // Автовалидация всех аттрибутов
        try {
            await $model.doRequest({}, true);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.errors.value).toEqual({bar: ['Expect not to be empty'], name: ['required']});
        }
        // Автовалидация выбранных аттрибутов
        try {
            await $model.doRequest({}, ['name']);
        } catch (e) {
            expect(e).toEqual('Before request validation failed');
            expect($model.errors.value).toEqual({name: ['required']});
        }
    });
});