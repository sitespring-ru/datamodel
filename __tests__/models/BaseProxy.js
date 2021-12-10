/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseProxy from "../../src/models/BaseProxy.js";
import axios from "axios";


// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();


let $proxy;
beforeEach(() => {
    $proxy = new BaseProxy({
        baseURL: 'https://sitespring.ru'
    });
    // Считаем вызов событий
    $proxy.emit = jest.fn();
})

test('Успешный запрос', async () => {
    const mockData = {some: 'how'};
    const requestConfig = {url: 'test'};
    const response = {status: 200, data: mockData};

    // Эмулируем ответ
    axios.request.mockResolvedValue(response);

    const data = await $proxy.doRequest(requestConfig);
    expect(data).toEqual(mockData);
    expect($proxy.emit).toBeCalledTimes(3);
    expect($proxy.emit).toHaveBeenNthCalledWith(1, BaseProxy.EVENT_REQUEST_START, {requestConfig});
    expect($proxy.emit).toHaveBeenNthCalledWith(2, BaseProxy.EVENT_REQUEST_SUCCESS, {data: mockData, requestConfig, response});
    expect($proxy.emit).toHaveBeenNthCalledWith(3, BaseProxy.EVENT_REQUEST_END, {requestConfig});
});


test('Ошибка запроса', (done) => {
    const requestConfig = {url: 'test'};
    const response = {status: 500, message: 'Internal Server Error'};

    // Эмулируем ответ
    axios.request.mockRejectedValue({response});

    $proxy.doRequest(requestConfig)
        // Отлавливаем ошибку
        .catch((error) => {
            expect($proxy.emit).toBeCalledTimes(3);
            expect($proxy.emit).toHaveBeenNthCalledWith(1, BaseProxy.EVENT_REQUEST_START, {requestConfig});
            expect($proxy.emit).toHaveBeenNthCalledWith(2, BaseProxy.EVENT_REQUEST_FAILED, {requestConfig, error});
            expect($proxy.emit).toHaveBeenNthCalledWith(3, BaseProxy.EVENT_REQUEST_END, {requestConfig});
            expect(error.isRemoteError).toBeTruthy();
            expect(error.parsedErrors).toHaveLength(1);
            expect(error.parsedErrors).toEqual(['Internal Server Error']);
            done();
        });
});


test('Ошибка валидации на стороне сервера', (done) => {
    const requestConfig = {url: 'test'};
    const response = {
        status: 422,
        data: [
            {
                field: "field1",
                message: 'f1error'
            },
            {
                field: "field2",
                message: 'f2error'
            },
        ]
    };

    // Эмулируем ответ
    axios.request.mockRejectedValue({response});
    $proxy.doRequest(requestConfig).catch(error => {
        expect(error.isRemoteError).toBeTruthy();
        expect(error.isValidationError).toBeTruthy();
        expect(error.parsedErrors).toMatchObject({
            field1: ['f1error'],
            field2: ['f2error']
        });
        done();
    });
});


test('Смена токена авторизации', () => {
    BaseProxy.setAuthToken(null);
    expect($proxy.getAxiosInstance().defaults.headers.common).toMatchObject({});

    BaseProxy.setAuthToken('123');
    expect($proxy.getAxiosInstance().defaults.headers.common).toMatchObject({
        'Authorization': 'Bearer 123'
    });

    const anotherProxy = new BaseProxy();
    expect(anotherProxy.getAxiosInstance().defaults.headers.common).toMatchObject({
        'Authorization': 'Bearer 123'
    });
});