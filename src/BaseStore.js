import {each, every, find, get, isEmpty, isEqual, isFunction, isMatch, map, merge, remove, size, sumBy, unset} from "lodash-es";
import BaseClass from "./BaseClass.js";
import BaseModel from "./BaseModel.js";
import BaseProxy from "./BaseProxy.js";
import BaseFilter from "./BaseFilter.js";
import BaseSorter from "./BaseSorter.js";
import BasePagination from "./BasePagination.js";


/**
 * The Base Store functionality class
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @property {BaseModel} model The model this store is operating
 * @property {Boolean} isPaginated Стоит ли обрабатывать хранилище по странично
 * @property {String} fetchUrl Url для получения данных с удаленного сервера
 * @property {Number} pageSize Limit models per page, 20 by default
 * @property {Boolean} autoSort apply auto sorting, default false
 * @property {Boolean} autoFilter apply auto filtering, default false
 * @property {Boolean} isPaginated default false
 * @property {String} filterParam The request query param for filters data, default is 'filter'
 * @property {String} filterParamSeparator Default is ":"
 * @property {String} sortParam The request query param for sorting data, default is 'sort'
 * @property {String} searchParam The name of query param with search string, default is 'q'
 * @property {String} searchString The custom string value the store filtering is
 * @property {String} pageParam The name of query param with page number inforamtion
 * @property {String} limitParam The name of query param with page size information
 * @property {Object} modelDefaultConfig The data to be loaded to model during creation method default {}
 */
export default class BaseStore extends BaseClass {
    /**
     * Событие изменения сортировок
     * @event BaseStore#EVENT_SORTERS_CHANGE
     * @param {{
     * oldSorters: Array.<BaseSorter>,
     * newSorters: Array.<BaseSorter>
     *     }} data
     * */
    static EVENT_SORTERS_CHANGE = 'sorterschange';

    /**
     * Событие изменения фильтров
     * @event BaseStore#EVENT_FILTERS_CHANGE
     * @param {{
     * oldFilters: Array.<BaseFilter>,
     * newFilters: Array.<BaseFilter>
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
     * Событие получения данных с сервера
     * @event BaseStore#EVENT_FETCH
     * @param {AttributesMap[]} $data Объект данных
     * */
    static EVENT_FETCH = 'fetch';

    /**
     * When search string has been modified
     * @event BaseStore#EVENT_SEARCH_CHANGE
     * @param {String} searchString
     * */
    static EVENT_SEARCH_CHANGE = 'searchchange'


    /**
     * @param {Object} config Дополнительная конфигурация
     @param {Array} models Initail models data to be loaded to store     * */
    constructor(config = {}, models = []) {
        super(config);

        /**
         * Стек хранимый моделей
         * @type {BaseModel[]}
         * @private
         * */
        this._innerModels = [];

        /**
         * Внутренняя карта сортировок по id
         * @type {Array.<BaseSorter>}
         * @private
         * */
        this._innerSorters = [];

        /**
         * Filters stack
         * @type {Array.<BaseFilter>}
         * @private
         * */
        this._innerFilters = [];

        /**
         * Были ли получены данные с сервера
         * @type {Boolean}
         * */
        this._isFetched = false;


        /**
         * @type {?BasePagination}
         * @private
         * */
        this._pagination = null;

        /**
         * @type {?String} The query string for search requests
         * @private
         * */
        this._searchString = null;

        if (config.sorters) {
            this.setSorters(config.sorters)
        }

        if (config.filters) {
            this.setFilters(config.filters)
        }

        if (config.searchString) {
            this.setSearchString(config.searchString)
        }

        if (Array.isArray(models)) {
            this.loadModels(models)
        }

        /**
         * @private
         * */
        this.__isDirty = false;
    }

    get defaults() {
        return {
            ...super.defaults,
            pageSize: 20,
            isPaginated: false,
            autoSort: false,
            autoFilter: false,
            filterParam: 'filters',
            filterParamSeparator: ':',
            sortParam: 'sort',
            searchParam: 'q',
            searchString: '',
            modelDefaults: {},
            model: BaseModel,
            proxy: BaseProxy,
            pageParam: 'page',
            limitParam: 'limit'
        };
    }


    get model() {
        return this.initialConfig.model;
    }


    /**
     * @type {Boolean}
     * @readonly
     * */
    get isStore() {
        return true;
    }

    set filters(filters) {
        this.setFilters(filters);
    }

    /**
     * @getter
     * @return {Array.<BaseFilter>}
     * */
    get filters() {
        return this._innerFilters;
    }

    set sorters(sorters) {
        this.setSorters(sorters);
    }

