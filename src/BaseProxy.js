import axios from "axios";
import {get, isEmpty, set} from "lodash-es";
import BaseClass from "./BaseClass.js";

/**
 * Базовый класс для запросов - обертка для axios с событиями и токеном авторизации
 *
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 */
export default class BaseProxy extends BaseClass {
    /**
     * @typedef {Object} AxiosInstance Экземпляр axios
     * @see https://github.com/axios/axios#creating-an-instance
     * */

    /**
     * @typedef {Object} AxiosRequestConfig
     * @see https://github.com/axios/axios#request-config
     * */

    /**
     * @typedef {Object} AxiosResponseSchema The response for a request contains the following information.
     * @property {Object} data `data` is the response that was provided by the server
     * @property {Number} status `status` is the HTTP status code from the server response
     * @property {String} statusText  is the HTTP status message from the server response
     * @property {Object} headers the HTTP headers that the server responded with
     * All header names are lower cased and can be accessed using the bracket notation.
     * `response.headers['content-type']`
     * @property {AxiosRequestConfig} config is the config that was provided to `axios` for the request
     * @property {Object} request is the request that generated this response
     * It is the last ClientRequest instance in node.js (in redirects)
     * */

    /**
     * @typedef {Object} AxiosErrorSchema
     * @property {AxiosResponseSchema} response
     * @property {XMLHttpRequest|ClientRequest} request is an instance of XMLHttpRequest in the browser and an instance of http.ClientRequest in node.js
     * @property {String} message  Something happened in setting up the request that triggered an Error
     * @property {AxiosRequestConfig} config  is the config that was provided to `axios` for the request
     * */

    /**
     * @event BaseProxy#EVENT_REQUEST_START Событие при начале запроса
     * @param {AxiosRequestConfig} $config Конфигурация запроса
     * */
    static EVENT_REQUEST_START = 'requestStart';

    /**
     * @event BaseProxy#EVENT_REQUEST_END Событие при окончании запроса
     * @param {AxiosResponseSchema} $response
     * */
    static EVENT_REQUEST_END = 'requestEnd';

    /**
     * @event BaseProxy#EVENT_REQUEST_FAILED Событие при ошибке
     * @param {AxiosErrorSchema} $error
     * */
    static EVENT_REQUEST_FAILED = 'requestFailed';

    /**
     * @event BaseProxy#EVENT_REQUEST_SUCCESS Событие при успехе
     * @param {Object} $data Данные полученные из ответа
     * */
    static EVENT_REQUEST_SUCCESS = 'requestSuccess';


    /**
     * Token to be added for all request as authorization header
     * */
    static bearerToken = null;


    /**
     * Сохраняем токен авторизации глобально
     * @param {String} token
     * @deprecated
     * */
    static setBearerToken(token) {
        this.bearerToken = token;
    }

    /**
     * Получаем сохраненный ранее токен авторизации
     * @return {String}
     * @deprecated
     * */
    static getBearerToken() {
        return this.bearerToken;
    }


    /**
     * @return {Boolean}
     * */
    static get hasBearerToken() {
        return Boolean(this.bearerToken);
    }


    /**
     * Общий конфиг прокси для BaseModel и BaseStore
     * */
    static globalDefaultProxyConfig() {
        return {
            class: BaseProxy
        }
    }


    constructor(config = {}) {
        super(config);

        /**
         * Состояние запроса
         * @member {Boolean}
         * @public
         * */
        this.isRequesting = false;

        /**
         * Является ли ошибка ошибкой валидации
         * @member {Boolean}
         * */
        this.isValidationError = false;

        /**
         * Является ли ошибка ошибкой сервера
         * @member {Boolean}
         * */
        this.isRemoteError = false;

        /**
         * Текст ошибки
         * @member {?String}
         * */
        this.errorMessage = null;

        /**
         * Данные ответа сервера
         * @member {?Object}
         * */
        this.responseData = null;
    }

    get baseUrl() {
        return this.initialConfig.baseUrl || '/';
    }

    get withCredentials() {
        return this.initialConfig.withCredentials || false;
    }

    get extraParams() {
        return this.initialConfig.extraParams || {};
    }

    get extraHeaders() {
        return this.initialConfig.extraHeaders || {};
    }

    get envelopeName() {
        return this.initialConfig.envelopeName || 'data';
    }

    get defaultErrorMessage() {
        return this.initialConfig.defaultErrorMessage || 'Unknown network error';
    }

