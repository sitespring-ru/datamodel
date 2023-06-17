import {
    difference,
    forEach,
    get,
    has,
    isArray,
    isEmpty,
    isEqual,
    isFunction,
    isString,
    keys,
    mapValues,
    pick,
    reduce,
    values
} from "lodash-es";
import BaseClass from "./BaseClass.js";
import validate from "validate.js";
import dayjs from "dayjs";


/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 *
 * The model schema of data can be shared between node and browser envs
 * @class ModelSchema
 */
export default class ModelSchema extends BaseClass {
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
     * @property {typeof ModelSchema} schema Конструктор Модели в случае связи hasOne
     * @property {?String} foreignKey Внешний ключ для сортировки Хранилища
     * @property {("hasOne"|"hasMany")} type Тип связи
     * */

    /**
     * Событие смены значения аттрибута
     * @event ModelSchema#EVENT_REQUEST_START
     * @param {AttributesMap} $changed Объект измененных аттрибутов
     * */
    static EVENT_ATTRIBUTES_CHANGE = 'attributesChanged';


    /**
     * Событие изменения данных об ошибках валидации
     * @event ModelSchema#EVENT_ERRORS_CHANGE
     * @param {Object} $data Текущий стек ошибок
     * */
    static EVENT_ERRORS_CHANGE = 'errorschange';


    /**
     * Алиас модели для построения rest api запросов, генерации id и т.п.
     * @type {String}
     * */
    entityName = 'model-schema';


    /**
     * Название аттрибута сод. primary key
     * @type {String}
     * */
    idProperty = 'id';


    /**
     * Сохраненные данные
     * @type {AttributesMap}
     * @protected
     * */
    _savedAttributes = {};

    /**
     * Данные, которые были изменены с момента последнего коммита
     * @type {AttributesMap}
     * @protected
     * */
    _dirtyAttributes = {};

    /**
     * Имеет ли модель id в базе данных на стороне сервера
     * @type {Boolean}
     * @protected
     * */
    _isPhantom = true;

    /**
     * Модель была удалена на стороне сервера
     * @type {Boolean}
     * @protected
     * */
    _isDeleted = false;

    /**
     * Индексированный объект ошибок
     * @type {AttributesMap}
     * @protected
     * */
    _errors = {};

    /**
     * Стек кешированных связанных Моделей/Хранилищ
     * @type {Object<String,(ModelSchema|BaseStore)>}
     * @protected
     * */
    _relations = {};


    /**
     *  Конфигурация для настройки validate.js
     *  @return {Object}
     *  */
    validationConfig = {
        // Since validators don't include the argument name in the error message the validate function prepends it for them.
        // This behaviour can be disabled by setting the fullMessages option to false.
        fullMessages: false
    }