    get sorters() {
        return this.getSorters();
    }


    /**
     * The data to be passed to created model in this store context
     * @return {Object}
     * */
    get modelDefaultConfig() {
        return this.initialConfig.modelDefaults
    };

    /**
     * @return {int} Количество моделей
     * @readonly
     *  */
    get count() {
        return size(this._innerModels);
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
        return size(this._innerFilters);
    }


    /**
     * Количество Сортировщиков Хранилища
     * @return {Number}
     * */
    get sortersCount() {
        return size(this._innerSorters);
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
        return this.pagination.hasNextPage;
    };


    /**
     * Текущий стек моделей
     * @return {BaseModel[]}
     * */
    get models() {
        return this._innerModels;
    }

    get hasSearchString() {
        return !isEmpty(this._searchString)
    }

    get searchString() {
        return this._searchString
    }

    set searchString(val) {
        this.setSearchString(val)
    }


    /**
     * @return {?BasePagination}
     * */
    get pagination() {
        if (this.isPaginated && !this._pagination) {
            this._pagination = new BasePagination({
                totalCount: this.count, pageSize: this.pageSize, currentPage: 1, pageCount: Math.ceil(this.count / this.pageSize) || 1
            })
        }
        return this._pagination;
    }

    set pagination(val) {
        if (val instanceof BasePagination) {
            this._pagination = val;
        } else if (!val) {
            this._pagination = null;
        } else {
            throw new Error('Expect instance of Pagination');
        }
    }


    /**
     * Создание прокси для запросов в контексте Модели
     * @return {BaseProxy} Созданный экземпляр Прокси
     * */
    get proxy() {
        if (!this.__innerProxy) {
            // Берем конфигурацию Прокси переданную в конструктор
            this.__innerProxy = this.configureProxy(this.initialConfig.proxy);
        }
        return this.__innerProxy;
    }

    set proxy(config) {
        this.__innerProxy = this.configureProxy(config);
    }


    configureProxy(config) {
        if (config instanceof BaseProxy) {
            return config;
        }
        if (typeof config === 'function') {
            return new config();
        }
        if (typeof config === 'object') {
            const ct = config.type || BaseProxy;
            unset(config, 'type');
            return new ct(config);
        }
    }


    /**
     * @return {Boolean}
     * */
    get isRequesting() {
        return this.proxy.isRequesting;
    }


    /**
     * Добавление (обновление) Модели в Хранилище
     * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
     * @return {BaseModel} Экземпляр добавленной  модели
     *
     * @fires BaseStore#EVENT_MODELS_CHANGE
     * */
    loadModel(modelOrAttrs) {
        const {model} = this.__internalAdd(modelOrAttrs);
        this.emit(this.constructor.EVENT_MODELS_CHANGE, [model]);
        this.__isDirty = true;
        return model;
    }


    /**
     * Добавление моделей в Хранилище пачкой
     * Смысл в том чтобы пересчитать пагинацию и вызвать события после всех добавлений один раз
     * @param {BaseModel[]|object[]} modelsOrAttrs
     * @param {{isPhantom:Boolean}} options
     * @return {BaseModel[]} Стек добавленных и обновленных Моделей
     *
     * @fires BaseStore#EVENT_MODELS_CHANGE
     * */
    loadModels(modelsOrAttrs, options = {}) {
        let handledModels = [];
        let hasCreated = false;
        each(modelsOrAttrs, (def) => {
            const {model, isCreated} = this.__internalAdd(def, options);
            handledModels.push(model);
            if (isCreated) {
                hasCreated = true;
            }
        });

        this.emit(this.constructor.EVENT_MODELS_CHANGE, handledModels);
        this.__isDirty = true;
        return handledModels;
    }


    /**
     * Добавляем Модель в хранилище без обновления пагинации, вызова события и пр.
     * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
     * @param {{isPhantom:Boolean}} options
     * @return {{model:BaseModel,isCreated:boolean}} Экземпляр добавленной или обновленной  модели + флаг добавления
     * @private
     * */
    __internalAdd(modelOrAttrs, options = {}) {
        /** @type {BaseModel} */
        let model;
        const {isPhantom} = options;
        // Был передан объект аттрибутов
        if (!(modelOrAttrs instanceof this.model)) {
            model = this.createModel(modelOrAttrs);
        } else {
            model = modelOrAttrs;
        }

        // Если модель уже в хранилище, обновляем ее аттрибуты
        const modelInStore = this.findById(model.getId());
        if (modelInStore) {
            modelInStore.setAttributes(model.getAttributes());
            modelInStore.commitChanges();
            modelInStore.isPhantom = !!isPhantom;
            return {model: modelInStore, isCreated: false};
        }


        model.store = this;
        model.commitChanges();
        model.isPhantom = !!isPhantom;
        this._innerModels.push(model);
        return {model, isCreated: true};
    }


