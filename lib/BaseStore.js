"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = require("lodash");

var _BaseProxy = _interopRequireDefault(require("./BaseProxy"));

var _BaseClass = _interopRequireDefault(require("./BaseClass"));

var _BaseModel = _interopRequireDefault(require("./BaseModel"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

/**
 * Базовый функционал хранилища
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 *
 */
class BaseStore extends _BaseClass.default {
  /**
   * @typedef {object} SorterDefinition Объект описания Сортировки
   * @property {string} property Название аттрибута
   * @property {?string} direction Один из [BaseStore.SORT_ASC,BaseStore.SORT_DESC]
   * */

  /**
   *  @typedef {object} FilterDefinition Объект описания Фильтра
   *  @property {string} property Название аттрибута
   *  @property {?*} value Значение для сравнения
   *  @property {?string} operator Один из ['>','<','=','like','>=','<=']
   * */

  /**
   * @typedef {object} PaginationDefinition Метаданные Пагинации
   * @property {number} pageCount Количество страниц
   * @property {number} currentPage Текущая полученная страница
   * @property {number} perPage Размер страницы
   * @property {number} totalCount Общее количество Моделей
   * */

  /**
   * Константы сортировки
   * */

  /**
   * Событие изменения сортировок
   * @event BaseStore#EVENT_SORTERS_CHANGE
   * @param {{
   * oldSorters: Object.<String,SorterDefinition>,
   * newSorters: Object.<String,SorterDefinition>
   *     }} data
   * */

  /**
   * Событие изменения фильтров
   * @event BaseStore#EVENT_FILTERS_CHANGE
   * @param {{
   * oldFilters: Object.<String,FilterDefinition>,
   * newFilters: Object.<String,FilterDefinition>
   * }} data
   * */

  /**
   * Событие изменения стека моделей
   * @event BaseStore#EVENT_MODELS_CHANGE
   * @param {BaseModel[]} $models
   * */

  /**
   * Событие удаления моделей из Хранилища
   * @event BaseStore#EVENT_MODELS_REMOVED
   * @param {BaseModel[]} $models
   * */

  /**
   * Событие изменения данных пагинации
   * @event BaseStore#EVENT_PAGINATION_CHANGE
   * @param {PaginationDefinition} $pagination
   * */

  /**
   * Событие получения данных с сервера
   * @event BaseStore#EVENT_FETCH
   * @param {AttributesMap[]} $data Объект данных
   * */

  /**
   * Стоит ли обрабатывать хранилище по странично
   * @type {Boolean}
   * */

  /**
   * Url для получения данных с удаленного сервера
   * @type {String}
   *  */

  /**
   * Обычно 20 моделей стандартный лимит, чтобы запросить все модели можно установить в 0
   * @type {Number}
   * */

  /**
   *  Автоматически сортировать модели при изменении стека сортировок
   *  @type {Boolean}
   *  */

  /**
   *  Автоматически фильтровать модели при изменении стека фильтров
   *  @type {Boolean}
   *  */

  /**
   * Setter для свойства filters для определения через конструктор, например
   * Persons.createInstance({
          filters: {
              byAge: {property: 'age'}
          }
      })
   * */
  set filters($filters) {
    this.setFilters($filters);
  }
  /**
   * Setter для свойства sorters для определения через конструктор, например
   * Persons.createInstance({
          sorters: {
              byAge: {property: 'age'}
          }
      })
   * */


  set sorters($sorters) {
    this.setSorters($sorters);
  }
  /**
   * Конфигурация Прокси для удаленных запросов
   * @type {Object}
   * */


  /**
   * @return {int} Количество моделей
   * */
  getCount() {
    return (0, _lodash.size)(this._innerModels);
  }
  /**
   * @return {Boolean}
   * */


  isEmpty() {
    return this.getCount() === 0;
  }
  /**
   * Состояние о том был ли сделан первый запрос к серверу
   * @return {Boolean}
   * */


  isFetched() {
    return this._isFetched;
  }
  /**
   * Количество Фильтров Хранилища
   * @return {Number}
   * */


  getFiltersCount() {
    return (0, _lodash.size)(this._innerFilters);
  }
  /**
   * Количество Сортировщиков Хранилища
   * @return {Number}
   * */


  getSortersCount() {
    return (0, _lodash.size)(this._innerSorters);
  }
  /**
   * @return {Boolean}
   * */


  hasSorters() {
    return this.getSortersCount() > 0;
  }
  /**
   * Возможно ли получить след страницу данных
   * @type {Boolean}
   * */


  hasNextPage() {
    if (!this.isPaginated) {
      return false;
    }

    return !this._isFetched || this._pagination.currentPage < this._pagination.pageCount;
  }

  /**
   * @param {Object} config Дополнительная конфигурация
   * */
  constructor(config = {}) {
    super(config);

    _defineProperty(this, "isPaginated", false);

    _defineProperty(this, "fetchUrl", null);

    _defineProperty(this, "pageSize", 20);

    _defineProperty(this, "autoSort", false);

    _defineProperty(this, "autoFilter", false);

    _defineProperty(this, "proxy", {
      class: _BaseProxy.default
    });

    _defineProperty(this, "model", {
      class: _BaseModel.default
    });

    _defineProperty(this, "_innerProxy", void 0);

    _defineProperty(this, "_innerModels", void 0);

    _defineProperty(this, "_innerSorters", void 0);

    _defineProperty(this, "_innerFilters", void 0);

    _defineProperty(this, "_isFetched", false);

    _defineProperty(this, "_isRequesting", false);

    _defineProperty(this, "_pagination", void 0);

    this._innerModels = [];
    this._innerFilters = {};
    this._innerSorters = {};
  }
  /**
   * Текущий стек моделей
   * @return {BaseModel[]}
   * */


  getModels() {
    if (!this.isPaginated) {
      return this._innerModels;
    }

    const start = (this._pagination.currentPage - 1) * this._pagination.perPage;
    const end = start + this._pagination.perPage;
    return this._innerModels.slice(start, end);
  }
  /**
   * Номер текущей страницы
   * @return {Integer}
   * */


  getPageNumber() {
    return this.getPagination().currentPage;
  }
  /**
   * Задаем номер страницы
   * @param {Integer} $number
   * */


  setPageNumber($number) {
    this.getPagination().currentPage = $number;
  }
  /**
   * Задаем новое значение размера страницы
   * @param {Integer} $value
   * */


  setPageSize($value) {
    this.pageSize = $value;

    this._refreshPagination();
  }
  /**
   * Добавление (обновление) Модели в Хранилище
   * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
   * @return {BaseModel} Экземпляр добавленной  модели
   * */


  loadModel(modelOrAttrs) {
    const {
      model
    } = this.__internalAdd(modelOrAttrs);

    if (this.isPaginated) {
      this._refreshPagination();
    }

    this.emit(this.constructor.EVENT_MODELS_CHANGE, [model]);
    return model;
  }
  /**
   * Добавление моделей в Хранилище пачкой
   * Смысл в том чтобы пересчитать пагинацию и вызвать события после всех добавлений один раз
   * @param {BaseModel[]|object[]} modelsOrAttrs
   * @return {BaseModel[]} Стек добавленных и обновленных Моделей
   * */


  loadModels(modelsOrAttrs) {
    let handledModels = [];
    let hasCreated = false;
    (0, _lodash.each)(modelsOrAttrs, def => {
      const {
        model,
        isCreated
      } = this.__internalAdd(def);

      handledModels.push(model);

      if (isCreated) {
        hasCreated = true;
      }
    });

    if (hasCreated) {
      // Обновляем пагинацию только если были добавлены Модели
      if (this.isPaginated) {
        this._refreshPagination();
      }
    }

    this.emit(this.constructor.EVENT_MODELS_CHANGE, handledModels);
    return handledModels;
  }
  /**
   * Добавляем Модель в хранилище без обновления пагинации, вызова события и пр.
   * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
   * @return {{model:BaseModel,isCreated:boolean}} Экземпляр добавленной или обновленной  модели + флаг добавления
   * @private
   * */


  __internalAdd(modelOrAttrs) {
    /** @type {BaseModel} */
    let model; // Был передан объект аттрибутов

    if (!(modelOrAttrs instanceof _BaseModel.default)) {
      model = _BaseModel.default.createInstance(this.model);
      model.setAttributes(modelOrAttrs);
    } else {
      model = modelOrAttrs;
    } // Если модель уже в хранилище, обновляем ее аттрибуты


    const modelInStore = this.findById(model.getId());

    if (modelInStore) {
      modelInStore.setAttributes(model.getAttributes());
      return {
        model: modelInStore,
        isCreated: false
      };
    }

    this._innerModels.push(model);

    return {
      model: model,
      isCreated: true
    };
  }
  /**
   * Удаление Модели из Хранилища по его ID
   * @param {BaseModel} model
   * @return {Boolean} true если модель была удалена
   * */


  remove(model) {
    const removeModels = (0, _lodash.remove)(this._innerModels, m => (0, _lodash.isEqual)(m.getId(), model.getId()));

    if (removeModels.length) {
      this.emit(this.constructor.EVENT_MODELS_REMOVED, removeModels); // Обновляем пагинацию только если были добавлены Модели

      if (this.isPaginated) {
        this._refreshPagination();
      }
    }

    return Boolean(removeModels.length);
  }
  /**
   * Поиск модели
   * @param {function|object|string} predicate Параметр для передачи в lodash`s find
   * Если это функция - она будет применена как есть, иначе будем считать что поиск идет по аттрибутам Моделей
   * @return {*}
   * */


  find(predicate) {
    const theFinder = (0, _lodash.isFunction)(predicate) ? predicate : model => {
      return (0, _lodash.isMatch)(model.getAttributes(), predicate);
    };
    return (0, _lodash.find)(this._innerModels, theFinder);
  }
  /**
   * Хелпер для поиска Модели по Id
   * @param {string|number} id
   * @return {BaseModel|null}
   * */


  findById(id) {
    return (0, _lodash.find)(this._innerModels, model => {
      return (0, _lodash.isEqual)(model.getId(), id);
    });
  }
  /**
   * Очистить Хранилище: сбрасываются текущие состояния загруженных данных
   * */


  clear() {
    this._isFetched = false;
    this._innerModels = [];

    if (this.isPaginated) {
      this._refreshPagination();
    }
  }
  /**
   * @return {PaginationDefinition}
   * */


  getPagination() {
    if (!this._pagination) {
      this._pagination = this._calculatePagination();
    }

    return this._pagination;
  }
  /**
   * Задаем новое значение пагинации
   * @param {PaginationDefinition} $pagination
   * */


  setPagination($pagination) {
    const oldPagination = { ...this.getPagination()
    };
    Object.assign(this._pagination, $pagination);

    if (!(0, _lodash.isEqual)(oldPagination, this._pagination)) {
      this.emit(this.constructor.EVENT_PAGINATION_CHANGE, {
        oldPagination,
        newPagination: this._pagination
      });
    }
  }
  /**
   * Получение данных с сервера через Прокси
   * @param {?object} config Дополнительный конфиг для запроса
   * @return {Promise}
   * */


  async fetch(config = {}) {
    const filtersParams = this._serializeFiltersToRequestParams();

    const sortersParams = this._serializeSortersToRequestParams();

    const pageParams = this.isPaginated ? this._serializePaginationToRequestParams() : {};
    const params = { ...filtersParams,
      ...sortersParams,
      ...pageParams
    };
    const url = this.fetchUrl;
    const requestConfig = {
      url,
      params,
      ...config
    };

    try {
      const responseData = await this.doRequest(requestConfig);

      const models = this._parseModelsFromResponseData(responseData);

      this.loadModels(models);

      if (this.isPaginated) {
        const pagination = this._parsePaginationFromResponse(responseData);

        this.setPagination(pagination);
      } // сохраняем флаг о том что запрос был успешно сделан


      this._isFetched = true;
      this.emit(this.constructor.EVENT_FETCH, responseData);
      return Promise.resolve(responseData);
    } catch (e) {
      return Promise.reject(e);
    }
  }
  /**
   * Перезагрузка Хранилища
   * @return {Promise}
   * */


  async reload() {
    this.clear();
    return this.fetch();
  }
  /**
   * @param {object} data Объект ответа от Прокси
   * @return {Object[]}
   * @protected
   * */


  _parseModelsFromResponseData(data) {
    // Предполагается что данные передаются в конверте data при пагинации или сразу стеком при ее отсутствии
    return this.isPaginated ? data.data : data;
  }
  /**
   * Логика обработки добавления Фильтра
   * @param {string} $id Идентификатор фильтра
   * @param {FilterDefinition} $filter
   * @return void;
   * */


  _internalApplyFilter($id, $filter) {
    if (!$filter.property) {
      throw new Error('Filter`s property must be set');
    }

    if (!$filter.operator || ['>', '<', '=', 'like', '>=', '<='].indexOf($filter.operator) < 0) {
      $filter.operator = '=';
    }

    if (!$filter.value) {
      $filter.value = true;
    }

    this._innerFilters[$id] = $filter;
  }
  /**
   * Добавляем фильтр
   * @param {string} $id Идентификатор фильтра
   * @param {FilterDefinition} $filter
   * */


  addFilter($id, $filter) {
    const $oldFilters = { ...this._innerFilters
    };

    this._internalApplyFilter($id, $filter);

    if (!(0, _lodash.isEqual)($oldFilters, this._innerFilters)) {
      this.emit(this.constructor.EVENT_FILTERS_CHANGE, {
        oldFilters: $oldFilters,
        newFilters: this._innerFilters
      });

      this._handleAutoFiltering();
    }
  }
  /**
   * @private
   * */


  _handleAutoFiltering() {
    if (this.autoFilter) {
      this.reload();
    }
  }
  /**
   * Изменяем весь стек фильтров одним вызовом
   * @param {Object.<string,FilterDefinition>} $filters
   * */


  setFilters($filters) {
    const oldFilters = { ...this._innerFilters
    };
    this._innerFilters = {};
    (0, _lodash.each)($filters, (filter, id) => this._internalApplyFilter(id, filter));

    if (!(0, _lodash.isEqual)(oldFilters, this._innerFilters)) {
      this.emit(this.constructor.EVENT_FILTERS_CHANGE, {
        oldFilters,
        newFilters: this._innerFilters
      });

      this._handleAutoFiltering();
    }
  }
  /**
   * Удаляем фильтр
   * @param {string} id Идентификатор фильтра
   * */


  removeFilter(id) {
    const $oldFilters = { ...this._innerFilters
    };
    delete this._innerFilters[id];

    if (!(0, _lodash.isEqual)($oldFilters, this._innerFilters)) {
      this.emit(this.constructor.EVENT_FILTERS_CHANGE, {
        oldFilters: $oldFilters,
        newFilters: this._innerFilters
      });

      this._handleAutoFiltering();
    }
  }
  /**
   * Статический геттер для совместимости
   * @return {Object.<String,FilterDefinition>}
   * */


  getFilters() {
    return this._innerFilters;
  }
  /**
   * Статический геттер для совместимости
   * @return {boolean}
   * */


  hasFilters() {
    return this.getFiltersCount() > 0;
  }
  /**
   * Сбросить все фильтры
   * */


  dropAllFilters() {
    this.setFilters({});
  }
  /**
   * Логика обработки добавления Сортировки
   * @param {string} $id Идентификатор фильтра
   * @param {SorterDefinition} $sorter
   * @return void;
   * */


  _internalApplySorter($id, $sorter) {
    if (!$sorter.property) {
      throw new Error("Sorter`s property must be set");
    }

    if (!$sorter.direction) {
      $sorter.direction = this.constructor.SORT_ASC;
    }

    if ([this.constructor.SORT_ASC, this.constructor.SORT_DESC].indexOf($sorter.direction) < 0) {
      throw new Error(`Invalid sorter's direction definition ${$sorter.direction}. Expect ${this.constructor.SORT_ASC} or ${this.constructor.SORT_DESC}`);
    }

    this._innerSorters[$id] = $sorter;
  }
  /**
   * Сбрасываем все сортировки
   * */


  dropAllSorters() {
    this.setSorters({});
  }
  /**
   * Задаем новую карту сортировщиков
   * @param {Object.<String,SorterDefinition>} $sorters
   * */


  setSorters($sorters) {
    const oldSorters = { ...this._innerSorters
    };
    this._innerSorters = {};
    (0, _lodash.each)($sorters, (sorter, id) => this._internalApplySorter(id, sorter));

    if (!(0, _lodash.isEqual)(oldSorters, this._innerSorters)) {
      this.emit(this.constructor.EVENT_SORTERS_CHANGE, {
        oldSorters,
        newSorters: this._innerSorters
      });

      this._handleAutoSorting();
    }
  }
  /**
   * Актуальная карта сортировок
   * @return {Object.<String,SorterDefinition>}
   * */


  getSorters() {
    return this._innerSorters;
  }
  /**
   * Добавляем Сортировку
   * @param {String} $id
   * @param {SorterDefinition} $sorter
   * @throws Error В случае некорректно переданного объекта Сортировки
   * */


  addSorter($id, $sorter) {
    const $oldSorters = { ...this._innerSorters
    };

    this._internalApplySorter($id, $sorter);

    if (!(0, _lodash.isEqual)($oldSorters, this._innerSorters)) {
      this.emit(this.constructor.EVENT_SORTERS_CHANGE, {
        oldSorters: $oldSorters,
        newSorters: this._innerSorters
      });

      this._handleAutoSorting();
    }
  }
  /**
   * Удаляем сортировку
   * @param {string} id Идентификатор сортировки
   * */


  removeSorter(id) {
    const oldSorters = { ...this._innerSorters
    };
    delete this._innerSorters[id];

    if (!(0, _lodash.isEqual)(oldSorters, this._innerSorters)) {
      this.emit(this.constructor.EVENT_SORTERS_CHANGE, {
        oldSorters,
        newSorters: this._innerSorters
      });

      this._handleAutoSorting();
    }
  }
  /**
   * @private
   * */


  _handleAutoSorting() {
    if (this.autoSort) {
      this.reload();
    }
  }
  /**
   * Обновляем данные о пагинации
   * */


  _refreshPagination() {
    this.setPagination(this._calculatePagination());
  }
  /**
   * @return {boolean} Поддерживает ли Хранилище пагинацию
   * */


  hasPagination() {
    return !!this.isPaginated;
  }
  /**
   * Сериализация Сортировщиков для запроса к серверу
   * Например: http://fetch.api?sort=-name,date
   *
   * @return {object}
   * @protected
   * */


  _serializeSortersToRequestParams() {
    const sortersString = (0, _lodash.map)(this._innerSorters, sorter => `${sorter.direction !== this.constructor.SORT_ASC ? '-' : ''}${sorter.property}`).join(",");
    return !(0, _lodash.isEmpty)(sortersString) ? {
      sort: sortersString
    } : {};
  }
  /**
   * Сериализация Фильтров в параметр запроса
   * Например: http://fetch.api?filters=[{"property":"date","operator":">","value":"2021-10-10"},...]
   *
   * @return {object}
   * @protected
   * */


  _serializeFiltersToRequestParams() {
    let filters = {};

    if (this.hasFilters()) {
      Object.assign(filters, {
        filters: (0, _lodash.values)(this._innerFilters)
      });
    }

    return filters;
  }
  /**
   * Сериализуем мета данные для запроса следующей страницы
   * @return {object} Объект для передача в request params
   * @protected
   * */


  _serializePaginationToRequestParams() {
    let params = {};

    if (this.hasNextPage()) {
      Object.assign(params, {
        limit: this.pageSize,
        page: this.getPageNumber()
      }); // Если мы уже получили первую порцию данных, то хотим след страницу

      if (this.isFetched()) {
        params.page++;
      }
    }

    return params;
  }
  /**
   * @param {object} response Объект ответа от Прокси
   * @return {?PaginationDefinition} Полученный объект или null
   * @protected
   * */


  _parsePaginationFromResponse(response) {
    let metas = (0, _lodash.get)(response, 'data._meta');

    if (!metas) {
      return null;
    }

    return {
      totalCount: metas.totalCount,
      currentPage: metas.currentPage,
      perPage: metas.perPage,
      pageCount: metas.pageCount
    };
  }
  /**
   * Вычисление пагинации
   * @return {PaginationDefinition}
   * @private
   * */


  _calculatePagination() {
    const totalCount = this.getCount();
    const perPage = this.pageSize; // Если Хранилище пустое, страница будет 1

    const pageCount = totalCount && Math.ceil(totalCount / perPage) || 1; // Исходим из предположения что мы находимся на последней странице

    const currentPage = pageCount;
    return {
      totalCount,
      currentPage,
      perPage,
      pageCount
    };
  }
  /**
   * Создание прокси для запросов в контексте Модели
   * @return {BaseProxy} Созданный экземпляр Прокси
   * */


  getProxy() {
    if (!this._innerProxy) {
      // Берем конфигурацию Прокси переданную в конструктор
      this._innerProxy = _BaseClass.default.createInstance(this.proxy);
    }

    return this._innerProxy;
  }
  /**
   * Выполнение запроса через прокси
   * Подразумевается что валидация перед запросом отдается на откуп логике приложения
   * @param {Object} config - Конфигурация для запроса axios
   *
   * @return {Promise}
   * */


  async doRequest(config) {
    const proxy = this.getProxy();

    try {
      this._isRequesting = true;
      const responseData = await proxy.doRequest(config);
      return Promise.resolve(responseData);
    } catch (e) {
      return Promise.reject(e);
    } finally {
      this._isRequesting = false;
    }
  }
  /**
   * @return {Array} Сериализованный стек данных из моделей
   * */


  toArray() {
    return (0, _lodash.map)(this._innerModels, model => model.getAttributes());
  }
  /**
   * Суммирование моделей по аттрибуту
   * @param {String} attributeName
   * @return {Number}
   * */


  sumBy(attributeName) {
    return (0, _lodash.sumBy)(this.toArray(), attributeName);
  }
  /**
   * Вызывает fetch() один раз и устанавливает флаг isFetched в true
   * при успешном ответе сервера
   * @return {Promise<BaseStore>} Экземпляр Хранилища после загрузки
   * */


  async ensureFetched() {
    if (!this.isFetched()) {
      await this.fetch();
    }

    return Promise.resolve(this);
  }

}

exports.default = BaseStore;

_defineProperty(BaseStore, "SORT_DESC", 'desc');

_defineProperty(BaseStore, "SORT_ASC", 'asc');

_defineProperty(BaseStore, "EVENT_SORTERS_CHANGE", 'sorterschange');

_defineProperty(BaseStore, "EVENT_FILTERS_CHANGE", 'filterschange');

_defineProperty(BaseStore, "EVENT_MODELS_CHANGE", 'modelschange');

_defineProperty(BaseStore, "EVENT_MODELS_REMOVED", 'modelsremoved');

_defineProperty(BaseStore, "EVENT_PAGINATION_CHANGE", 'paginationchange');

_defineProperty(BaseStore, "EVENT_FETCH", 'fetch');