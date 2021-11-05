import {isEmpty, find, isEqual, size, values, each, remove, bind, map, get, isFunction, isMatch, filter, reduce} from "lodash";
import BaseProxy from "./BaseProxy";
import BaseClass from "./BaseClass";
import BaseModel from "./BaseModel";
import {computed, reactive, ref} from "vue";

/**
 * Базовый функционал хранилища
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseStore extends BaseClass {
    static getDefaultConfig() {
        return {
            isPaginated: false,
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
     * @param {array} models Модели при инициализации
     * @param {Object} config Дополнительная конфигурация
     * */
    constructor(models = [], config = {}) {
        super(config);

        /**
         *  Полный стек моделей
         *  @type {Ref<BaseModel[]>}
         * */
        this.models = ref([]);

        /**
         * @type {ComputedRef<int>}
         * */
        this.count = computed(() => this.models.value.length);

        /**
         * @type {ComputedRef<boolean>}
         * */
        this.isEmpty = computed(() => isEmpty(this.models.value));

        /**
         *  Состояние о том был ли сделан первый запрос к серверу
         *  @type {Ref<boolean>}
         *  */
        this.isFetched = ref(false);

        /**
         * @type {Ref<boolean>} Реактивное состояние ожидания Прокси
         */
        this.isRequesting = ref(false);

        /**
         *  @typedef {object} FilterDefinition Объект описания Фильтра
         *  @property {string} property Название аттрибута
         *  @property {?*} value Значение для сравнения
         *  @property {?string} operator Один из ['>','<','=','like','>=','<=']
         *
         *  Внутренний стек фильтров, где ключи идентификаторы для последующего удаления
         *  @type {Ref<Object.<string, FilterDefinition>>}
         *  */
        this.filters = ref({});

        /**
         * @type {ComputedRef<int>} Количество Фильтров Хранилища
         * */
        this.filtersCount = computed(() => size(this.filters.value));

        /**
         * @typedef {object} SorterDefinition Объект описания Сортировки
         * @property {string} property Название аттрибута
         * @property {?string} direction Один из ['asc','desc']
         *
         * Внутренний стек сортировок, где ключи идентификаторы для последующего удаления
         * @type {Ref<SorterDefinition[]>}
         * */
        this.sorters = ref([]);

        /**
         * @type {ComputedRef<int>} Количество Сортировщиков Хранилища
         * */
        this.sortersCount = computed(() => size(this.sorters.value));

        if (this.isPaginated()) {
            this.__createPaginationRefs();
        }

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
     * @private
     * */
    __createPaginationRefs() {
        /**
         * @typedef {object} PaginationDefinition Метаданные Пагинации
         * @property {number} pageCount Количество страниц
         * @property {number} currentPage Текущая полученная страница
         * @property {number} perPage Размер страницы
         * @property {number} totalCount Общее количество Моделей
         *
         * @type {Proxy<PaginationDefinition>}
         * */
        this.pagination = reactive({
            pageCount: null,
            currentPage: 1,
            perPage: null,
            totalCount: null
        });

        /**
         * @type {ComputedRef<boolean>}
         * */
        this.hasNextPage = computed(() => !this.isFetched.value || this.pagination.currentPage < this.pagination.pageCount);
    }


    /**
     * Статический геттер для совместимости
     * @return {int}
     * */
    getCount() {
        return this.count.value;
    }


    /**
     * Добавление (обновление) Модели в Хранилище
     * @param {BaseModel|object} modelOrAttrs Модель или аттрибуты для создания
     * @return {BaseModel} Экземпляр добавленной  модели
     * */
    loadModel(modelOrAttrs) {
        const {model} = this.__internalAdd(modelOrAttrs);
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
     * */
    loadModels(modelsOrAttrs) {
        let handledModels = [];
        let hasCreated = false;
        each(modelsOrAttrs, (def) => {
            const {model, isCreated} = this.__internalAdd(def);
            handledModels.push(model);
            if (isCreated) {
                hasCreated = true;
            }
        });
        if (hasCreated) {
            // Обновляем пагинацию только если были добавлены Модели
            if (this.isPaginated()) {
                this._refreshPagination();
            }
        }
        return handledModels;
    }


    /**
     * Добавляем Модель в хранилище без обновления пагинации, вызова события и пр.
     * @param {BaseModel|object} model Модель или аттрибуты для создания
     * @return {{model:BaseModel,isCreated:boolean}} Экземпляр добавленной или обновленной  модели + флаг добавления
     * @private
     * */
    __internalAdd(model) {
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

        this.models.value = [...this.models.value, model];
        return {model, isCreated: true};
    }


    /**
     * Удаление Модели из Хранилища по его ID
     * @param {BaseModel} model
     * @return {Boolean} true если модель была удалена
     * */
    remove(model) {
        const removeModels = remove(this.models.value, (m) => isEqual(m.getId(), model.getId()));
        const result = Boolean(size(removeModels));
        if (true === result) {
            // Обеспечиваем реактивность
            this.models.value = [...this.models.value];
        }
        return result;
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
        return find(this.models.value, theFinder);
    }


    /**
     * Хелпер для поиска Модели по Id
     * @param {string|number} id
     * @return {BaseModel|null}
     * */
    findById(id) {
        return find(this.models.value, (model) => {
            return isEqual(model.getId(), id);
        });
    }


    /**
     * Очистить Хранилище: сбрасываются текущие состояния загруженных данных
     * */
    clear() {
        this.isFetched.value = false;
        this.models.value = [];
        if (this.isPaginated()) {
            this._refreshPagination()
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
            each(models, bind(this.__internalAdd, this));

            if (this.isPaginated()) {
                // Пробуем сначала распарсить из ответа, потом посчитать локально
                const pagination = this._parsePaginationFromResponse(responseData) || this._calculatePagination();
                Object.assign(this.pagination, pagination);
            }

            // сохраняем флаг о том что запрос был успешно сделан
            this.isFetched.value = true;
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
     * @param {object} response Объект ответа от Прокси
     * @return {Object[]}
     * @protected
     * */
    _parseModelsFromResponseData(response) {
        // Предполагается что данные передаются в конверте data при пагинации или сразу стеком при ее отсутствии
        return this.isPaginated() ? response.data : response;
    }


    /**
     * Добавляем фильтр
     * @param {string} id Идентификатор фильтра
     * @param {FilterDefinition} filter
     * */
    addFilter(id, filter) {
        if (!filter.property) {
            throw new Error('Filters property must be set');
        }
        if (!filter.operator || ['>', '<', '=', 'like', '>=', '<='].indexOf(filter.operator) < 0) {
            filter.operator = '=';
        }
        if (!filter.value) {
            filter.value = true;
        }
        this.filters.value = {
            ...this.filters.value,
            [id]: filter
        };
    }


    /**
     * Изменяем весь стек фильтров одним вызовом
     * @param {Object.<string,FilterDefinition>} filters
     * */
    setFilters(filters) {
        this.filters.value = {};
        each(filters, (filter, id) => this.addFilter(id, filter));
    }


    /**
     * Удаляем фильтр
     * @param {string} id Идентификатор фильтра
     * */
    removeFilter(id) {
        delete this.filters.value[id];
    }


    /**
     * Статический геттер для совместимости
     * @return {boolean}
     * */
    hasFilters() {
        return this.filtersCount.value > 0;
    }


    /**
     * Сбросить все фильтры
     * */
    dropAllFilters() {
        this.filters.value = {};
    }


    /**
     * @param {SorterDefinition[]} sorters
     * */
    setSorters(sorters) {
        this.dropAllSorters();
        each(sorters, bind(this.addSorter, this));
    }


    /**
     * Добавляем Сортировку
     * @param {SorterDefinition} sorter
     * @throws Error В случае некорректно переданного обьекта Сортировки
     * */
    addSorter(sorter) {
        if (!sorter.property) {
            throw new Error("Expect sorter`s property");
        }
        if (!sorter.direction) {
            sorter.direction = 'asc';
        }
        if (['asc', 'desc'].indexOf(sorter.direction) < 0) {
            throw new Error(`Invalid sorter's direction definition ${sorter.direction}. Expect 'asc' or 'desc'`);
        }
        this.sorters.value.push(sorter);
    }


    /**
     * Сбрасываем все сортировки
     * */
    dropAllSorters() {
        this.sorters.value = [];
    }


    /**
     * Обновляем данные о пагинации
     * */
    _refreshPagination() {
        Object.assign(this.pagination, this._calculatePagination());
    }


    /**
     * @return {boolean} Поддерживает ли Хранилище пагинацию
     * */
    isPaginated() {
        return this.getConfig('isPaginated') && this.getConfig('pageSize') > 0;
    }


    /**
     * Сериализация Сортировщиков для запроса к серверу
     * Например: http://fetch.api?sort=-name,date
     *
     * @return {object}
     * @protected
     * */
    _serializeSortersToRequestParams() {
        const sortersString = map(this.sorters.value, (sorter) => `${sorter.direction !== 'asc' ? '-' : ''}${sorter.property}`)
            .join(",");

        return !isEmpty(sortersString) ? {
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
        if (this.filtersCount.value) {
            Object.assign(filters, {
                filters: values(this.filters.value)
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
        if (this.hasNextPage.value) {
            Object.assign(params, {
                limit: this.getConfig('pageSize'),
                page: this.pagination.currentPage + 1
            });
        }
        return params;
    }


    /**
     * @param {object} response Объект ответа от Прокси
     * @return {?PaginationDefinition} Полученный объект или null
     * @protected
     * */
    _parsePaginationFromResponse(response) {
        let metas = get(response, 'data._meta');
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
        const totalCount = this.count.value;
        const perPage = this.getConfig('pageSize');
        // Если Хранилище пустое, страница будет 1
        const pageCount = totalCount && Math.ceil(totalCount / perPage) || 1;
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
            this.isRequesting.value = true;
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            return Promise.reject(e);
        } finally {
            this.isRequesting.value = false;
        }
    }


    /**
     * @return {Array} Сериализованный стек данных из моделей
     * */
    toArray() {
        return map(this.models.value, model => model.getNonEmptyAttributes());
    }
}