    /**
     * Удаление Модели из Хранилища по его ID
     * @param {BaseModel} model
     * @return {Boolean} true если модель была удалена
     * */
    remove(model) {
        return Boolean(this.removeBy((m) => isEqual(m.getId(), model.getId())));
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
        const removeModels = remove(this._innerModels, predicate);
        if (removeModels.length) {
            this.emit(this.constructor.EVENT_MODELS_CHANGE, removeModels);
            this.emit(this.constructor.EVENT_MODELS_REMOVED, removeModels);
            this.__isDirty = true;
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
        const theFinder = isFunction(predicate) ? predicate : (model) => {
            return isMatch(model.getAttributes(), predicate);
        }
        return find(this._innerModels, theFinder);
    }


    /**
     * Хелпер для поиска Модели по Id
     * @param {string|number} id
     * @return {BaseModel|null}
     * */
    findById(id) {
        return find(this._innerModels, (model) => {
            return isEqual(model.getId(), id);
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
            this.__isDirty = true;
        }

        if (this.isPaginated) {
            this._pagination = null;
        }
    }


    buildFetchUrl() {
        if (this.initialConfig.fetchUrl) {
            return this.initialConfig.fetchUrl;
        }
        return (new this.model()).entityName;
    }


    /**
     * Получение данных с сервера через Прокси
     * @param {?object} config Дополнительный конфиг для запроса
     * @return {Promise}
     *
     * @fires BaseStore#EVENT_FETCH
     * */
    async fetch(config = {}) {
        const params = this.serializeMetasToRequestParams();
        if (this.isFetched && this.isPaginated) {
            params[this.pageParam]++; // want next page
        }

        const url = this.buildFetchUrl();
        // lodash merge to do deep merging
        const requestConfig = merge({method: 'GET'}, {url, params}, {...config});
        try {
            const responseData = await this.doRequest(requestConfig);
            const models = this.parseModelsFromResponseData(responseData);
            this.loadModels(models);

            if (this.isPaginated) {
                this.pagination = this.parsePagingFromResponse(responseData);
            }

            // сохраняем флаг о том что запрос был успешно сделан
            this._isFetched = true;
            this.commitChanges();
            this.emit(this.constructor.EVENT_FETCH, responseData);
            return Promise.resolve(responseData);
        } catch (e) {
            return Promise.reject(e);
        }
    }


    /**
     * Fetch one model of this store using store`s proxy without inner adding to store
     * @param {Number|String} id
     * @param {Object} extraConfig The extra configuration for model fetching
     * */
    async fetchOne(id, extraConfig = {}) {
        const model = new this.model({id}, {
            proxy: this.proxy
        });
        await model.fetch(extraConfig);
        return model;
    }


    /**
     * Make fetching request to populate models by array of ids
     * @param {Array} ids
     * @param {Object} config Extra config to be passed to [[fetch]] method
     * @return {Promise<Object>}
     * */
    async fetchModels(ids, config = {}) {
        if (!Array.isArray(ids)) {
            throw new Error('Expect ids to be array of id')
        }
        this.clear();
        this.addFilter({
            id: 'byIds',
            property: 'id',
            operator: BaseFilter.OPERATOR_IN,
            value: ids
        });

        return this.fetch(config).finally(() => {
            this.removeFilter('byIds');
            this.commitChanges();
        });
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
     * Save string for search requests
     * @param {String} value The query string
     * */
    setSearchString(value) {
        const oldValue = this._searchString;
        this._searchString = value.trim();
        if (!isEqual(oldValue, this._searchString)) {
            this.emit(this.constructor.EVENT_SEARCH_CHANGE, this._searchString);
            this.__isDirty = true;
        }
    }


    /**
     * @param {object} data Объект ответа от Прокси
     * @return {Object[]}
     * */
    parseModelsFromResponseData(data) {
        // Предполагается что данные передаются в конверте data при пагинации или сразу стеком при ее отсутствии
        return this.isPaginated ? data.data : data;
    }


    /**
     * Internal filter creation
     * @return void;
     * @param {String|Object|BaseFilter} filterDefs
     * */
    _internalApplyFilter(filterDefs) {
        const filter = BaseFilter.parseFromMixed(filterDefs)
        if (filter && this.hasFilter(filter.id)) {
            remove(this._innerFilters, {id: filter.id}); // delete filter with same id without triggering events
        }
        this._innerFilters.push(filter);
    }


    /**
     * Add filter to store
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * @param {BaseFilter} filter
     * */
    addFilter(filter) {
        const filters = [...this.filters];
        this._internalApplyFilter(filter);
        if (!isEqual(filters, this._innerFilters)) {
            this.emit(this.constructor.EVENT_FILTERS_CHANGE, {oldFilters: filters, newFilters: this._innerFilters});
            this._handleAutoFiltering();
            this.__isDirty = true;
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
     * Apply filters to store by batch in one call
     * @param {Array.<BaseFilter>} filters
     * @return void
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    setFilters(filters = []) {
        const oldFilters = [...this._innerFilters]; // save current filters stack
        this._innerFilters = []; // drop all filters
        filters.forEach(filter => this._internalApplyFilter(filter))

        if (!isEqual(oldFilters, this._innerFilters)) {
            this.emit(this.constructor.EVENT_FILTERS_CHANGE, {oldFilters, newFilters: this._innerFilters});
            this._handleAutoFiltering();
            this.__isDirty = true;
        }
    }


    /**
     * Remove filter by id
     * @param {string} filterId
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    removeFilter(filterId) {
        const oldFilters = [...this.filters];
        remove(this._innerFilters, {id: filterId});
        if (!isEqual(oldFilters, this._innerFilters)) {
            this.emit(this.constructor.EVENT_FILTERS_CHANGE, {oldFilters: oldFilters, newFilters: this._innerFilters});
            this._handleAutoFiltering();
            this.__isDirty = true;
        }
    }


    /**
     * Detele all filters
     * */
    removeAllFilters() {
        if (this.hasFilters) {
            const filters = [...this.filters];
            this._innerFilters = [];
            this.emit(this.constructor.EVENT_FILTERS_CHANGE, {oldFilters: filters, newFilters: []});
            this._handleAutoFiltering();
            this.__isDirty = true;
        }
    }


    /**
     * Find filter or return null
     * @param {String|Number} filterId
     * @return {?BaseFilter}
     * */
    getFilter(filterId) {
        return find(this._innerFilters, {id: filterId})
    }


    /**
     * Статический геттер для совместимости
     * @return {boolean}
     * */
    get hasFilters() {
        return this.filtersCount > 0;
    }


    /**
     * Check if filter exists
     * @param {String|Number} filterId
     * @return boolean
     * */
    hasFilter(filterId) {
        return !!this.getFilter(filterId)
    }


    /**
     * Find sorter or return null
     * @param {String|Number} sorterId
     * @return {?BaseSorter}
     * */
    getSorter(sorterId) {
        return find(this._innerSorters, {id: sorterId})
    }


    /**
     * Check if Sorter exists
     * @param {String|Number} sorterId
     * @return boolean
     * */
    hasSorter(sorterId) {
        return !!this.getSorter(sorterId)
    }


    /**
     * Логика обработки добавления Сортировки
     * @param {string|Object|BaseSorter} sorterDefs
     * @return void;
     * */
    _internalApplySorter(sorterDefs) {
        const sorter = BaseSorter.parseFromMixed(sorterDefs)
        if (sorter && this.hasSorter(sorter.id)) {
            remove(this._innerSorters, {id: sorter.id}); // delete with same id without triggering events
        }
        this._innerSorters.push(sorter);
    }


    /**
     * Сбрасываем все сортировки
     * */
    removeAllSorters() {
        if (this.hasSorters) {
            const sorters = [...this.sorters];
            this._innerSorters = [];
            this.emit(this.constructor.EVENT_SORTERS_CHANGE, {oldSorters: sorters, newSorters: []});
            this._handleAutoSorting();
            this.__isDirty = true;
        }
    }


    /**
     * Задаем новую карту сортировщиков
     * @param {BaseSorter[]} sorters
     *
     * @fires BaseStore#EVENT_SORTERS_CHANGE
     * */
    setSorters(sorters) {
        const oldSorters = [...this._innerSorters];
        this._innerSorters = [];
        sorters.forEach(sorter => this._internalApplySorter(sorter));
        if (!isEqual(oldSorters, this._innerSorters)) {
            this.emit(this.constructor.EVENT_SORTERS_CHANGE, {oldSorters, newSorters: this._innerSorters});
            this._handleAutoSorting();
            this.__isDirty = true;
        }
    }


    /**
     * Актуальная карта сортировок
     * @return {Array.<BaseSorter>}
     * */
    getSorters() {
        return this._innerSorters;
    }


    /**
     * Добавляем Сортировку
     * @param {BaseSorter} sorter
     * @throws Error В случае некорректно переданного объекта Сортировки
     *
     * @fires BaseStore#EVENT_SORTERS_CHANGE
     * */
    addSorter(sorter) {
        const sorters = [...this.sorters];
        this._internalApplySorter(sorter);
        if (!isEqual(sorters, this._innerSorters)) {
            this.emit(this.constructor.EVENT_SORTERS_CHANGE, {oldSorters: sorters, newSorters: this._innerSorters});
            this._handleAutoSorting();
            this.__isDirty = true;
        }
    }


    /**
     * Remove the sorter
     * @param {string} sorterId sorters id
     *
     * @fires BaseStore#EVENT_SORTERS_CHANGE
     * */
    removeSorter(sorterId) {
        const oldSorters = [...this.sorters];
        remove(this._innerSorters, {id: sorterId});
        if (!isEqual(oldSorters, this._innerSorters)) {
            this.emit(this.constructor.EVENT_SORTERS_CHANGE, {oldSorters, newSorters: this._innerSorters});
            this._handleAutoSorting();
            this.__isDirty = true;
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
     * Сериализация Сортировщиков для запроса к серверу
     * Например: http://fetch.api?sort=-name,date
     *
     * @return {object}
     * */
    serializeSortersToString() {
        return this.sorters.map(sorter => sorter.toString()).join(',')
    }


    /**
     * Serialize filters to request param object
     * @example
     *  http://fetch.api?filters=date>2021-10-10,...]
     *
     * @return {object}
     * */
    serializeFiltersToString() {
        return this.filters.map(filter => filter.toString()).join(this.filterParamSeparator);
    }


    /**
     * Parse data from request params that was previously serialized by  serializeMetasToRequestParams() method
     * @param {Object|String|URLSearchParams} params
     * */
    parseMetasFromRequestParams(params) {
        if (!(params instanceof URLSearchParams)) {
            params = new URLSearchParams(params)
        }
        if (params.has(this.filterParam)) {
            this.setFilters(params.get(this.filterParam).split(this.filterParamSeparator))
        }
        if (params.has(this.sortParam)) {
            this.setSorters(params.get(this.sortParam).split(','))
        }
        if (params.has(this.searchParam)) {
            this.setSearchString(params.get(this.searchParam))
        }
        if (this.isPaginated) {
            if (params.has(this.pageParam)) {
                this.pagination.currentPage = params.get(this.pageParam)
            }
        }
    }


    /**
     * @return {Object} The params to be sent with fetch request
     * */
    serializeMetasToRequestParams() {
        const params = {};
        if (this.hasFilters) {
            Object.assign(params, {
                [this.filterParam]: this.serializeFiltersToString()
            })
        }
        if (this.hasSorters) {
            Object.assign(params, {
                [this.sortParam]: this.serializeSortersToString()
            })
        }
        if (this.hasSearchString) {
            Object.assign(params, {
                [this.searchParam]: this.searchString
            })
        }
        if (this.isPaginated) {
            Object.assign(params, {
                [this.pageParam]: this.pagination.currentPage, [this.limitParam]: this.pagination.pageSize
            })
        }
        return params;
    }


    /**
     * Parsing pagination data from proxy`s response
     * @param {object} response
     * @return {?BasePagination}
     * @protected
     * */
    parsePagingFromResponse(response) {
        let metas = get(response, '_meta');
        if (!metas) {
            return null;
        }
        return new BasePagination({
            totalCount: metas.totalCount, currentPage: metas.currentPage, pageSize: metas.pageSize, pageCount: metas.pageCount
        })
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
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            return Promise.reject(e);
        }
    }


    /**
     * @return {Array} Сериализованный стек данных из моделей
     * */
    toArray() {
        return map(this._innerModels, model => model.getAttributes());
    }


    /**
     * Суммирование моделей по аттрибуту
     * @param {String} attributeName
     * @return {Number}
     * */
    sumBy(attributeName) {
        return sumBy(this.models, attributeName);
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
                    return {value: this.models[index++], done: false};
                } else {
                    return {done: true};
                }
            },
        };
    }


    /**
     * Create new model in store context using modelDefault configuration
     * @param {Object} extraData Extra data to be merged and passed to model`s constructor
     * @return {BaseModel} The created model
     * */
    createModel(extraData = {}) {
        const data = {...this.modelDefaultConfig, ...extraData};
        return new this.model(data, {
            proxy: this.proxy.constructor, // Model in store has the same proxy type
        });
    }

    commitChanges() {
        this.__isDirty = false;
    }


    get isDirty() {
        return this.__isDirty
            || !every(this.models, m => !m.isDirty);
    }
}
