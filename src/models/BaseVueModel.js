import {extend, forEach, isEmpty, isEqual, keys, pick} from "lodash";
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
export default class BaseVueModel extends BaseClass {
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
    getDefaultAttributes() {
        return {
            id: null
        }
    }


    /**
     * @return {object} Объект правил для валидации,который будет передан в валидатор
     * По умолчанию используется библиотека https://validatejs.org/
     * @see https://validatejs.org/
     * */
    getValidationConstraints() {
        return {}
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {object} attributes Аттрибуты модели
     * @param {Object} config Конфиг для передачи в родительский конструктор
     * */
    constructor(attributes = {}, config = {}) {
        super(config);

        const defaultAttrs = this.getDefaultAttributes();

        // Сохраняем аттрибуты инициализации = исходное состояние
        this.__initialAttributes = extend({}, defaultAttrs, attributes);

        // Реактивные аттрибуты
        this.attributes = reactive(this.__initialAttributes);

        // Стек ошибок
        this.errors = ref([]);
        this.hasErrors = computed(() => !isEmpty(this.errors.value));
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
        return isEmpty(this.getId());
    }


    /**
     * @param {string} name Имя аттрибута
     * @return {*} Значение аттрибута
     * */
    getAttribute(name) {
        if (typeof this.attributes[name] === undefined) {
            throw new Error(`Uncknown attribute ${name}`);
        }
        return this.attributes[name];
    }


    /**
     * @return {object} Текущие аттрибуты
     * */
    getAttributes() {
        return this.attributes;
    }


    /**
     * Новые значения аттрибутов
     * @param {Object} dirtyAttrs Объект данные будет отфильтрован перед назначением
     * */
    setAttributes(dirtyAttrs = {}) {
        // Предполагаем что допустимы только обозначенные при инициализации аттрибуты
        const clearAttributes = pick(dirtyAttrs, keys(this.__initialAttributes));
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
     * @fires {BaseModel#EVENT_ATTRIBUTES_RESET}
     * */
    resetAttributes() {
        Object.assign(this.attributes, this.__initialAttributes);
    }


    /**
     * Валидация Модели
     * @param {array} attributes Аттрибуты для валидации, или будут использованы все
     * @param {object} constraints Персональные правила, иначе будут взяты из метода {BaseModel#getValidationConstraints}
     * @param {object} extraConfig Дополнительная конфигурация для Валидатора
     * @return {boolean} Результат валидации
     * */
    validate(attributes = null, constraints = null, extraConfig = null) {
        this.dropErrors();

        const attrToValidate = attributes || this.getAttributes();
        const constraintsToValidate = constraints || this.getValidationConstraints();
        // Поскольку validate.js не поддерживает создание экземпляра
        // Возможно передать дополнительные опции при валидации, которые мы берем из конфигурации Модели
        const options = {...this.getConfig('validate'), ...extraConfig};

        const errors = validate(attrToValidate, constraintsToValidate, options);
        this.setErrors(errors);
        return !this.hasErrors();
    }


    /**
     * Метод установки ошибок
     * @param {object} errors Объект ошибок, где ключи это аттрибуты, значения массив с ошибками
     *
     * @fires {BaseModel#EVENT_ERRORS_CHANGE} В случае наличия ошибок
     * */
    setErrors(errors) {
        if (!isEqual(this.__errors, errors)) {
            this.__errors = errors;
            this.emit(this.constructor.EVENT_ERRORS_CHANGE, {errors});
        }
    }


    /**
     * @return {boolean}
     * */
    hasErrors() {
        return !isEmpty(this.__errors);
    }


    /**
     * @return {object} Объект ошибок, где ключи это аттрибуты, значения массив с ошибками
     * */
    getErrors() {
        return this.__errors;
    }


    /**
     * Сброс ошибок
     * @fires {BaseModel#EVENT_ERRORS_CHANGE} Если были ошибки
     * */
    dropErrors() {
        if (!isEmpty(this.__errors)) {
            this.emit(this.constructor.EVENT_ERRORS_CHANGE, {errors: {}});
        }
        this.__errors = {};
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
            this.dropErrors();
            const responseData = (await proxy.doRequest(config));
            return Promise.resolve(responseData);
        } catch (e) {
            // Сохраняем распознанные ошибки
            if (!isEmpty(e.parsedErrors)) {
                this.setErrors(e.parsedErrors);
            }
            return Promise.reject(e);
        }
    }


    /**
     * Сериализуем Модель в строку
     * @return {string} JSON строка с аттрибутами
     * */
    serialize() {
        return JSON.stringify(this.__attributes);
    }
}