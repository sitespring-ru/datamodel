import axios from "axios";
import {get, set} from "lodash";
import BaseClass from "./BaseClass.js";

/**
 * Базовый класс для запросов - обертка для axios с событиями и токеном авторизации
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
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
     * Состояние запроса
     * @member {Boolean}
     * @protected
     * */
    _isRequesting = false;

    /**
     * Является ли ошибка ошибкой валидации
     * @member {Boolean}
     * */
    isValidationError = false;

    /**
     * Является ли ошибка ошибкой сервера
     * @member {Boolean}
     * */
    isRemoteError = false;

    /**
     * Текст ошибки
     * @member {?String}
     * */
    errorMessage;

    /**
     * Данные ответа сервера
     * @member {?Object}
     * */
    responseData;

    /**
     * Сообщение об ошибке
     * @type {String}
     * */
    defaultErrorMessage = 'Неизвестная ошибка связи';

    /**
     * @private
     * */
    static __bearerToken = null;


    /**
     * Сохраняем токен авторизации глобально
     * @param {String} $token
     * */
    static setBearerToken($token) {
        this.__bearerToken = $token;
    }


    /**
     * Получаем сохраненный ранее токен авторизации
     * @return {String}
     * */
    static getBearerToken() {
        return this.__bearerToken;
    }


    /**
     * @return {Boolean}
     * */
    static hasBearerToken() {
        return !!this.__bearerToken;
    }


    /**
     * @inheritDoc
     * @return {AxiosRequestConfig}
     *
     * */
    axiosDefaults() {
        return {
            baseURL: '/',
            timeout: 0,
            headers: [],
            // `withCredentials` indicates whether or not cross-site Access-Control requests
            // should be made using credentials
            withCredentials: false, // default
        }
    }


    /**
     * @return {AxiosInstance} Экземпляр axios
     * */
    getAxiosInstance() {
        if (!this._axiosInstance) {
            this._axiosInstance = axios.create(this.axiosDefaults());
        }
        return this._axiosInstance;
    }


    /**
     * Метод для парсинга полезной нагрузки из ответа сервера
     * @param {AxiosResponseSchema} $axiosResponseSchema
     * @return {Object|Any} Данные
     * @protected
     * */
    __parseResponseData($axiosResponseSchema) {
        return get($axiosResponseSchema, 'data', null);
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
     *  @param {AxiosErrorSchema} $axiosErrorSchema
     *  @protected
     *  */
    __handleResponseError($axiosErrorSchema) {
        const defaultErrorMessage = 'Неизвестная ошибка связи';

        // The request was made and the server responded with a status code
        // that falls out of the range of 2xx
        if ($axiosErrorSchema.response) {
            this.isRemoteError = true;
            this.isValidationError = $axiosErrorSchema.response.status === 422;
            // В ответе есть сообщение
            this.errorMessage = get($axiosErrorSchema, 'response.data.message')
                || get($axiosErrorSchema, 'response.message')
                || defaultErrorMessage;
            // Если есть тело ответа
            this.responseData = this.__parseResponseData($axiosErrorSchema.response);
            return;
        }

        // The request was made but no response was received
        // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
        // http.ClientRequest in node.js
        if ($axiosErrorSchema.request) {
            this.isRemoteError = true;
            this.errorMessage = defaultErrorMessage;
            return;
        }

        // Something happened in setting up the request that triggered an Error
        this.errorMessage = $axiosErrorSchema.message || defaultErrorMessage;
    }


    /**
     * @private
     * */
    __dropErrors() {
        this.errorMessage = null;
        this.isValidationError = false;
        this.isRemoteError = false;
    }


    /**
     * @return {Boolean}
     * */
    isRequesting() {
        return Boolean(this._isRequesting);
    }


    /**
     * Общий метод выполнения запроса
     * @param {?AxiosRequestConfig} [$extraRequestConfig] - Конфигурация для запроса axios
     * @return {Promise}
     *
     * @fires BaseProxy#EVENT_REQUEST_START
     * @fires BaseProxy#EVENT_REQUEST_END
     * @fires BaseProxy#EVENT_REQUEST_SUCCESS
     * @fires BaseProxy#EVENT_REQUEST_FAILED
     * */
    async doRequest($extraRequestConfig = {}) {
        if (true === this.isRequesting()) {
            return Promise.reject('Proxy is busy...');
        }

        const self = this.constructor;
        const axiosInstance = this.getAxiosInstance();
        let requestConfig = {...$extraRequestConfig};
        let response;

        // Добавляем заголовок авторизации
        if (self.hasBearerToken()) {
            const authToken = self.getBearerToken();
            set(requestConfig, 'headers.Authorization', `Bearer ${authToken}`);
        }

        try {
            this.__dropErrors();
            this._isRequesting = true;

            this.emit(self.EVENT_REQUEST_START, requestConfig);

            response = await axiosInstance.request(requestConfig);
            this.responseData = this.__parseResponseData(response);

            this.emit(self.EVENT_REQUEST_SUCCESS, this.responseData);
            return Promise.resolve(this.responseData);
        } catch (e) {
            this.__handleResponseError(e);
            this.emit(self.EVENT_REQUEST_FAILED, e);

            return Promise.reject(e);
        } finally {
            this._isRequesting = false;
            this.emit(self.EVENT_REQUEST_END, response);
        }
    }
}
