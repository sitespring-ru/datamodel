"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _lodashEs = require("lodash-es");
var _BaseClass = _interopRequireDefault(require("./BaseClass.js"));
var _BaseModel = _interopRequireDefault(require("./BaseModel.js"));
var _BaseProxy = _interopRequireDefault(require("./BaseProxy.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Базовый функционал хранилища
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * 
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
  static SORT_DESC = 'desc';
  static SORT_ASC = 'asc';

  /**
   * Событие изменения сортировок
   * @event BaseStore#EVENT_SORTERS_CHANGE
   * @param {{
   * oldSorters: Object.<String,SorterDefinition>,
   * newSorters: Object.<String,SorterDefinition>
   *     }} data
   * */
  static EVENT_SORTERS_CHANGE = 'sorterschange';

  /**
   * Событие изменения фильтров
   * @event BaseStore#EVENT_FILTERS_CHANGE
   * @param {{
   * oldFilters: Object.<String,FilterDefinition>,
   * newFilters: Object.<String,FilterDefinition>
   * }} data
   * */
  static EVENT_FILTERS_CHANGE = 'filterschange';

  /**
   * Событие изменения стека моделей
   * @event BaseStore#EVENT_MODELS_CHANGE
   * @param {BaseModel[]} $models
   * */
  static EVENT_MODELS_CHANGE = 'modelschange';

  /**
   * Событие удаления моделей из Хранилища
   * @event BaseStore#EVENT_MODELS_REMOVED
   * @param {BaseModel[]} $models
   * */
  static EVENT_MODELS_REMOVED = 'modelsremoved';

  /**
   * Событие изменения данных пагинации
   * @event BaseStore#EVENT_PAGINATION_CHANGE
   * @param {PaginationDefinition} $pagination
   * */
  static EVENT_PAGINATION_CHANGE = 'paginationchange';

  /**
   * Событие получения данных с сервера
   * @event BaseStore#EVENT_FETCH
   * @param {AttributesMap[]} $data Объект данных
   * */
  static EVENT_FETCH = 'fetch';

  /**
   * Конструктор модели
   * @type {typeof BaseModel}
   * */
  model = _BaseModel.default;

  /**
   * @type {Boolean}
   * @readonly
   * */
  get isStore() {
    return true;
  }

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
  get filters() {
    return this.getFilters();
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
  get sorters() {
    return this.getSorters();
  }

  /**
   * Конфигурация для Прокси
   * @return {Object}
   * */
  getProxyConfig() {
    return _BaseProxy.default.globalDefaultProxyConfig();
  }
  /**
   * Конфигурация создаваемой Модели
   * @return {Object}
   * */
  getModelConfig() {
    return {
      class: this.model
    };
  }
  /**
   * @return {int} Количество моделей
   * @readonly
   *  */
  get count() {
    return (0, _lodashEs.size)(this._innerModels);
  }

  /**
   * @return {Boolean}
   * @readonly
   * */
  get isEmpty() {
    return this.count === 0;
  }

  /**
   * Состояние о том был ли сделан первый запрос к серверу
   * @return {Boolean}
   * @readonly
   * */
  get isFetched() {
    return this._isFetched;
  }

  /**
   * Количество Фильтров Хранилища
   * @return {Number}
   * */
  get filtersCount() {
    return (0, _lodashEs.size)(this._innerFilters);
  }

  /**
   * Количество Сортировщиков Хранилища
   * @return {Number}
   * */
  get sortersCount() {
    return (0, _lodashEs.size)(this._innerSorters);
  }

  /**
   * @return {Boolean}
   * */
  get hasSorters() {
    return this.sortersCount > 0;
  }

  /**
   * Возможно ли получить след страницу данных
   * @type {Boolean}
   * */
  get hasNextPage() {
    if (!this.isPaginated) {
      return false;
    }
    return !this._isFetched || this._pagination.currentPage < this._pagination.pageCount;
  }
  /**
   * Текущий стек моделей
   * @return {BaseModel[]}
   * */
  get models() {
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
  get pageNumber() {
    return this.pagination.currentPage;
  }

  /**
   * Задаем номер страницы
   * @param {Integer} $number
   * */
  set pageNumber($number) {
    this.pagination.currentPage = $number;
  }

  /**
   * @return {PaginationDefinition}
   * */
  get pagination() {
    if (!this._pagination) {
      this._pagination = this._calculatePagination();
    }
    return this._pagination;
  }

  /**
   * Задаем новое значение пагинации
   * @param {PaginationDefinition} $pagination
   *
   * @fires BaseStore#EVENT_PAGINATION_CHANGE
   * */
  set pagination($pagination) {
    const oldPagination = {
      ...this.pagination
    };
    Object.assign(this._pagination, $pagination);
    if (!(0, _lodashEs.isEqual)(oldPagination, this._pagination)) {
      this.emit(this.constructor.EVENT_PAGINATION_CHANGE, {
        oldPagination,
        newPagination: this._pagination
      });
    }
  }

  /**
   * @return {boolean} Поддерживает ли Хранилище пагинацию
   * @readonly
   * */
  get hasPagination() {
    return !!this.isPaginated;
  }

  /**
   * Создание прокси для запросов в контексте Модели
   * @return {BaseProxy} Созданный экземпляр Прокси
   * */
  get proxy() {
    if (!this._innerProxy) {
      // Берем конфигурацию Прокси переданную в конструктор
      this._innerProxy = this.constructor.createInstance(this.getProxyConfig());
    }
    return this._innerProxy;
  }

  /**
   * @return {Boolean}
   * */
  get isRequesting() {
    return this.proxy.isRequesting();
  }

  /**
   * Стоит ли обрабатывать хранилище по странично
   * @type {Boolean}
   * */
  isPaginated = false;

  /**
   * Url для получения данных с удаленного сервера
   * @type {String}
   *  */
  fetchUrl = null;

  /**
   * Обычно 20 моделей стандартный лимит, чтобы запросить все модели можно установить в 0
   * @type {Number}
   * */
  pageSize = 20;

  /**
   *  Автоматически сортировать модели при изменении стека сортировок
   *  @type {Boolean}
   *  */
  autoSort = false;

  /**
   *  Автоматически фильтровать модели при изменении стека фильтров
   *  @type {Boolean}
   *  */
  autoFilter = false;

  /**
   * @type {?BaseProxy}
   * @private
   * */
  _innerProxy = null;

  /**
   * Стек хранимый моделей
   * @type {BaseModel[]}
   * @private
   * */
  _innerModels = [];

  /**
   * Внутренняя карта сортировок по id
   * @type {Object.<String,SorterDefinition>}
   * @private
   * */
  _innerSorters = {};

  /**
   * Внутренняя карта фильтров по id
   * @type {Object.<String,FilterDefinition>}
   * @private
   * */
  _innerFilters = {};

  /**
   * Были ли получены данные с сервера
   * @type {Boolean}
   * */
  _isFetched = false;

  /**
   * Состояние ожидания Прокси
   * @type {Boolean}
   */
  _isRequesting = false;

  /**
   * @type {?PaginationDefinition}
   * @private
   * */
  _pagination = null;

  /**
   * @param {Object} config Дополнительная конфигурация
   * */
  constructor(config = {}) {
    super();
    this.constructor.configure(this, config);
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
   *
   * @fires BaseStore#EVENT_MODELS_CHANGE
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
   *
   * @fires BaseStore#EVENT_MODELS_CHANGE
   * */
  loadModels(modelsOrAttrs) {
    let handledModels = [];
    let hasCreated = false;
    (0, _lodashEs.each)(modelsOrAttrs, def => {
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
    let model;
    // Был передан объект аттрибутов
    if (!(modelOrAttrs instanceof this.model)) {
      model = _BaseClass.default.createInstance(this.getModelConfig());
      model.setAttributes(modelOrAttrs);
    } else {
      model = modelOrAttrs;
    }

    // Если модель уже в хранилище, обновляем ее аттрибуты
    const modelInStore = this.findById(model.getId());
    if (modelInStore) {
      modelInStore.setAttributes(model.getAttributes());
      modelInStore.commitChanges();
      return {
        model: modelInStore,
        isCreated: false
      };
    }
    this._innerModels.push(model);
    model.commitChanges();
    return {
      model,
      isCreated: true
    };
  }

  /**
   * Удаление Модели из Хранилища по его ID
   * @param {BaseModel} model
   * @return {Boolean} true если модель была удалена
   * */
  remove(model) {
    return Boolean(this.removeBy(m => (0, _lodashEs.isEqual)(m.getId(), model.getId())));
  }

  /**
   * Удаление моделей пачкой по предикату
   * @param {Function} predicate
   * @return {Number} Количество удаленных моделей
   *
   * @fires BaseStore#EVENT_MODELS_CHANGE
   * @fires BaseStore#EVENT_MODELS_REMOVED
   * */
  removeBy(predicate) {
    const removeModels = (0, _lodashEs.remove)(this._innerModels, predicate);
    if (removeModels.length) {
      this.emit(this.constructor.EVENT_MODELS_CHANGE, removeModels);
      this.emit(this.constructor.EVENT_MODELS_REMOVED, removeModels);

      // Обновляем пагинацию только если были добавлены Модели
      if (this.isPaginated) {
        this._refreshPagination();
      }
    }
    return removeModels.length;
  }

  /**
   * Поиск модели
   * @param {function|object|string} predicate Параметр для передачи в lodash`s find
   * Если это функция - она будет применена как есть, иначе будем считать что поиск идет по аттрибутам Моделей
   * @return {*}
   * */
  find(predicate) {
    const theFinder = (0, _lodashEs.isFunction)(predicate) ? predicate : model => {
      return (0, _lodashEs.isMatch)(model.getAttributes(), predicate);
    };
    return (0, _lodashEs.find)(this._innerModels, theFinder);
  }

  /**
   * Хелпер для поиска Модели по Id
   * @param {string|number} id
   * @return {BaseModel|null}
   * */
  findById(id) {
    return (0, _lodashEs.find)(this._innerModels, model => {
      return (0, _lodashEs.isEqual)(model.getId(), id);
    });
  }

  /**
   * Очистить Хранилище: сбрасываются текущие состояния загруженных данных
   * @fires BaseStore#EVENT_MODELS_CHANGE
   * @fires BaseStore#EVENT_MODELS_REMOVED
   * */
  clear() {
    this._isFetched = false;
    if (!this.isEmpty) {
      this.emit(this.constructor.EVENT_MODELS_CHANGE, this.models);
      this.emit(this.constructor.EVENT_MODELS_REMOVED, this.models);
      this._innerModels = [];
    }
    if (this.isPaginated) {
      this._refreshPagination();
    }
  }
  buildFetchUrl() {
    if (this.fetchUrl) {
      return this.fetchUrl;
    }
    return '/' + new this.model().entityName;
  }

  /**
   * Получение данных с сервера через Прокси
   * @param {?object} config Дополнительный конфиг для запроса
   * @return {Promise}
   *
   * @fires BaseStore#EVENT_FETCH
   * */
  async fetch(config = {}) {
    const filtersParams = this._serializeFiltersToRequestParams();
    const sortersParams = this._serializeSortersToRequestParams();
    const pageParams = this.isPaginated ? this._serializePaginationToRequestParams() : {};
    const params = {
      ...filtersParams,
      ...sortersParams,
      ...pageParams
    };
    const url = this.buildFetchUrl();
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
        this.pagination = this._parsePaginationFromResponse(responseData);
      }

      // сохраняем флаг о том что запрос был успешно сделан
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
   *
   * @fires BaseStore#EVENT_FILTERS_CHANGE
   * */
  addFilter($id, $filter) {
    const $oldFilters = {
      ...this._innerFilters
    };
    this._internalApplyFilter($id, $filter);
    if (!(0, _lodashEs.isEqual)($oldFilters, this._innerFilters)) {
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
   *
   * @fires BaseStore#EVENT_FILTERS_CHANGE
   * */
  setFilters($filters) {
    const oldFilters = {
      ...this._innerFilters
    };
    this._innerFilters = {};
    (0, _lodashEs.each)($filters, (filter, id) => this._internalApplyFilter(id, filter));
    if (!(0, _lodashEs.isEqual)(oldFilters, this._innerFilters)) {
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
   *
   * @fires BaseStore#EVENT_FILTERS_CHANGE
   * */
  removeFilter(id) {
    const $oldFilters = {
      ...this._innerFilters
    };
    delete this._innerFilters[id];
    if (!(0, _lodashEs.isEqual)($oldFilters, this._innerFilters)) {
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
    return this.filtersCount > 0;
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
   *
   * @fires BaseStore#EVENT_SORTERS_CHANGE
   * */
  setSorters($sorters) {
    const oldSorters = {
      ...this._innerSorters
    };
    this._innerSorters = {};
    (0, _lodashEs.each)($sorters, (sorter, id) => this._internalApplySorter(id, sorter));
    if (!(0, _lodashEs.isEqual)(oldSorters, this._innerSorters)) {
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
   *
   * @fires BaseStore#EVENT_SORTERS_CHANGE
   * */
  addSorter($id, $sorter) {
    const $oldSorters = {
      ...this._innerSorters
    };
    this._internalApplySorter($id, $sorter);
    if (!(0, _lodashEs.isEqual)($oldSorters, this._innerSorters)) {
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
   *
   * @fires BaseStore#EVENT_SORTERS_CHANGE
   * */
  removeSorter(id) {
    const oldSorters = {
      ...this._innerSorters
    };
    delete this._innerSorters[id];
    if (!(0, _lodashEs.isEqual)(oldSorters, this._innerSorters)) {
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
    this.pagination = this._calculatePagination();
  }

  /**
   * Сериализация Сортировщиков для запроса к серверу
   * Например: http://fetch.api?sort=-name,date
   *
   * @return {object}
   * @protected
   * */
  _serializeSortersToRequestParams() {
    const sortersString = (0, _lodashEs.map)(this._innerSorters, sorter => `${sorter.direction !== this.constructor.SORT_ASC ? '-' : ''}${sorter.property}`).join(",");
    return !(0, _lodashEs.isEmpty)(sortersString) ? {
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
        filters: (0, _lodashEs.values)(this._innerFilters)
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
    if (this.hasNextPage) {
      Object.assign(params, {
        limit: this.pageSize,
        page: this.pageNumber
      });
      // Если мы уже получили первую порцию данных, то хотим след страницу
      if (this.isFetched) {
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
    let metas = (0, _lodashEs.get)(response, 'data._meta');
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
    const totalCount = this.count;
    const perPage = this.pageSize;
    // Если Хранилище пустое, страница будет 1
    const pageCount = totalCount && Math.ceil(totalCount / perPage) || 1;
    // Исходим из предположения что мы находимся на последней странице
    const currentPage = pageCount;
    return {
      totalCount,
      currentPage,
      perPage,
      pageCount
    };
  }

  /**
   * Выполнение запроса через прокси
   * Подразумевается что валидация перед запросом отдается на откуп логике приложения
   * @param {Object} config - Конфигурация для запроса axios
   *
   * @return {Promise}
   * */
  async doRequest(config) {
    const proxy = this.proxy;
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
    return (0, _lodashEs.map)(this._innerModels, model => model.getAttributes());
  }

  /**
   * Суммирование моделей по аттрибуту
   * @param {String} attributeName
   * @return {Number}
   * */
  sumBy(attributeName) {
    return (0, _lodashEs.sumBy)(this.toArray(), attributeName);
  }

  /**
   * Вызывает fetch() один раз и устанавливает флаг isFetched в true
   * при успешном ответе сервера
   * @return {Promise<BaseStore>} Экземпляр Хранилища после загрузки
   * */
  async ensureFetched() {
    if (!this.isFetched) {
      await this.fetch();
    }
    return Promise.resolve(this);
  }

  /**
   * Iterable protocol
   * @see https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols
   * */
  [Symbol.iterator]() {
    // Use a new index for each iterator. This makes multiple
    // iterations over the iterable safe for non-trivial cases,
    // such as use of break or nested looping over the same iterable.
    let index = 0;
    return {
      // Note: using an arrow function allows `this` to point to the
      // one of `[@@iterator]()` instead of `next()`
      next: () => {
        if (index < this.count) {
          return {
            value: this.models[index++],
            done: false
          };
        } else {
          return {
            done: true
          };
        }
      }
    };
  }
}
exports.default = BaseStore;