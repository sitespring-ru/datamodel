/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseProxy from "../../src/BaseProxy.js";
import axios from "axios";


// Эмулируем модуль целиком
jest.mock('axios');

// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();


let $proxy;
beforeEach(() => {
    $proxy = new BaseProxy({
        axios: {
            baseURL: 'https://sitespring.ru'
        }
    });
    // Считаем вызов событий
    $proxy.emit = jest.fn();
})

test('Успешный запрос', (done) => {
    const mockData = {some: 'how'};
    const requestConfig = {url: 'test'};
    const response = {status: 200, data: mockData};

    // Эмулируем ответ
    axios.request.mockResolvedValue(response);

    $proxy.doRequest(requestConfig)
        .then((data) => {
            expect(data).toEqual(mockData);
            expect($proxy.emit).toBeCalledTimes(3);
            expect($proxy.emit).toHaveBeenNthCalledWith(1, BaseProxy.EVENT_REQUEST_START, requestConfig);
            expect($proxy.emit).toHaveBeenNthCalledWith(2, BaseProxy.EVENT_REQUEST_SUCCESS, data);
            expect($proxy.emit).toHaveBeenNthCalledWith(3, BaseProxy.EVENT_REQUEST_END, response);
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
    axios.request.mockRejectedValue({response});

    $proxy.doRequest(requestConfig)
        // Отлавливаем ошибку
        .catch((error) => {
            expect($proxy.emit).toBeCalledTimes(3);
            expect($proxy.emit).toHaveBeenNthCalledWith(1, BaseProxy.EVENT_REQUEST_START, requestConfig);
            expect($proxy.emit).toHaveBeenNthCalledWith(2, BaseProxy.EVENT_REQUEST_FAILED, error);
            expect($proxy.emit).toHaveBeenNthCalledWith(3, BaseProxy.EVENT_REQUEST_END, undefined);
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
    axios.request.mockRejectedValue({response});

    $proxy.doRequest(requestConfig)
        // Отлавливаем ошибку
        .catch((error) => {
            expect($proxy.isRemoteError).toBeTruthy();
            expect($proxy.isValidationError).toBeTruthy();
            expect($proxy.errorMessage).toEqual('Nested envelope error');
            done();
        });
});


test('Токен авторизации', (done) => {
    BaseProxy.saveBearerToken('123');

    $proxy = new BaseProxy();
    $proxy.on(BaseProxy.EVENT_REQUEST_START, /** @param {AxiosResponseSchema} config */(config) => {
        expect(config).toMatchObject({
            headers: {
                'Authorization': 'Bearer 123'
            }
        });
        done();
    });

    // Эмулируем ответ
    axios.request.mockResolvedValue({});
    $proxy.doRequest();
});