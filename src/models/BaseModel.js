import {extend, isArray, isEmpty, isNull, isObject, keys, omitBy, pick, values} from "lodash";
import BaseClass from "./BaseClass";
import BaseProxy from "./BaseProxy";
import validate from "validate.js";
import {computed, reactive, ref} from "vue";


/**
 * Базовая модель  использующая vue 3 composition api
 * поддерживающая аттрибуты, валидацию, прокси для запросов к серверу
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseModel extends BaseClass {
    /**
     * @inheritDoc
     * */
    static getDefaultConfig() {
        // Расширяем конфиг Прокси и Аттрибутами
        return {
            ...super.getDefaultConfig(),
            idProperty: 'id',
            // Конфигурация для Прокси
            proxy: {
                class: BaseProxy
            },
            // Конфигурация для настройки validate.js
            validate: {
                // Since validators don't include the argument name in the error message the validate function prepends it for them.
                // This behaviour can be disabled by setting the fullMessages option to false.
                fullMessages: false
            }
        }
    }


    /**
     * @return {Object.<string,*>} Дефолтные аттрибуты Модели
     */
    defaults() {
        return {
            id: null
        }
    }


    /**
     * @return {object} Объект правил для валидации,который будет передан в валидатор
     * По умолчанию используется библиотека https://validatejs.org/
     * @see https://validatejs.org/
     * */
    validationConstraints() {
        return {}
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {object} attributes Аттрибуты модели
     * @param {Object} config Конфиг для передачи в родительский конструктор
     * */
    constructor(attributes = {}, config = {}) {
        super(config);

        const defaultAttrs = this.defaults();

        /**
         *  Реактивные аттрибуты
         *  @type {Proxy<string,*>}
         *  */
        this.attributes = reactive(defaultAttrs);

        /**
         * Стек ошибок, индексированный по именам аттрибутов
         *  @type {Ref<{}>}
         * */
        this.errors = ref({});

        /**
         * @type {ComputedRef}
         * */
        this.hasErrors = computed(() => !isEmpty(this.errors.value));

        /**
         * @type {Ref<boolean>} Реактивное состояние ожидания Прокси
         */
        this.isRequesting = ref(false);

        if (!isEmpty(attributes)) {
            this.setAttributes(attributes);
        }
    }


    /**
     * @return {string|number}
     * */
    getId() {
        const propId = this.getConfig('idProperty');
        return this.getAttribute(propId);
    }


    /**
     * @param {string|number} value
     * */
    setId(value) {
        const propId = this.getConfig('idProperty');
        return this.setAttribute(propId, value);
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
     * @return {boolean} Имеет ли модель id в базе данных
     * */
    isPhantom() {
        return !this.getId();
    }


    /**
     * @param {string} name Имя аттрибута
     * @return {*} Значение аттрибута
     * */
    getAttribute(name) {
        return this.attributes[name];
    }


    /**
     * @param {Array} attributeNames Имена нужных аттрибутов или будут возвращены все
     * @return {object} Текущие аттрибуты
     * */
    getAttributes(attributeNames = []) {
        if (isArray(attributeNames) && attributeNames.length) {
            return pick(this.attributes, attributeNames);
        }
        return this.attributes;
    }


    /**
     * @param {Array} attributeNames Имена нужных аттрибутов или будут возвращены все
     * @return {Object} Текущие аттрибуты которые не пусты
     * */
    getNonEmptyAttributes(attributeNames = []) {
        return omitBy(this.getAttributes(attributeNames), isNull);
    }


    /**
     * @param {Object.<string,*>} dirtyAttrs
     * @return {Object.<string,*>}
     * @protected
     * */
    _clearDirtyAttributes(dirtyAttrs) {
        return pick(dirtyAttrs, keys(this.defaults()));
    }


    /**
     * Новые значения аттрибутов
     * @param {Object} attrs Объект данные будет отфильтрован перед назначением
     * */
    setAttributes(attrs = {}) {
        const clearAttributes = this._clearDirtyAttributes(attrs);
        Object.assign(this.attributes, clearAttributes);
    }


    /**
     * @param {string} name Название аттрибута
     * @param {*} value Новое значение
     * */
    setAttribute(name, value) {
        this.setAttributes({[name]: value});
    }


    /**
     * Сброс данных к первоначальным значениям (при инициализации)
     * */
    resetAttributes() {
        Object.assign(this.attributes, this.defaults());
    }


    /**
     * Валидация Модели
     * Ошибки можно прочесть из реактивного свойства BaseModel.errors.value
     * @param {?Array} attributes Аттрибуты для валидации, или будут использованы все
     * @param {?Object} constraints Персональные правила, иначе будут взяты из метода {BaseModel#validationConstraints}
     * @param {?Object} extraConfig Дополнительная конфигурация для Валидатора
     * @return {boolean} Результат валидации
     * */
    validate(attributes = null, constraints = null, extraConfig = null) {
        this.dropErrors();

        const constraintsToValidate = constraints || isArray(attributes) && pick(this.validationConstraints(), attributes) || this.validationConstraints();
        // Поскольку validate.js не поддерживает создание экземпляра
        // Возможно передать дополнительные опции при валидации, которые мы берем из конфигурации Модели
        const options = {...this.getConfig('validate'), ...extraConfig};
        const dataToValidate = isArray(attributes) ? this.getAttributes(attributes) : this.getAttributes();
        const errors = validate(dataToValidate, constraintsToValidate, options);
        if (!isEmpty(errors)) {
            this.setErrors(errors);
        }
        return !this.hasErrors.value;
    }


    /**
     * Метод установки ошибок
     * @param {Object.<string,array>} errors Объект ошибок, где ключи это аттрибуты, значения массив с ошибками
     * */
    setErrors(errors) {
        this.errors.value = errors;
    }


    /**
     * Сброс ошибок
     * */
    dropErrors() {
        this.errors.value = {};
    }


    /**
     * Кейс когда нам нужно узнать текст первой ошибки без привязки к аттрибуту
     * @return {?String}
     * */
    getFirstErrorMessage() {
        const errors = this.errors.value;
        if (!errors) {
            return null;
        }
        return values(errors)[0][0];
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
     * @param {Object} config - Конфигурация для запроса axios
     * @param {String[]|Boolean} validateAttributes Список аттрибутов для автовалидации перед запросом,
     *  true для валидации всех аттрибутов, false без валидации (отдается на откуп логике приложения)
     *
     * @return {Promise}
     * */
    async doRequest(config, validateAttributes = false) {
        const proxy = this.getProxy();
        if (validateAttributes) {
            let validationResult = this.validate(validateAttributes);
            if (!validationResult) {
                return Promise.reject('Before request validation failed');
            }
        }

        try {
            this.dropErrors();
            this.isRequesting.value = true;
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            // Сохраняем распознанные ошибки
            if (!isEmpty(e.parsedErrors)) {
                this.setErrors(e.parsedErrors);
            }
            return Promise.reject(e);
        } finally {
            this.isRequesting.value = false;
        }
    }


    /**
     * Сериализуем Модель в строку
     * @param {Array} attributeNames Имена нужных аттрибутов или будут возвращены все
     * @return {string} JSON строка с аттрибутами
     * @throws Error В случае неудачи
     * */
    serialize(attributeNames = []) {
        try {
            return JSON.stringify(this.getNonEmptyAttributes(attributeNames));
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
}