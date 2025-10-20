import {
    difference,
    every,
    find,
    forEach,
    get,
    has,
    head,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    isString,
    keys,
    mapValues,
    pick,
    reduce,
    remove,
    unset,
    values
} from "lodash-es";
import BaseClass from "./BaseClass.js";
import BaseProxy from "./BaseProxy.js";
import validate from "validate.js";
import dayjs from "dayjs";
import BaseStore from "./BaseStore.js";


/**
 * Базовая модель? поддерживающая аттрибуты, валидацию, прокси для запросов к серверу
 *
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @property {Boolean} isPhantom Имеет ли модель id в базе данных на стороне сервера
 * @property {?BaseStore} store Referenced store in which context this model belongs to
 */
export default class BaseModel extends BaseClass {
    /**
     * Фильтр преобразования значения для аттрибутов
     * Если метод, то передается первым аргументом значение для преобразования
     * Если массив, то первый элемент название другого фильтра и последующие элементы - доп. аргументы
     * @typedef {Function|Array|String} AttributeFilter
     * */

    /**
     * Карта аттрибутов, где ключи названия полей
     * @typedef {Object.<String,*>} AttributesMap
     * */

    /**
     * Обьект описания связей
     * @typedef {Object} RelationDefinition
     * @property {typeof BaseModel} model Конструктор Модели в случае связи hasOne
     * @property {?typeof BaseStore} store Конструктор Хранилища в случае связи hasMany или по умолчанию будет использовано BaseStore
     * @property {?String} foreignKey Внешний ключ для сортировки Хранилища
     * @property {("hasOne"|"hasMany")} type Тип связи
     * @property {?BaseProxy} proxy Proxy to be configured during relation creation or parent will be used
     * */

    /**
     * Событие смены значения аттрибута
     * @event BaseModel#EVENT_REQUEST_START
     * @param {AttributesMap} changed Объект измененных аттрибутов
     * */
    static EVENT_ATTRIBUTES_CHANGE = 'attributesChanged';

    /**
     * Событие получения данных с сервера
     * @event BaseModel#EVENT_FETCH
     * @param {AttributesMap} data Объект данных
     * */
    static EVENT_FETCH = 'fetch';

    /**
     * Событие создание новой модели на сервере
     * @event BaseModel#EVENT_CREATE
     * @param {AttributesMap} data Объект полученных аттрибутов
     * * */
    static EVENT_CREATE = 'create';

    /**
     * Событие сохранения данных на сервере
     * @event BaseModel#EVENT_SAVE
     * @param {AttributesMap} changed Объект сохраненных аттрибутов
     * */
    static EVENT_SAVE = 'save';

    /**
     * Событие удаления Модели на сервере
     * @event BaseModel#EVENT_DELETE
     * */
    static EVENT_DELETE = 'delete';

    /**
     * Событие изменения данных об ошибках валидации
     * @event BaseModel#EVENT_ERRORS_CHANGE
     * @param {Object} data Текущий стек ошибок
     * */
    static EVENT_ERRORS_CHANGE = 'errorschange';


    /**
     * @type {Boolean}
     * @readonly
     * */
    get isModel() {
        return true;
    }

    get entityName() {
        return this.initialConfig.entityName || 'base-model'
    }

    get idProperty() {
        return this.initialConfig.idProperty || 'id';
    }


    /**
     *  Конфигурация для настройки validate.js
     *  @return {Object}
     *  */
    get validationConfig() {
        return {
            // Since validators don't include the argument name in the error message the validate function prepends it for them.
            // This behaviour can be disabled by setting the fullMessages option to false.
            fullMessages: false
            , ...this.initialConfig.validate
        }
    };


    /**
     * Карта предопределенных фильтров для работы с аттрибутами
     * При расширении Модели можно добавлять свои фильтры для последующего использования
     * в аттрибутах
     * @return {Object.<String,AttributeFilter>}
     * */
    static filtersMap() {
        return {
            string: (rawValue) => (rawValue + '').trim(),
            int: (rawValue) => rawValue && Number.parseInt(rawValue) || null,
            float: (rawValue) => rawValue && Number.parseFloat(rawValue) || null,
            date: (rawValue) => rawValue !== null ? new Date(rawValue) : null,
            submitDate: (rawValue, format = 'YYYY-MM-DD') => rawValue && dayjs(rawValue).format(format) || null,
            submitTime: ['submitDate', 'HH:mm:ss'],
            submitDateTime: ['submitDate', 'YYYY-MM-DD HH:mm:ss'],
        }
    }


