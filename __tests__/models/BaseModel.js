/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/models/BaseModel";
import axios from "axios";
import validate from "validate.js";

// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();

class extendedTestModel extends BaseModel {
    getDefaultAttributes() {
        return {
            ...super.getDefaultAttributes(),
            bar: 'foo'
        };
    }

    getValidationConstraints() {
        return {
            bar: {
                presence: true
            }
        }
    }
}

describe('Работа с аттрибутами', () => {
    test('Расширяем аттрибуты через конструктор', () => {
        const $model = new extendedTestModel({some: 'her'});
        $model.resetAttributes();
        expect($model.getAttributes()).toEqual({
            id: null,
            bar: 'foo',
            some: 'her'
        });
    });

    test('Неизвестный аттрибут', () => {
        const $model = new extendedTestModel();
        expect(() => $model.getAttribute('unknown').toThrowError());
        expect(() => $model.setAttribute('unknown', 'foo').toThrowError());
    });

    test('Изменение после инициализации', () => {
        const $model = new extendedTestModel();
        $model.emit = jest.fn();
        $model.setAttribute('bar', 'nofood');
        expect($model.getAttribute('bar')).toEqual('nofood');
        expect($model.emit).toHaveBeenCalledTimes(1);
        expect($model.emit).toHaveBeenCalledWith($model.constructor.EVENT_ATTRIBUTE_CHANGE, {name: 'bar', value: 'nofood', oldValue: 'foo'})

        // Сбрасываем статистику вызовов
        $model.emit.mockClear();
        $model.setAttribute('bar', 'nofood');
        // Событие не должно было
        expect($model.emit).toHaveBeenCalledTimes(0);
    });

    test('Групповое Изменение', () => {
        const $model = new extendedTestModel();
        $model.emit = jest.fn();
        $model.setAttributes({bar: 'nofood', id: 3});
        expect($model.getAttribute('bar')).toEqual('nofood');
        expect($model.getAttribute('id')).toEqual(3);
        expect($model.emit).toHaveBeenCalledTimes(2);
    });
});

describe('Валидация данных', () => {
    test('Валидация на стороне клиента', () => {
        validate.validators.presence.options = {message: 'Expect not to be empty'};

        const $model = new extendedTestModel();
        $model.emit = jest.fn();
        $model.setAttributes({bar: null});
        expect($model.validate()).toBeFalsy();
        expect($model.hasErrors()).toBeTruthy();
        // 1 раз когда сменили аттрибут, 2 раз при валидации
        expect($model.emit).toHaveBeenCalledTimes(2);
        expect($model.emit).toHaveBeenLastCalledWith($model.constructor.EVENT_ERRORS_CHANGE, {errors: {bar: ['Expect not to be empty']}});

        $model.setAttribute('bar', 'some');
        expect($model.validate()).toBeTruthy();
        expect($model.hasErrors()).toBeFalsy();
    });

    test('Валидация с доп. параметрами', () => {
        const $model = new extendedTestModel();
        expect($model.validate({bar: ''}, {bar: {presence: {allowEmpty: false, message: 'Bar required'}}})).toBeFalsy();
        expect($model.getErrors()).toEqual({bar: ['Bar required']});
    });

    test('Сброс ошибок', () => {
        const $model = new extendedTestModel();
        $model.emit = jest.fn();
        $model.setErrors({'foo': ['bar']});
        expect($model.hasErrors()).toBeTruthy();
        $model.dropErrors();
        expect($model.hasErrors()).toBeFalsy();
        expect($model.emit).toHaveBeenLastCalledWith($model.constructor.EVENT_ERRORS_CHANGE, {errors: {}});
    });

    test('Валидация на стороне сервера', async () => {
        axios.request.mockRejectedValue({
            response: {
                status: 422, data: [
                    {field: 'bar', message: 'Foo required'}
                ]
            }
        });

        const $model = new extendedTestModel();
        try {
            const response = await $model.doRequest({url: 'myapi'});
        } catch (e) {
            expect($model.hasErrors()).toBeTruthy();
            expect($model.getErrors()).toEqual({'bar': ['Foo required']});
        }
    });
});