    /**
     * @type {Boolean}
     * @readonly
     * */
    get isModelSchema() {
        return true;
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
     * @return {Any}
     * */
    get id() {
        return this.getAttribute(this.idProperty);
    }

    set id(value) {
        this.setAttribute(this.idProperty, value);
    }


    /**
     * Имеет ли модель id в базе данных на стороне сервера
     * @return {boolean}
     * */
    get isPhantom() {
        return this._isPhantom;
    }


    /**
     *  @return {boolean}
     * */
    get isDeleted() {
        return this._isDeleted;
    }


    /**
     * Shortland helper for [this.getSavedAttributes] method
     * to use in reactive views directly
     * @return {object}
     * */
    get $() {
        return this.getSavedAttributes();
    }

    /**
     * @return {Boolean}
     * */
    get hasErrors() {
        return !isEmpty(this._errors);
    }

    /**
     * Текущий стек ошибок валидации
     * */
    get errors() {
        return this._errors;
    }

    /**
     * Кейс когда нам нужно узнать текст первой ошибки без привязки к аттрибуту
     * @return {?String}
     * */
    get firstErrorMessage() {
        return get(values(this._errors), '[0][0]', null);
    }


    /**
     * Карта предопределенных фильтров для работы с аттрибутами
     * При расширении Модели можно добавлять свои фильтры для последующего использования
     * в аттрибутах
     * @return {Object.<String,AttributeFilter>}
     * */
    static filtersMap() {
        return {
            string: ($rawValue) => ($rawValue + '').trim(),
            int: ($rawValue) => $rawValue && Number.parseInt($rawValue) || null,
            float: ($rawValue) => $rawValue && Number.parseFloat($rawValue) || null,
            date: ($rawValue) => $rawValue !== null ? new Date($rawValue) : null,
            submitDate: ($rawValue, $format = 'YYYY-MM-DD') => $rawValue && dayjs($rawValue).format($format) || null,
            submitTime: ['submitDate', 'HH:mm:ss'],
            submitDateTime: ['submitDate', 'YYYY-MM-DD HH:mm:ss'],
        }
    }


    /**
     * The fields map with defaults values
     * @return {AttributesMap}
     * */
    fields() {
        return {
            id: null
        }
    }


    /**
     * Массив полей, которые могут быть изменены с помощью метода setAttributes
     * */
    safeAttributes() {
        return keys(this.fields());
    }


    /**
     * Правила валидации
     * По умолчанию используется библиотека https://validatejs.org/
     * @see https://validatejs.org/
     * */
    rules() {
        return {
            id: {numericality: true}
        }
    }


    /**
     * Карта фильтров аттрибутов для установки значений
     * @return {Object.<String,AttributeFilter>}
     * */
    innerFilters() {
        return {
            id: 'int'
        }
    }


    /**
     * Карта фильтров аттрибутов для отправки или сохранения
     * @return {Object.<String,AttributeFilter>}
     * */
    outerFilters() {
        return {}
    }


    /**
     * Карта связей для автоматической обработки данных
     * @return {Object<String,RelationDefinition>}
     * */
    relations() {
        return {}
    }


    /**
     * Если связь
     * */
    getHasRelation(name) {
        return !!this.relations()[name];
    }


    /**
     * Применяем фильтр для аттрибута
     * @param {AttributeFilter|null} filterDef
     * @param {*} rawValue
     * @param {?Array} extraArgs Дополнительные аргументы для передачи в метод фильтра
     * @return {*} Значение после обработки фильтра
     * */
    applyFilter(filterDef, rawValue, extraArgs = []) {
        if (!filterDef) {
            return rawValue;
        }
        // Кейс когда передано название фильтра из карты предопределенных фильтров
        if (isString(filterDef)) {
            return this.applyFilter(this.constructor.filtersMap()[filterDef], rawValue, extraArgs);
        }
        // Кейс когда передан метод напрямую
        if (isFunction(filterDef)) {
            return filterDef.apply(this, [rawValue, ...extraArgs]);
        }
        // Кейс когда передан массив, первый элемент которого название фильтра и доп. аргументы
        if (isArray(filterDef)) {
            return this.applyFilter(filterDef[0], rawValue, filterDef.slice(1));
        }
        throw new Error(`Invalid filter type ${name}`);
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {object} attrs Аттрибуты модели
     * @param {Object} config Конфиг для передачи в родительский конструктор
     * */
    constructor(attrs = {}, config = {}) {
        super();

        // Задаем начальные данные
        Object.assign(this._savedAttributes, this.fields());

        this.__createMagicProps();
        if (!isEmpty(attrs)) {
            this._innerSetAttributes(attrs);
            this.commitChanges();
        }
        this.constructor.configure(this, config);
    }


    /**
     * Создаем геттеры и сеттеры для аттрибутов
     * @protected
     * */
    __createMagicProps() {
        forEach(this.fields(), (value, attrName) => {
            // Уже есть пропс с именем аттрибута
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
        });
    }


    /**
     * Применить текущие изменения как сохраненные
     * */
    commitChanges() {
        Object.assign(this._savedAttributes, this._dirtyAttributes);
        this._dirtyAttributes = {};
    }


    /**
     * Get outer value formatted by outerFilters map
     * @param {?Array} [names] Список аттрибутов или все
     * @return {Object.<String, *>}
     * */
    getOuterValues(names = null) {
        const attrs = this.getAttributes(names);
        const $filters = this.outerFilters();
        return mapValues(attrs, (value, attr) => this.applyFilter($filters[attr], value));
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
     * @param {string} $name Имя аттрибута
     * @return {*} Значение аттрибута
     * */
    getSavedAttribute($name) {
        if (!has(this._savedAttributes, $name)) {
            throw new Error(`Unknown attribute name "${$name}"`);
        }
        return this._savedAttributes[$name];
    }


    /**
     * @param {string} $name Имя аттрибута
     * @param {?Boolean} [isDirty] По умолчанию true
     * @return {*} Значение аттрибута
     * @alias get
     * */
    getAttribute($name, isDirty = true) {
        const attrs = isDirty ? {...this._savedAttributes, ...this._dirtyAttributes} : this._savedAttributes;
        if (!has(attrs, $name)) {
            throw new Error(`Unknown attribute name "${$name}"`);
        }
        return attrs[$name];
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
     * @return void
     * @protected
     * */
    _innerSetAttributes(attrs) {
        const filters = this.innerFilters();
        const safeAttrs = pick(attrs, this.safeAttributes());
        const withFilters = mapValues(safeAttrs, (value, key) => this.applyFilter(filters[key], value));
        Object.assign(this._dirtyAttributes, withFilters);
    }


    /**
     * Новые значения аттрибутов
     * @param {AttributesMap} attrs
     * */
    setAttributes(attrs) {
        const beforeAttrs = this.dirtyAttributesNames;
        this._innerSetAttributes(attrs);
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
     * */
    resetAttributes() {
        this._dirtyAttributes = {};
    }


    /**
     * Валидация Модели
     * Ошибки можно прочесть из ModelSchema.getErrors()
     * @param {?Array} names Аттрибуты для валидации, или будут использованы все
     * @param {?Object} $extraConfig Дополнительная конфигурация для Валидатора
     * @return {boolean} Результат валидации
     * */
    validate(names = null, $extraConfig = null) {
        this.dropErrors();

        const $rules = this.rules();
        const $constraintsToValidate = isArray(names) ? pick($rules, names) : $rules;
        // Поскольку validate.js не поддерживает создание экземпляра
        // Возможно передать дополнительные опции при валидации, которые мы берем из конфигурации Модели
        const $options = {...this.validationConfig, ...$extraConfig};
        const attrs = this.getAttributes(names);
        const $errors = validate(attrs, $constraintsToValidate, $options);

        if (!isEmpty($errors)) {
            this.setErrors($errors);
        }
        return !this.hasErrors;
    }


    /**
     * Метод установки ошибок
     * @param {Object.<string,array>} $errors Объект ошибок, где ключи это аттрибуты, значения массив с ошибками
     * */
    setErrors($errors) {
        this._errors = $errors;
        this.emit(this.constructor.EVENT_ERRORS_CHANGE, this._errors);
    }


    /**
     * Сброс ошибок
     * */
    dropErrors() {
        this._errors = {};
        this.emit(this.constructor.EVENT_ERRORS_CHANGE, this._errors);
    }


    /**
     * Сериализуем Модель в строку
     * @param {Array} names Имена нужных аттрибутов или будут возвращены все
     * @return {string} JSON строка с аттрибутами
     * @throws Error В случае неудачи
     * */
    serialize(names = []) {
        try {
            return JSON.stringify(this.getOuterValues(names));
        } catch (e) {
            throw new Error('Failed serialize model: ' + e.message);
        }
    }


    /**
     * Десериализуем Модель, ранее сериализованную методом ModelSchema#serialize
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
}