    /**
     * Карта действий для CRUD rest api
     * @return {Object.<String,String>}
     * */
    get urls() {
        const id = this.getId();
        return {
            fetch: `${this.entityName}/${id}`,
            create: `${this.entityName}`,
            save: `${this.entityName}/${id}`,
            delete: `${this.entityName}/${id}`,
            ...this.initialConfig.urls
        }
    }


    /**
     * Карта глаголов для CRUD rest api
     * @return {Object.<String,String>}
     * */
    get verbs() {
        return {
            fetch: 'GET',
            create: 'POST',
            save: 'PUT',
            delete: 'DELETE',
            ...this.initialConfig.verbs
        }
    }


    /**
     * Конфигурация аттрибутов Модели c дефолтными значениями
     * @return {AttributesMap}
     * */
    get fields() {
        return {
            id: null
        }
    }


    /**
     * The fields name wich should be sended in each request regardless there are dirty or not
     * @return {String[]}
     * */
    get alwaysDirtyFields() {
        return []
    }


    /**
     * Массив полей, которые могут быть изменены с помощью метода setAttributes
     * */
    get safeAttributes() {
        return keys(this.fields);
    }


    /**
     * Правила валидации
     * По умолчанию используется библиотека https://validatejs.org/
     * @see https://validatejs.org/
     * @example
     * get rules() {
     *         return {
     *             id: {numericality: true}
     *         }
     *     }
     * */
    get rules() {
        return {}
    }


    /**
     * Карта фильтров аттрибутов для установки значений
     * @return {Object.<String,AttributeFilter>}
     * */
    get innerFilters() {
        return {}
    }


    /**
     * Карта фильтров аттрибутов для отправки на сервер
     * @return {Object.<String,AttributeFilter>}
     * */
    get submitFilters() {
        return {}
    }


    /**
     * Карта связей для автоматической обработки данных
     * @return {Object.<String,RelationDefinition>}
     * */
    get relations() {
        return {}
    }


    /**
     * Если связь
     * */
    getHasRelation(attrName) {
        return Boolean(typeof this.relations[attrName] !== "undefined");
    }