    /**
     * @inheritDoc
     * @return {AxiosRequestConfig}
     *
     * */
    createAxios(config = {}) {
        if (config instanceof axios) {
            return config;
        }

        return axios.create({
            baseURL: this.baseUrl,
            withCredentials: this.withCredentials,
            ...config
        });
    }


    /**
     * @return {AxiosInstance} Экземпляр axios
     * */
    get axios() {
        if (!this._axiosInstance) {
            this._axiosInstance = this.createAxios();
        }
        return this._axiosInstance;
    }


    /**
     * Метод для парсинга полезной нагрузки из ответа сервера
     * @param {AxiosResponseSchema} axiosResponseSchema
     * @return {Object|Any} Данные
     * */
    parseResponseData(axiosResponseSchema) {
        return get(axiosResponseSchema, this.envelopeName, null);
    }


    /**
     *  Обработчик ошибок
     *  Добавляем в объект ошибки дополнительную информацию
     *
     *  @typedef {object} BaseProxyHandledError Расширенный(обработанный) экземпляр ошибки
     *  @property {Array} parsedErrors Массив ошибок которые удалось распарсить, если это ошибки
     *  @property {Boolean} isRemoteError Была ли ошибка на стороне сервера
     *  @property {Boolean} isValidationError Информирует что на стороне сервера не пройдена валидация
     *
     *  @param {AxiosErrorSchema} axiosErrorSchema
     *  */
    handleResponseError(axiosErrorSchema) {
        const defaultErrorMessage = 'Неизвестная ошибка связи';

        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if (axiosErrorSchema.response) {
            this.isRemoteError = true;
            this.isValidationError = axiosErrorSchema.response.status === 422;
            // В ответе есть сообщение
            this.errorMessage = get(axiosErrorSchema, 'response.data.message')
                || get(axiosErrorSchema, 'response.message')
                || defaultErrorMessage;
            // Если есть тело ответа
            this.responseData = this.parseResponseData(axiosErrorSchema.response);
            return;
        }

        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        if (axiosErrorSchema.request) {
            this.isRemoteError = true;
            this.errorMessage = defaultErrorMessage;
            return;
        }

        // Something happened in setting up the request that triggered an Error
        this.errorMessage = axiosErrorSchema.message || defaultErrorMessage;
    }


    /**
     * @private
     * */
    dropErrors() {
        this.errorMessage = null;
        this.isValidationError = false;
        this.isRemoteError = false;
    }


    async beforeRequest(requestConfig) {
        if (true === this.isRequesting) {
            console.log('Proxy is busy');
            return false;
        }
        this.dropErrors();
        return true;
    }

    async afterRequest(response) {
        return null;
    }


    get requestHeaders() {
        const headers = {...this.extraHeaders};
        if (this.constructor.hasBearerToken) {
            set(headers, 'Authorization', `Bearer ${this.constructor.bearerToken}`);
        }
        return headers;
    }


    get requestParams() {
        return this.extraParams;
    }


    /**
     * Общий метод выполнения запроса
     * @param {?AxiosRequestConfig} [extraConfig] - Конфигурация для запроса axios
     * @return {Promise}
     *
     * @fires BaseProxy#EVENT_REQUEST_START
     * @fires BaseProxy#EVENT_REQUEST_END
     * @fires BaseProxy#EVENT_REQUEST_SUCCESS
     * @fires BaseProxy#EVENT_REQUEST_FAILED
     * */
    async doRequest(extraConfig = {}) {
        const headers = this.requestHeaders;
        const params = this.requestParams;
        const config = {
            ...(!isEmpty(headers) ? {headers} : {})
            , ...(!isEmpty(params) ? {params} : {})
            , ...extraConfig
        };

        if (false === await this.beforeRequest(config)) {
            return false;
        }

        const self = this.constructor;
        const axiosInstance = this.axios;
        let response;

        try {
            this.isRequesting = true;
            this.emit(self.EVENT_REQUEST_START, config);
            response = await axiosInstance.request(config);
            this.responseData = this.parseResponseData(response);

            this.emit(self.EVENT_REQUEST_SUCCESS, this.responseData);
            return Promise.resolve(this.responseData);
        } catch (e) {
            this.handleResponseError(e);
            this.emit(self.EVENT_REQUEST_FAILED, e);
            return Promise.reject(e);
        } finally {
            this.isRequesting = false;
            this.emit(self.EVENT_REQUEST_END, response);
            await this.afterRequest(response);
        }
    }
}
