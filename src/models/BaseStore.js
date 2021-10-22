import {isEmpty, without, find, isEqual, size, concat, values, each, filter, isFunction, reduceRight, reduce} from "lodash";
import BaseProxy from "./BaseProxy";
import BaseClass from "./BaseClass";
import BaseModel from "./BaseModel";

/**
 * Базовый функционал хранилища
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseStore extends BaseClass {
    /**
     * @event BaseStore#EVENT_MODEL_ADD Событие при добавлении модели
     * @property {BaseModel[]} models Стек задействованных Моделей
     * */
    static EVENT_MODEL_ADD = 'modeladd';

    /**
     * @event BaseStore#EVENT_MODEL_UPDATE Событие при изменении модели
     * @property {BaseModel[]} models Стек задействованных Моделей
     * */
    static EVENT_MODEL_UPDATE = 'modelupdate';

    /**
     * @event BaseStore#EVENT_MODEL_REMOVE Событие при удалении модели
     * @property {BaseModel} model Удаленная Модель
     * */
    static EVENT_MODEL_REMOVE = 'modelremove';

    /**
     * @event BaseStore#EVENT_MODEL_CLEAR Очистка всех Моделей из хранилища
     * */
    static EVENT_MODEL_CLEAR = 'modelclear';

    /**
     * @event BaseStore#EVENT_SORTERS_CHANGE Изменение текущих сортировок
     * @property {?object} sorters Обновленный стек сортировок или null если были сброшены
     * */
    static EVENT_SORTERS_CHANGE = 'sortchange';

    /**
     * @event BaseStore#EVENT_FILTERS_CHANGE Изменение текущих фильтров
     * @property {?object} filters Обновленный стек фильтров или null если были сброшены
     * */
    static EVENT_FILTERS_CHANGE = 'filterchange';

    /**
     * @event BaseStore#EVENT_PAGINATION_CHANGE Изменение данных пагинации
     * @property {PaginationDefinition} metas
     * */
    static EVENT_PAGINATION_CHANGE = 'metaschange';


    static getDefaultConfig() {
        return {
            // Является ли Хранилище удаленным
            isRemote: false,
            // Url для получения данных с удаленного сервера
            fetchUrl: null,
            // Стек внутренних сортировок
            sorters: {},
            // Стек внутренних фильтров
            filters: {},
            // Обычно 20 моделей стандартный лимит, чтобы запросить все модели можно установить в 0
            pageSize: 20,
            // Автоматически сортировать модели при изменении стека сортировок
            autoSort: false,
            // Автоматически фильтровать модели при изменении стека фильтров
            autoFilter: false,
            // Конфигурация Прокси для удаленных запросов
            proxy: {
                class: BaseProxy
            },
            model: {
                class: BaseModel
            }
        }
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {array} models Модели при инициализации
     * @param {Object} config Дополнительная конфигурация
     * */
    constructor(models = [], config = {}) {
        super(config);

        // Полный стек моделей до применения фильтров и сортировок
        this.__internalModels = [];
        // Состояние о том был ли сделан первый запрос к серверу
        this.__isFetched = false;

        /**
         * @typedef {object} PaginationDefinition Метаданные полученные из запроса
         * @property {number} pageCount Количество страниц
         * @property {number} currentPage Текущая полученная страница
         * @property {number} perPage Размер страницы
         * @property {number} totalCount Общее количество Моделей
         *
         * @type {PaginationDefinition}
         * */
        this.__pagination = {
            pageCount: null,
            currentPage: 1,
            perPage: null,
            totalCount: null
        }

        /**
         *  @typedef {object} FilterDefinition Объект описания Фильтра
         *  @property {string} property Название аттрибута
         *  @property {?string} value Значение для сравнения
         *  @property {?string} operator Один из ['>','<','=','like','>=','<=']
         *  @property {?function} [fn] Метод для кастомной фильтрации, получает Модель как параметр и должен вернуть true если проходит
         *
         *  Внутренний стек фильтров, где ключи идентификаторы для последующего удаления
         *  @type {Object.<string, FilterDefinition>}
         *  */
        this.__filters = {};

        /**
         * @typedef {object} SorterDefinition Объект описания Сортировки
         * @property {string} property Название аттрибута
         * @property {string} direction Один из ['asc','desc']
         *
         * Внутренний стек сортировок, где ключи идентификаторы для последующего удаления
         * @type {SorterDefinition[]}
         * */
        this.__sorters = [];

        if (models) {
            this.loadModels(models);
        }
        if (this.getConfig('filters')) {
            this.setFilters(this.getConfig('filters'));
        }
        if (this.getConfig('sorters')) {
            this.setSorters(this.getConfig('sorters'));
        }
    }


    /**
     * Получение списка Моделей отфильтрованных и отсортированных
     * @return {array}
     * */
    getModels() {
        return this.__internalModels;
    }


    /**
     * Добавление (обновление) Модели в Хранилище
     * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
     * @return {BaseModel} Экземпляр добавленной  модели
     *
     * @fires BaseStore#EVENT_MODEL_ADD Если Модель была добавлена
     * @fires BaseStore#EVENT_MODEL_UPDATE Если Модель уже была в Хранилище
     * */
    loadModel(modelOrAttrs) {
        const {model, isCreated} = this._internalAdd(modelOrAttrs);
        const self = this.constructor;
        const eventType = isCreated ? self.EVENT_MODEL_ADD : self.EVENT_MODEL_UPDATE;
        this.emit(eventType, {models: [model]});
        if (this.isPaginated()) {
            this._refreshPagination();
        }
        return model;
    }


    /**
     * Добавление моделей в Хранилище пачкой
     * Смысл в том чтобы пересчитать пагинацию и вызвать события после всех добавлений один раз
     * @param {BaseModel[]|object[]} modelsOrAttrs
     * @return {BaseModel[]} Стек добавленных и обновленных Моделей
     *
     * @fires BaseStore#EVENT_MODEL_ADD Если Модель была добавлена
     * @fires BaseStore#EVENT_MODEL_UPDATE Если Модель уже была в Хранилище
     * */
    loadModels(modelsOrAttrs) {
        let createdModels = [];
        let updatedModels = [];
        each(modelsOrAttrs, (def) => {
            const {model, isCreated} = this._internalAdd(def);
            isCreated && createdModels.push(model) || updatedModels.push(model);
        });
        if (createdModels.length) {
            // Обновляем пагинацию только если были добавлены Модели
            if (this.isPaginated()) {
                this._refreshPagination();
            }
            this.emit(this.constructor.EVENT_MODEL_ADD, {models: createdModels});
        }
        if (updatedModels.length) {
            this.emit(this.constructor.EVENT_MODEL_UPDATE, {models: updatedModels});
        }
        return [...createdModels, ...updatedModels];
    }


    /**
     * Добавляем Модель в хранилище без обновления пагинации, вызова события и пр.
     * @param {BaseModel|object} model Модель или аттрибуты для создания
     * @return {{model:BaseModel,isCreated:boolean}} Экземпляр добавленной или обновленной  модели + флаг добавления
     * @protected
     * */
    _internalAdd(model) {
        // Был передан объект аттрибутов
        if (!(model instanceof BaseModel)) {
            // Создаем Модель
            model = BaseClass.createInstance({...this.getConfig('model'), ...model});
        }

        // Модель еще не имеет ID, поэтому необходимо обеспечить уникальность в контексте Хранилища
        if (model.isPhantom()) {
            model.setId(model.constructor.generateId());
        } else {
            const modelInStore = this.findById(model.getId());
            if (modelInStore) {
                modelInStore.setAttributes(model.getAttributes());

                return {model, isCreated: false};
            }
        }

        this.__internalModels.push(model);
        return {model, isCreated: true};
    }


    /**
     * Удаление Модели из Хранилища
     * @param {BaseModel} model
     * */
    remove(model) {
        const modelInStore = this.findById(model.getId());
        if (!modelInStore) {
            return;
        }

        this.__internalModels = without(this.__internalModels, model);
        this.emit(this.constructor.EVENT_MODEL_REMOVE, {model});
    }


    /**
     * Поиск модели (по отфильтрованным и отсортированным данным)
     * @param {function|object|string} predicate Параметр для передачи в lodash`s find
     * @return {*}
     * */
    find(predicate) {
        return find(this.__internalModels, predicate);
    }


    /**
     * Хелпер для поиска Модели по Id
     * @param {string|number} id
     * @return {BaseModel|null}
     * */
    findById(id) {
        return find(this.__internalModels, (model) => isEqual(model.getId(), id));
    }


    /**
     * @return {number} Размер Хранилища
     * */
    getCount() {
        return size(this.__internalModels);
    }


    /**
     * Сброс состояния
     * */
    clear() {
        if (!isEmpty(this.__internalModels)) {
            this.__internalModels = [];
            this.emit(this.constructor.EVENT_MODEL_CLEAR, {});
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
        const pageParams = this.isPaginated() ? this._serializePaginationToRequestParams() : {};
        const params = {...filtersParams, ...sortersParams, ...pageParams};
        const url = this.getConfig('fetchUrl')
        const requestConfig = {url, params, ...config};
        try {
            const responseData = await this.doRequest(requestConfig);
            const models = this._parseModelsFromResponseData(responseData);
            each(models, this.loadModel);

            if (this.isPaginated()) {
                const pagination = this._parsePaginationFromResponse(responseData) || this._calculatePagination();
                Object.assign(this.__pagination, pagination);
            }

            // сохраняем флаг о том что запрос был успешно сделан
            this.__isFetched = true;
            return Promise.resolve(responseData);
        } catch (e) {
            return Promise.reject(e);
        }
    }


    /**
     * Перезагрузка Хранилища
     * */
    async reload() {
        this.__isFetched = false;
        this.__pagination = {
            pageCount: null,
            currentPage: 1,
            perPage: null,
            totalCount: null
        }
    }


    /**
     * @return {BaseModel[]}
     * @protected
     * */
    _parseModelsFromResponseData(responseData) {
        // Предполагается что данные передаются в конверте data
        let data = responseData.data;
        let parsedModels = [];
        const modelCtr = this.getConfig('model.class');
        each(data, (attrs) => {
            const model = new modelCtr(attrs);
            parsedModels.push(model);
        });
        return parsedModels;
    }


    /**
     * @return {boolean} Пустое ли Хранилище
     * */
    isEmpty() {
        return this.getCount() === 0;
    }


    /**
     * @return {boolean}Было ли Хранилище загружено
     * */
    isFetched() {
        return !!this.__isFetched;
    }


    /**
     * Добавляем фильтр
     * @param {string} id Идентификатор фильтра
     * @param {FilterDefinition} filter
     *
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    addFilter(id, filter) {
        const existFilter = this.__filters[id];
        if (existFilter && isEqual(existFilter, filter)) {
            return;
        }
        this.__filters[id] = filter;
        this.emit(this.constructor.EVENT_FILTERS_CHANGE, {filters: this.__filters})
    }


    /**
     * Изменяем весь стек фильтров одним вызовом
     * @param {Object.<string,FilterDefinition>} filters
     *
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    setFilters(filters) {
        this.__filters = filters;
        this.emit(this.constructor.EVENT_FILTERS_CHANGE, {filters: this.__filters})
    }


    /**
     * Удаляем фильтр
     * @param {string} id Идентификатор фильтра
     *
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    removeFilter(id) {
        const existFilter = this.__filters[id];
        if (!existFilter) {
            return;
        }
        delete this.__filters[id];
        this.emit(this.constructor.EVENT_FILTERS_CHANGE, {filters: this.__filters})
    }


    /**
     * @return {number}
     * */
    getFiltersCount() {
        return size(this.__filters);
    }


    /**
     * @return {boolean}
     * */
    hasFilters() {
        return this.getFiltersCount() > 0;
    }


    /**
     * Сбросить все фильтры
     * @fires BaseStore#EVENT_FILTERS_CHANGE
     * */
    dropAllFilters() {
        if (this.hasFilters()) {
            this.__filters = [];
            this.emit(this.constructor.EVENT_FILTERS_CHANGE, {filters: null});
        }
    }


    /**
     * Отфильтровать модели по текущим фильтрам
     * @return {BaseModel[]}
     * */
    filter() {
        let models = this.__internalModels;
        if (this.hasFilters()) {
            const filterStack = values(this.__filters);
            const predicate = (model) => {
                let isPassed = true;
                // Прогоняем Модель через каждый фильтр и если хотя бы один не прошел, Модель не попадает в выборку
                each(filterStack, (filterDef) => {
                    if (!this._applyFilter(model, filterDef)) {
                        isPassed = false;
                        return false;
                    }
                });
                return isPassed;
            }
            models = filter(models, predicate);
        }
        return models;
    }


    /**
     * @param {BaseModel} model
     * @param {FilterDefinition} filter
     * @return {boolean}
     * @protected
     * */
    _applyFilter(model, filter) {
        if (isFunction(filter.fn)) {
            return filter.fn(model);
        }
        const prop = filter.property;
        const value = filter.value || true;
        const operator = filter.operator;
        const compareValue = model.getAttribute(prop);
        switch (operator) {
            case '>':
                return compareValue > value;
            case '>=':
                return compareValue >= value;
            case '<':
                return compareValue < value;
            case '<=':
                return compareValue <= value;
            case 'like':
                return value.indexOf(compareValue) > -1;
            case '=':
                return isEqual(compareValue, value);
            default:
                return !!compareValue; // Кейс когда оператор не задан - проверяем что property существует
        }
    }


    /**
     * @return {boolean}
     * */
    isRemote() {
        return !!this.getConfig('isRemote');
    }


    /**
     * @param {SorterDefinition[]} sorters
     * */
    setSorters(sorters) {
        this.dropAllSorters();
        each(sorters, this.addSorter);
    }


    /**
     * Добавляем Сортировку
     * @param {SorterDefinition} sorter

     * @fires BaseStore#EVENT_SORTERS_CHANGE
     * */
    addSorter(sorter) {
        if (!sorter.property) {
            throw new Error("Expect sorter`s property");
        }
        if (!sorter.direction) {
            sorter.direction = 'asc';
        }
        if (['asc', 'desc'].indexOf(sorter.property) < 0) {
            throw new Error(`Invalid sorter's direction definition ${sorter.property}. Expect 'asc' or 'desc'`);
        }
        this.__sorters.push(sorter);
        this.emit(this.constructor.EVENT_SORTERS_CHANGE, {sorters: this.__sorters})
    }


    /**
     * Убираем Сортировку
     * @param {string} id Идентификатор Сортировщика
     *
     * @fires BaseStore#EVENT_SORTERS_CHANGE
     * */
    removeSorter(id) {
        const existSorter = this.__sorters[id];
        if (!existSorter) {
            return;
        }
        delete this.__sorters[id];
        this.emit(this.constructor.EVENT_SORTERS_CHANGE, {sorters: this.__sorters})
    }


    /**
     * Сбрасываем все сортировки
     * @fires  BaseStore#EVENT_SORTERS_CHANGE
     * */
    dropAllSorters() {
        if (this.hasSorters()) {
            this.__sorters = [];
            this.emit(this.constructor.EVENT_SORTERS_CHANGE, {sorters: null});
        }
    }


    /**
     * @return {boolean}
     * */
    hasSorters() {
        return !!this.getSortersCount();
    }


    /**
     * @return {number}
     * */
    getSortersCount() {
        return size(this.__sorters);
    }


    /**
     * Сортировка для локального хранилища
     * @return {BaseModel[]} Отсортированный стек моделей
     * */
    sort() {
        let modelsToSort = this.__internalModels;
        if (this.hasSorters()) {
            // Сортируем начиная с конца чтобы первый Сортировщик был первым
            modelsToSort = reduceRight(this.__sorters, (result, sorter) => {
                return result.sort(sorter);
            }, modelsToSort);
        }
        return modelsToSort;
    }


    /**
     * Применяем Сортировщик
     * @param {BaseModel} model1
     * @param {BaseModel} model2
     * @param {SorterDefinition} sorter
     * @return {number}
     * @see https://developer.mozilla.org/ru/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
     *
     * @protected
     * */
    _applySorter(model1, model2, sorter) {
        if (isFunction(sorter.fn)) {
            return sorter.fn(model1, model2);
        }
        const prop = sorter.property;
        const direction = sorter.direction || 'asc';
        const value1 = model1.getAttribute(prop);
        const value2 = model2.getAttribute(prop);
        if (isEqual(value1, value2)) {
            return 0;
        }
        return direction === 'asc' ? (value1 < value2 ? -1 : 1) : (value2 < value1 ? -1 : 1);
    }


    /**
     * @return {?number} Номер текущей страницы или null если нет пагинации
     * */
    getCurrentPageNumber() {
        return this.__pagination.currentPage;
    }


    /**
     * @return {?number} Количество страниц или null если нет пагинации
     * */
    getPagesCount() {
        return this.__pagination.pageCount;
    }


    /**
     * @return {PaginationDefinition} Текущий обьект пагинации
     * */
    getPagination() {
        return this.__pagination;
    }


    /**
     * Сброс пагинации
     * @protected
     * */
    _dropPagination() {
        this.__pagination = {
            pageCount: 0,
            currentPage: 1,
            perPage: this.getConfig('pageSize'),
            totalCount: 0
        }
    }


    /**
     * Обновляем данные о пагинации
     * @fires BaseStore#EVENT_PAGINATION_CHANGE
     * */
    _refreshPagination() {
        Object.assign(this.__pagination, this._calculatePagination());
        this.emit(this.constructor.EVENT_PAGINATION_CHANGE, {pagination: this.__pagination});
    }


    /**
     * @return {boolean} Есть ли след страница
     * */
    hasNextPage() {
        return this.isPaginated() && this.__pagination.currentPage < this.__pagination.pageCount;
    }


    /**
     * @return {boolean} Поддерживает ли Хранилище пагинацию
     * */
    isPaginated() {
        return this.getConfig('pageSize') > 0;
    }


    /**
     * Сериализация Сортировщиков для запроса к серверу
     * Например: http://fetch.api?sort=-name,date
     *
     * @return {object}
     * @protected
     * */
    _serializeSortersToRequestParams() {
        if (!this.hasSorters()) {
            return {};
        }

        const sortersString = reduce(this.__sorters, (result, sorter) => {
            result += `${sorter.direction !== 'asc' ? '-' : ''}${sorter.property}`;
            return result;
        }, '');

        return {
            sort: sortersString
        }
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
                filters: values(this.__filters)
            })
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
                limit: this.getConfig('pageSize'),
                page: this.getCurrentPageNumber() + 1
            });
        }
        return params;
    }


    /**
     * @param {object} responseData
     * @return {?PaginationDefinition} Полученный объект или null
     * @protected
     * */
    _parsePaginationFromResponse(responseData) {
        let metas = responseData['_meta'];
        if (!metas) {
            return null;
        }
        return {
            totalCount: metas.totalCount,
            currentPage: metas.currentPage,
            perPage: metas.perPage,
            pageCount: metas.pageCount
        }
    }


    /**
     * Вычисление пагинации
     * @return {PaginationDefinition}
     * @property
     * */
    _calculatePagination() {
        const totalCount = this.getCount();
        const perPage = this.getConfig('pageSize');
        const pageCount = Math.ceil(totalCount / perPage);
        // Исходим из предположения что мы находимся на последней странице
        const currentPage = pageCount;
        return {
            totalCount, currentPage, perPage, pageCount
        }
    }


    /**
     * Создание прокси для запросов в контексте Модели
     * @return {BaseProxy} Созданный экземпляр Прокси
     * */
    getProxy() {
        if (!this.__innerProxy) {
            // Берем конфигурацию Прокси переданную в конструктор
            this.__innerProxy = BaseClass.createInstance(this.getConfig('proxy'));
        }
        return this.__innerProxy;
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
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            return Promise.reject(e);
        }
    }
}