    /**
     * Применяем фильтр для аттрибута
     * @param {AttributeFilter|null} filterDef
     * @param {*} rawValue
     * @param {?Array} args Дополнительные аргументы для передачи в метод фильтра
     * @return {*} Значение после обработки фильтра
     * */
    applyFilter(filterDef, rawValue, args = []) {
        if (!filterDef) {
            return rawValue;
        }
        // Кейс когда передано название фильтра из карты предопределенных фильтров
        if (isString(filterDef)) {
            return this.applyFilter(this.constructor.filtersMap()[filterDef], rawValue, args);
        }
        // Кейс когда передан метод напрямую
        if (isFunction(filterDef)) {
            return filterDef.apply(this, [rawValue, ...args]);
        }
        // Кейс когда передан массив, первый элемент которого название фильтра и доп. аргументы
        if (isArray(filterDef)) {
            return this.applyFilter(filterDef[0], rawValue, filterDef.slice(1));
        }
        throw new Error(`Invalid filter type {name}`);
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {object} attributes Аттрибуты модели
     * @param {Object} config Конфиг для передачи в родительский конструктор
     * */
    constructor(attributes = {}, config = {}) {
        super(config);

        /**
         * @type {Boolean} Wheter model assume act as phantom: not fetched from server
         * */
        this.isPhantom = get(config, 'isPhantom', true);

        /**
         * @type {?BaseModel} The reference on parent model during {BaseModel.__createRelation} method
         * @see BaseModel.__createRelation
         * */
        this.relatedParent = get(config, 'relatedParent', null);

        /**
         * Сохраненные данные
         * @type {AttributesMap}
         * @protected
         * */
        this._savedAttributes = {};

        // Задаем начальные данные
        // Object.assign(this._savedAttributes, this.fields);

        /**
         * Данные, которые были изменены с момента последнего коммита
         * @type {AttributesMap}
         * @protected
         * */
        this._dirtyAttributes = {};

        /**
         * Модель была удалена на стороне сервера
         * @type {Boolean}
         * @protected
         * */
        this.isDeleted = false;

        /**
         * Индексированный объект ошибок
         * @type {AttributesMap}
         * */
        this.errors = {};

        /**
         * Стек кешированных связанных Моделей/Хранилищ
         * @type {Object<String,(BaseModel|BaseStore)>}
         * @private
         * */
        this.__cachedRelations = {};

        /**
         * Calculate initial data
         * @private
         * */
        this.__initialData = {
            ...this.fields
            , [this.idProperty]: this.constructor.generateId() // Auto generate id
            , ...attributes
        };

        // Create magic props
        this.__createMagicProps();

        this.loadData(this.__initialData);
        this.commitChanges();

        /**
         * Stack of stores which this model belongs to for handling events
         * @type {Array<BaseStore>}
         * */
        this.__belongsToStores = [];
    }


    /**
     * @type {Boolean} Whether the model act as another model relation
     * */
    get isRelated() {
        return Boolean(this.relatedParent)
    }

    /**
     * Создаем геттеры и сеттеры для аттрибутов
     * @protected
     * */
    __createMagicProps() {
        forEach(keys(this.fields), fieldName => this.__createFieldGetter(fieldName));
        forEach(this.relations, (relationConfig, relationName) => this.__createRelation(relationName, relationConfig))
    }


    __createFieldGetter(attrName) {
        // Property alreasy exists
        if (typeof this[attrName] !== "undefined") {
            return;
        }

        // Обычный геттер/сеттер для аттрибута
        Object.defineProperty(this, attrName, {
            get() {
                return this.getAttribute(attrName);
            },
            set(v) {
                this.setAttribute(attrName, v);
            }
        })
    }


    /**
     * @protected
     * */
    __createRelation(name, config) {
        // Property alreasy exists
        if (typeof this[name] !== "undefined") {
            return;
        }

        const {type, model: modelConstructor, foreignKey, store: storeConstructor, proxy} = config;

        if (type === 'hasOne') {
            Object.defineProperty(this, name, {
                get() {
                    if (!this.__cachedRelations[name]) {
                        this.__cachedRelations[name] = new modelConstructor({}, {
                            isPhantom: this.isPhantom,
                            relatedParent: this,
                            proxy: proxy || this.proxy.constructor
                        });
                    }
                    return this.__cachedRelations[name];
                },
                set(model) {
                    if (!(model instanceof modelConstructor)) {
                        throw new Error(`${name} relation expect ${modelConstructor.name} instance, ${model.constructor.name} given`);
                    }
                    this.__cachedRelations[name] = model;
                    model.relatedParent = this
                    if (foreignKey) {
                        this.setAttribute(foreignKey, model.getId());
                    }
                }
            });
            return;
        }

        if (type === 'hasMany') {
            const storeConstructorReal = storeConstructor || BaseStore;
            Object.defineProperty(this, name, {
                get() {
                    if (!this.__cachedRelations[name]) {
                        this.__cachedRelations[name] = new storeConstructorReal({
                            proxy: proxy || this.proxy.constructor,
                            model: modelConstructor,
                            filters: [{
                                property: foreignKey,
                                value: this.getId()
                            }]
                        });
                    }
                    return this.__cachedRelations[name];
                },
                set(store) {
                    if (!(store instanceof storeConstructorReal)) {
                        throw new Error(`${name} relation expect ${storeConstructorReal.name} instance, ${store.constructor.name} given`);
                    }
                    this.__cachedRelations[name] = store;
                }
            });
            return;
        }

        throw new Error(`Invalid type ${type}`);
    }


    /**
     * Применить текущие изменения как сохраненные
     * */
    commitChanges() {
        Object.assign(this._savedAttributes, this._dirtyAttributes);
        this._dirtyAttributes = {};
    }


    /**
     * Shortland for this.getAttributes() method
     * */
    get attributes() {
        return this.getAttributes();
    }

    /**
     * Shortland for this.setAttributes() method
     * */
    set attributes(attrs) {
        this.setAttributes(attrs);
    }


    /**
     * Список названий аттрибутов, которые были изменены с момента последнего коммита и отличаются от сохраненных
     * @return {String[]}
     * */
    get dirtyAttributesNames() {
        return reduce(this._dirtyAttributes, (result, value, key) => {
            return isEqual(value, this._savedAttributes[key]) ? result : result.concat(key);
        }, []);
    }


    /**
     * Является ли модель измененной (требует сохранения на стороне сервера)
     * @return {Boolean}
     * */
    get isDirty() {
        return this.dirtyAttributesNames.length > 0;
    }

    /**
     * Dirty state with relation data
     * @return {Boolean}
     * */
    get isDirtyWithRelated() {
        return this.isDirty || !every(this.__cachedRelations, r => !r.isDirty)
    }


    /**
     * @return {Any}
     * */
    getId() {
        return this.getAttribute(this.idProperty);
    }


    /**
     * Генерация id для фантомной Модели
     * */
    static generateId() {
        if (!this.__generatedLastID) {
            this.__generatedLastID = 0;
        }
        return `${this.name}-${++this.__generatedLastID}`;
    }


    /**
     * Преобразование данных для отправки на сервер
     * @param {?Array} [names] Список аттрибутов или все
     * @param {Boolean} withRelated Wheter collect relation data too
     * @return {Object.<String, *>}
     * */
    getSubmitValues(names = null, withRelated = false) {
        const attrs = this.getAttributes(names);
        const filters = this.submitFilters;
        const values = mapValues(attrs, (value, attr) => this.applyFilter(filters[attr], value));

        if (withRelated) {
            forEach(this.__cachedRelations, (relation, name) => {
                values[name] = relation.getSubmitValues(undefined, true)
            })
        }
        return values;
    }


    /**
     * Сохраненные данные
     * @param {?Array} [names] Имена нужных аттрибутов или будут возвращены все
     * @return {object}
     * */
    getSavedAttributes(names) {
        return names ? pick(this._savedAttributes, names) : this._savedAttributes;
    }


    /**
     * @param {string} name Имя аттрибута
     * @return {*} Значение аттрибута
     * */
    getSavedAttribute(name) {
        if (!has(this._savedAttributes, name)) {
            throw new Error(`Unknown attribute name "{name}"`);
        }
        return this._savedAttributes[name];
    }


    /**
     * @param {string} name Имя аттрибута
     * @param {?Boolean} [isDirty] По умолчанию true
     * @return {*} Значение аттрибута
     * @alias get
     * */
    getAttribute(name, isDirty = true) {
        const attrs = isDirty ? {...this._savedAttributes, ...this._dirtyAttributes} : this._savedAttributes;
        if (!has(attrs, name)) {
            throw new Error(`Unknown attribute name "${name}"`);
        }
        return attrs[name];
    }


    /**
     * @param {?Array} [names] Имена нужных аттрибутов или будут возвращены все
     * @param {?Boolean} [isDirty] По умолчанию true
     * @return {object} Текущие аттрибуты
     * */
    getAttributes(names = null, isDirty = true) {
        const attrs = isDirty ? {...this._savedAttributes, ...this._dirtyAttributes} : this._savedAttributes;
        return isArray(names) ? pick(attrs, names) : attrs;
    }


    /**
     * Mark attribute as dirty
     * @param {string} attrName The name of attribute to be marked as dirty
     * */
    markAttributeDirty(attrName) {
        Object.assign(this._dirtyAttributes, {
            [attrName]: this.getAttribute(attrName)
        })
    }


    /**
     * Shortland helper for [this.getSavedAttributes] method
     * to use in reactive views directly
     * @return {object}
     * */
    get() {
        return this.getSavedAttributes();
    }


    /**
     * @return void
     * @private
     * */
    __innerSetAttributes(attrs) {
        const filters = this.innerFilters;
        const safeAttrs = pick(attrs, this.safeAttributes);
        const withFilters = mapValues(safeAttrs, (value, key) => this.applyFilter(filters[key], value));
        Object.assign(this._dirtyAttributes, withFilters);
    }


    /**
     * Parse rawData from raw outside (e.g. proxy response) to inner fields map
     * @param {mixed} rawData
     * @return {Object}
     * */
    readData(rawData) {
        return rawData
    }


    /**
     * Load data to model with relations data and without triggering change event
     * @param {Object} rawData
     * */
    loadData(rawData) {
        const data = this.readData(rawData)
        const attrs = pick(data, keys(this.fields));
        this.__innerSetAttributes(attrs);

        const relatedData = pick(data, keys(this.relations));
        this.__loadRelationsData(relatedData)
    }


    /**
     * Новые значения аттрибутов
     * @param {AttributesMap} attrs
     * */
    setAttributes(attrs) {
        const beforeAttrs = this.dirtyAttributesNames;
        this.__innerSetAttributes(attrs);
        const afterAttrs = this.dirtyAttributesNames;
        const diff = difference(afterAttrs, beforeAttrs);
        if (diff.length > 0) {
            this.emit(this.constructor.EVENT_ATTRIBUTES_CHANGE, this.getAttributes(diff));
        }
    }


    /**
     * @param {string} name Название аттрибута
     * @param {*} value Новое значение
     * */
    setAttribute(name, value) {
        this.setAttributes({[name]: value});
    }


    /**
     * Сброс данных к первоначальным (сохраненным) значениям
     * @param {?Array} [names] Имена аттрибутов или все
     * */
    resetAttributes(names = []) {
        if (!isEmpty(names)) {
            const attrs = pick(this.__initialData, names);
            this.setAttributes(attrs);
        } else {
            this.setAttributes(this.__initialData);
        }
    }


    /**
     * Reset model to initial state
     * By default reset all attributes to initial data and commit state
     * */
    reset() {
        this.resetAttributes();
        this.commitChanges();
    }


    /**
     * Валидация Модели
     * Ошибки можно прочесть из BaseModel.getErrors()
     * @param {?Array} names Аттрибуты для валидации, или будут использованы все
     * @param {?Object} extraConfig Дополнительная конфигурация для Валидатора
     * @return {boolean} Результат валидации
     * */
    validate(names = null, extraConfig = null) {
        this.dropErrors();

        const rules = this.rules;
        const constraintsToValidate = isArray(names) ? pick(rules, names) : rules;
        // Поскольку validate.js не поддерживает создание экземпляра
        // Возможно передать дополнительные опции при валидации, которые мы берем из конфигурации Модели
        const options = {...this.validationConfig, ...extraConfig};
        const attrs = this.getAttributes(names);
        const errors = validate(attrs, constraintsToValidate, options);

        if (!isEmpty(errors)) {
            this.setErrors(errors);
        }
        return !this.hasErrors;
    }


    /**
     * Run validation recursively for relations
     * @return {boolean}
     * */
    validateWithRelative(names = null, extraConfig = null) {
        if (!this.validate(names, extraConfig)) {
            return false;
        }

        forEach(this.__cachedRelations, (relation, name) => {
            if (relation instanceof BaseStore) {
                relation.models.forEach((item, i) => {
                    if (!item.validateWithRelative()) {
                        this.errors[`${name}[${i}]`] = item.errors;
                    }
                })
            }
            if (relation instanceof BaseModel) {
                if (!relation.validateWithRelative()) {
                    this.errors[name] = relation.errors;
                }
            }
        })

        return !this.hasErrors;
    }


    /**
     * Метод установки ошибок
     * @param {Object.<string,array>} errors Объект ошибок, где ключи это аттрибуты, значения массив с ошибками
     * */
    setErrors(errors) {
        forEach(errors, (error, field) => {
            this.errors[field] = isArray(error) ? head(error) : error;
        })
        this.emit(this.constructor.EVENT_ERRORS_CHANGE, this.errors);
    }


    /**
     * Add error for specific attr name
     * @param {String} field
     * @param {String} error
     * */
    addError(field, error) {
        this.errors[field] = isArray(error) ? head(error) : error;
        this.emit(this.constructor.EVENT_ERRORS_CHANGE, this.errors);
    }


    /**
     * @return {Boolean}
     * */
    get hasErrors() {
        return !isEmpty(this.errors);
    }


    /**
     * Сброс ошибок
     * */
    dropErrors() {
        this.errors = {};
        this.emit(this.constructor.EVENT_ERRORS_CHANGE, this.errors);
    }


    /**
     * Кейс когда нам нужно узнать текст первой ошибки без привязки к аттрибуту
     * @return {?String}
     * */
    get firstErrorMessage() {
        return head(values(this.errors));
    }


    /**
     * Proxy configuration
     * @return {Object}
     * */
    get proxyConfig() {
        return this.initialConfig.proxy || BaseProxy;
    };


    /**
     * Создание прокси для запросов в контексте Модели
     * @return {BaseProxy} Созданный экземпляр Прокси
     * */
    get proxy() {
        if (!this.__innerProxy) {
            // Берем конфигурацию Прокси переданную в конструктор
            this.__innerProxy = this.configureProxy(this.proxyConfig);
        }
        return this.__innerProxy;
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
     * Выполнение запроса через прокси
     * @param {Object} config - Конфигурация для запроса axios
     * @param {String[]|Boolean} validateAttributes Список аттрибутов для автовалидации перед запросом,
     *  true для валидации всех аттрибутов, false без валидации (отдается на откуп логике приложения)
     *
     * @return {Promise}
     * */
    async doRequest(config, validateAttributes = false) {
        if (validateAttributes) {
            let validationResult = this.validate(validateAttributes);
            if (!validationResult) {
                return Promise.reject('Before request validation failed');
            }
        }

        const proxy = this.proxy;
        try {
            this.dropErrors();
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            // Сохраняем распознанные ошибки
            if (proxy.isRemoteError && proxy.isValidationError) {
                this.setErrors(this._parseResponseValidationErrors(proxy.responseData));
            }
            return Promise.reject(proxy.errorMessage);
        }
    }


    /**
     * Сериализуем Модель в строку
     * @param {Array} names Имена нужных аттрибутов или будут возвращены все
     * @return {string} JSON строка с аттрибутами
     * @throws Error В случае неудачи
     * */
    serialize(names = []) {
        try {
            return JSON.stringify(this.getSubmitValues(names));
        } catch (e) {
            throw new Error('Failed serialize model: ' + e.message);
        }
    }


    /**
     * Десериализуем Модель, ранее сериализованную методом BaseModel#serialize
     * @param {string} str
     * @throws Error В случае неудачи
     *  */
    deserialize(str) {
        try {
            const data = JSON.parse(str);
            this.setAttributes(data);
        } catch (e) {
            throw new Error('Failed deserialize model: ' + e.message);
        }
    }


    /**
     * Метод для парсинга ошибок из ответа сервера
     * @param {object} responseData
     * @return {object} Индексированный объект, где ключи название аттрибутов, а значения массив ошибок
     * @protected
     * */
    _parseResponseValidationErrors(responseData) {
        /*
        * По умолчанию ожидаем от сервера ответ в формате:
        * [
         *     {
         *          "field": "cottage_id",
         *          "message": "Необходимо заполнить «Идентификатор Коттеджа»."
         *     },
         *      ...
         * ]*/
        if (responseData[0] && responseData[0]['message']) {
            // Собираем ошибки в индексированный объект
            return reduce(responseData, (result, value) => {
                result[value.field] = value.message;
                return result;
            }, {});
        }

        /*
        * Уже сформированный объект как есть или пустой обьект
        * */
        return Object(responseData) || {};
    }


    /**
     * Получаем данные с сервера
     * @param {?Object} [extraConfig]
     * */
    async fetch(extraConfig = {}) {
        const url = this.urls['fetch'];
        const method = this.verbs['fetch'];
        const requestConfig = {url, method, ...extraConfig};
        const data = await this.doRequest(requestConfig);
        this.loadData(data);
        this.commitChanges();
        this.isPhantom = false;
        this.emit(this.constructor.EVENT_FETCH, data);
        return Promise.resolve(data);
    }


    /**
     * @protected
     * */
    __loadRelationsData(relatedData) {
        forEach(relatedData, (data, relationName) => {
            const relation = this[relationName];
            if (relation instanceof BaseStore) {
                relation.clear()
                relation.loadModels(data)
            } else {
                relation.loadData(data)
            }
            relation.commitChanges()
        })
    }

    /**
     * Wheter model should be sended to server within save action
     * @return {Boolean}
     * */
    getIsShouldBeSaved(withRelative = false) {
        return this.alwaysDirtyFields.length > 0
            || this.isPhantom
            || this.isDirty
            || (withRelative && this.isDirtyWithRelated)
    }


    /**
     * Mark model as phantom meaning save() request will provide create action
     * */
    markAsPhantom() {
        this.isPhantom = true
    }

    /**
     * Mark model as real meaning save() request will provide edit action
     * */
    markAsReal() {
        this.isPhantom = false
    }


    /**
     * Mark model as deleted meaning no model exists on server side
     * */
    markAsDeleted() {
        this.isDeleted = true
        this.isPhantom = true
    }


    /**
     * Before save logic should return true or error message to be rejected with
     * @return {Promise<boolean|string>}
     * */
    async beforeSave() {
        return true
    }

    /**
     * After save logic
     * */
    afterSave() {

    }


    /**
     * Save model to server
     * @param {boolean} withRelative Whether to collect relative data as submitValues in request
     * */
    async save(withRelative = false) {
        const beforeSaveErr = await this.beforeSave()
        if (true !== beforeSaveErr) {
            return Promise.reject(beforeSaveErr)
        }
        if (!this.getIsShouldBeSaved()) {
            return Promise.resolve({});
        }

        const url = this.isPhantom ? this.urls['create'] : this.urls['save'];
        const method = this.isPhantom ? this.verbs['create'] : this.verbs['save'];
        const attrsToBeSend = this.isPhantom ? undefined : keys(this._dirtyAttributes);
        const data = this.getSubmitValues(attrsToBeSend, withRelative);
        if (this.alwaysDirtyFields.length > 0) {
            Object.assign(data, this.getSubmitValues(this.alwaysDirtyFields))
        }
        const event = this.isPhantom ? this.constructor.EVENT_CREATE : this.constructor.EVENT_SAVE;
        const responseData = await this.doRequest({url, method, data});

        this.loadData(responseData);
        this.commitChanges();
        this.markAsReal();

        this.emit(event, responseData);
        this.emitToBelongsStores(BaseStore.EVENT_MODEL_BELONGS_CHANGE, {model: this});

        this.afterSave()
        return Promise.resolve(responseData);
    }


    /**
     * Удаляем модель на сервере
     * */
    async delete() {
        const url = this.urls['delete'];
        const method = this.verbs['delete'];
        await this.doRequest({url, method});
        this.markAsDeleted()
        this.emit(this.constructor.EVENT_DELETE);
        this.emitToBelongsStores(BaseStore.EVENT_MODEL_BELONGS_CHANGE, {model: this});
        return Promise.resolve(true);
    }


    /**
     * Helper for short access to saved attributes
     * */
    get $() {
        return this._savedAttributes;
    }


    /**
     * Helper to make fetch request by id and populate model
     * @param {Any} id The identifier to fetch
     * @param {Object} extraConfig The extra configuration to be passed to fetch method
     * @return {BaseModel}
     * */
    static async fetchOne(id, extraConfig = {}) {
        const model = new this();
        model.setAttribute(model.idProperty, id);
        await model.fetch(extraConfig);
        return model;
    }


    /**
     * Retrieve internala data by path previous loaded by loadData method
     * */
    getData(path = '') {
        return path === '' ? this.__initialData : get(this.__initialData, path);
    }


    /**
     * Link model to store
     * @param {BaseStore} store
     * */
    linkToStore(store) {
        if (false === this.isBelongToStore(store)) {
            this.__belongsToStores.push(store);
        }
    }

    /**
     * Link model to store
     * @param {BaseStore} store
     * */
    unlinkFromStore(store) {
        remove(this.__belongsToStores, {id: store.id})
    }

    /**
     * Link model to store
     * @param {BaseStore} store
     * */
    isBelongToStore(store) {
        return Boolean(find(this.__belongsToStores, {id: store.id}));
    }


    emitToBelongsStores(event, data) {
        forEach(this.__belongsToStores, store => store.emit(event, data));
    }
}
