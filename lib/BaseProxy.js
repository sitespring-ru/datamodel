"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _axios = _interopRequireDefault(require("axios"));

var _lodash = require("lodash");

var _BaseClass = _interopRequireDefault(require("./BaseClass.js"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Базовый класс для запросов - обертка для axios с событиями и токеном авторизации
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 */
class BaseProxy extends _BaseClass.default {
  constructor(...args) {
    super(...args);

    _defineProperty(this, "_isRequesting", false);

    _defineProperty(this, "isValidationError", false);

    _defineProperty(this, "isRemoteError", false);

    _defineProperty(this, "errorMessage", void 0);

    _defineProperty(this, "responseData", void 0);

    _defineProperty(this, "defaultErrorMessage", 'Неизвестная ошибка связи');
  }

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
      withCredentials: false // default

    };
  }
  /**
   * @return {AxiosInstance} Экземпляр axios
   * */


  getAxiosInstance() {
    if (!this._axiosInstance) {
      this._axiosInstance = _axios.default.create(this.axiosDefaults());
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
    return (0, _lodash.get)($axiosResponseSchema, 'data', null);
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
    const defaultErrorMessage = 'Неизвестная ошибка связи'; // The request was made and the server responded with a status code
    // that falls out of the range of 2xx

    if ($axiosErrorSchema.response) {
      this.isRemoteError = true;
      this.isValidationError = $axiosErrorSchema.response.status === 422; // В ответе есть сообщение

      this.errorMessage = (0, _lodash.get)($axiosErrorSchema, 'response.data.message') || (0, _lodash.get)($axiosErrorSchema, 'response.message') || defaultErrorMessage; // Если есть тело ответа

      this.responseData = this.__parseResponseData($axiosErrorSchema.response);
      return;
    } // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js


    if ($axiosErrorSchema.request) {
      this.isRemoteError = true;
      this.errorMessage = defaultErrorMessage;
      return;
    } // Something happened in setting up the request that triggered an Error


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
    let requestConfig = { ...$extraRequestConfig
    };
    let response; // Добавляем заголовок авторизации

    if (self.hasBearerToken()) {
      const authToken = self.getBearerToken();
      (0, _lodash.set)(requestConfig, 'headers.Authorization', `Bearer ${authToken}`);
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

exports.default = BaseProxy;

_defineProperty(BaseProxy, "EVENT_REQUEST_START", 'requestStart');

_defineProperty(BaseProxy, "EVENT_REQUEST_END", 'requestEnd');

_defineProperty(BaseProxy, "EVENT_REQUEST_FAILED", 'requestFailed');

_defineProperty(BaseProxy, "EVENT_REQUEST_SUCCESS", 'requestSuccess');

_defineProperty(BaseProxy, "__bearerToken", null);