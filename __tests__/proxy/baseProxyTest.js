/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import Proxy from "../../src/Proxy.js";
import {describe, jest} from '@jest/globals'


// Эмулируем модуль целиком
jest.mock('axios');

// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
// axios.create.mockReturnThis();


let $proxy;
beforeEach(() => {
    $proxy = new Proxy({
        baseUrl: 'https://sitespring.ru'
    });
    // Считаем вызов событий
    $proxy.emit = jest.fn();
})

describe('Base Proxy tests', ()=>{

    test('Успешный запрос', (done) => {
        const mockData = {some: 'how'};
        const requestConfig = {url: 'test'};
        const response = {status: 200, data: mockData};

        // Эмулируем ответ
        $proxy.axios.request = jest.fn().mockResolvedValue(response);

        $proxy.doRequest(requestConfig)
            .then((data) => {
                expect(data).toEqual(mockData);
                expect($proxy.emit).toBeCalledTimes(3);
                expect($proxy.emit).toHaveBeenNthCalledWith(1, Proxy.EVENT_REQUEST_START, requestConfig);
                expect($proxy.emit).toHaveBeenNthCalledWith(2, Proxy.EVENT_REQUEST_SUCCESS, data);
                expect($proxy.emit).toHaveBeenNthCalledWith(3, Proxy.EVENT_REQUEST_END, response);
                expect($proxy.isRemoteError).toBeFalsy();
                expect($proxy.isValidationError).toBeFalsy();
                expect($proxy.errorMessage).toBeNull();
                done();
            });
    });


    test('500 ошибка запроса', (done) => {
        const requestConfig = {url: 'test'};
        const response = {status: 500, message: 'Internal Server Error'};

        // Эмулируем ответ
        $proxy.axios.request = jest.fn().mockRejectedValue({response});

        $proxy.doRequest(requestConfig)
            // Отлавливаем ошибку
            .catch((error) => {
                expect($proxy.emit).toBeCalledTimes(3);
                expect($proxy.emit).toHaveBeenNthCalledWith(1, Proxy.EVENT_REQUEST_START, requestConfig);
                expect($proxy.emit).toHaveBeenNthCalledWith(2, Proxy.EVENT_REQUEST_FAILED, error);
                expect($proxy.emit).toHaveBeenNthCalledWith(3, Proxy.EVENT_REQUEST_END, undefined);
                expect($proxy.isRemoteError).toBeTruthy();
                expect($proxy.isValidationError).toBeFalsy();
                expect($proxy.errorMessage).toEqual('Internal Server Error');
                done();
            });
    });

    test('422 Ошибка запроса с вложенными данными', (done) => {
        const requestConfig = {url: 'test'};
        const response = {status: 422, message: 'Validation Error', data: {message: 'Nested envelope error'}};

        // Эмулируем ответ
        $proxy.axios.request = jest.fn().mockRejectedValue({response});

        $proxy.doRequest(requestConfig)
            // Отлавливаем ошибку
            .catch((error) => {
                expect($proxy.isRemoteError).toBeTruthy();
                expect($proxy.isValidationError).toBeTruthy();
                expect($proxy.errorMessage).toEqual('Nested envelope error');
                done();
            });
    });


    test('Токен авторизации + событие', (done) => {
        Proxy.setBearerToken('123');

        $proxy = new Proxy({
            hasEmitter: true
        });
        $proxy.on(Proxy.EVENT_REQUEST_START, /** @param {AxiosResponseSchema} config */(config) => {
            expect(config).toMatchObject({
                headers: {
                    'Authorization': 'Bearer 123'
                }
            });
            done();
        });

        // Эмулируем ответ
        $proxy.axios.request = jest.fn().mockResolvedValue({});
        $proxy.doRequest();
    });

    test('Токен авторизации: изменение через метод', async () => {
        $proxy = new Proxy();
        $proxy.constructor.setBearerToken('1234');

        // Создаем другой экземпляр, токен должен быть определен
        const $proxy2 = new Proxy();
        // Эмулируем ответ
        $proxy2.axios.request = jest.fn().mockResolvedValue({});

        await $proxy2.doRequest();
        expect($proxy2.axios.request).toBeCalledWith({
            headers: {
                'Authorization': 'Bearer 1234'
            }
        });

        Proxy.bearerToken = null;
        await $proxy2.doRequest();
        expect($proxy2.axios.request).toBeCalledWith({});
    });

})
