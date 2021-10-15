import axios from "axios";
import {isEmpty, reduce} from "lodash";
import BaseClass from "./BaseClass.js";

/**
 * Базовый класс для запросов - обертка для axios
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseProxy extends BaseClass {
    /**
     * @event BaseProxy#EVENT_REQUEST_START Событие при начале запроса
     * @type {object}
     * @property {object} requestConfig Конфигурация запроса
     * */
    static EVENT_REQUEST_START = 'requeststart';

    /**
     * @event BaseProxy#EVENT_REQUEST_END Событие при окончании запроса
     * @type {object}
     * @property {object} requestConfig Конфигурация запроса
     * */
    static EVENT_REQUEST_END = 'requestend';

    /**
     * @event BaseProxy#EVENT_REQUEST_FAILED Событие при ошибке
     * @type {object}
     * @property {proxyHandledError} error
     * @property {object} requestConfig Конфигурация запроса
     * */
    static EVENT_REQUEST_FAILED = 'requestfailed';

    /**
     * @event BaseProxy#EVENT_REQUEST_SUCCESS Событие при успехе
     * @type {object}
     * @property {object} data Данные полученные из ответа
     * @property {object} requestConfig Конфигурация запроса
     * @property {object} response Объекта ответа
     * */
    static EVENT_REQUEST_SUCCESS = 'requestsuccess';


    /**
     * @inheritDoc
     * */
    static getDefaultConfig() {
        return {
            authToken: null,
            baseURL: '/'
        }
    }


    constructor() {
        super();
        this._isRequesting = false;

        const self = this.constructor;
        // При создании автоматом заносим данные
        self.setAuthToken(this.getConfig('authToken'));
        self.setBaseUrl(this.getConfig('baseURL'));
    }


    /**
     * Обертка для axios
     * @return {axios} Экземпляр axios
     * */
    getAxiosInstance() {
        if (!this._axiosInstance) {
            this._axiosInstance = axios.create(this.getConfig());
        }
        return this._axiosInstance;
    }


    /**
     * Хелпер для установки заголовка авторизации
     * @param {string} token - пустой токен работает как удаление
     * */
    static setAuthToken(token) {
        if (!isEmpty(token)) {
            this.applyConfig('headers', {common: {'Authorization': `Bearer ${token}`}});
        } else {
            this.applyConfig('headers', {common: {'Authorization': null}});
        }
    }


    /**
     * Хелпер для установки baseUrl
     * @param {string} url
     * */
    static setBaseUrl(url) {
        this.applyConfig('baseURL', url);
    }


    /**
     * @inheritDoc
     * */
    applyConfig(path, config) {
        // Задаем настройки для экземпляра  axios
        const axiosDefaults = this.getAxiosInstance().defaults;
        axiosDefaults[path] = config;
    }

    /**
     * @inheritDoc
     * */
    static applyConfig(path, config) {
        // Задаем глобальные настройки для axios
        const axiosDefaults = axios.defaults;
        axiosDefaults[path] = config;
    }


    /**
     * Здесь можно обработать логику перед отправкой запроса
     * @return {boolean} False остановит запрос
     * @private
     * */
    __beforeRequest() {
        if (true === this._isRequesting) {
            console.log('Proxy is busy...');
            return false;
        }
        this._isRequesting = true;
        return true;
    }


    /**
     * Здесь можно обработать логику после отправки запроса
     * @private
     * */
    __afterRequest() {
        this._isRequesting = false;
    }


    /**
     * Метод для парсинга полезной нагрузки из ответа сервера
     * @param {object} response
     * @return {*} Данные
     * */
    parseResponseData(response) {
        return response.data;
    }


    /**
     * Метод для парсинга ошибок из ответа сервера
     * По умолчанию ожидаем от сервера ответ в формате:
     * [
     *     {
     *          "field": "cottage_id",
     *          "message": "Необходимо заполнить «Идентификатор Коттеджа»."
     *     },
     *      ...
     * ]
     *
     * @param {object} response
     * @return {object} Индексированный объект, где ключи название аттрибутов, а значения массив ошибок
     * */
    parseResponseValidationErrors(response) {
        let parsedErrors = [];
        if (response.data[0] && response.data[0]['message']) {
            // Собираем ошибки в индексированный объект
            parsedErrors = reduce(response.data, (result, value) => {
                result[value.field] = [value.message];
                return result;
            }, {});
        }
        return parsedErrors;
    }


    /**
     *  Обработчик ошибок
     *  Добавляем в объект ошибки дополнительную информацию
     *
     *  @typedef {object} proxyHandledError Расширенный экземпляр ошибки
     *  @property {Array} parsedErrors Массив ошибок которые удалось распарсить
     *  @property {Boolean} isRemoteError Была ли ошибка на стороне сервера
     *  @property {Boolean} isValidationError Информирует что на стороне сервера не пройдена валидация
     *
     *  @return {proxyHandledError} Экземпляр ошибки
     *  */
    handleResponseError(error) {
        // По умолчанию текст ошибки
        error.parsedErrors = ['Неизвестная ошибка связи'];

        //handle validation errors here
        if (error.response) {
            error.isRemoteError = true;
            // В ответе есть сообщение
            if (error.response.message) {
                error.parsedErrors = [error.response.message];
            }

            // Ошибка валидации на стороне сервера
            if (error.response.status === 422) {
                // Отдаем ошибки валидации на откуп вьюшкам, передавая их в свойстве parsedValidationErrors
                error.isValidationError = true;
                error.parsedErrors = this.parseResponseValidationErrors(error.response);
            }
        }
        return error;
    }


    /**
     * Общий метод выполнения запроса
     * @param {object} config - Конфигурация для запроса axios
     * @return {Promise}
     *
     * @fires BaseProxy#EVENT_REQUEST_START
     * @fires BaseProxy#EVENT_REQUEST_END
     * @fires BaseProxy#EVENT_REQUEST_SUCCESS
     * @fires BaseProxy#EVENT_REQUEST_FAILED
     * */
    async doRequest(config = {}) {
        if (!this.__beforeRequest()) {
            return Promise.reject('Before request failed');
        }

        const self = this.constructor;
        const axiosInstance = this.getAxiosInstance();
        try {
            this.emit(self.EVENT_REQUEST_START, {requestConfig: config});
            const response = await axiosInstance.request(config);
            const responseData = this.parseResponseData(response);
            this.emit(self.EVENT_REQUEST_SUCCESS, {data: responseData, requestConfig: config, response});
            return Promise.resolve(responseData);
        } catch (e) {
            e = this.handleResponseError(e);
            this.emit(self.EVENT_REQUEST_FAILED, {
                error: e,
                requestConfig: config
            });
            return Promise.reject(e);
        } finally {
            this.emit(self.EVENT_REQUEST_END, {requestConfig: config});
            this.__afterRequest();
        }
    }
}
