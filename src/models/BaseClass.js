import {get, isEmpty, isEqual, merge, omit, set} from "lodash";
import mitt from "mitt";

/**
 * Базовый класс поддерживающий конфигурацию и события
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseClass {
    /**
     * @event BaseClass#EVENT_CONFIG_CHANGE Событие при смене конфига
     * @type {object}
     * @property {*} value Данные которые были изменены
     * @property {string} path Ключ если был задан
     * */
    static EVENT_CONFIG_CHANGE = 'configchange';


    /**
     * Здесь будем хранить данные глобально измененные с помощью {BaseClass.setDefaultConfig}
     * @private
     * */
    static __changedDefaults = {};


    /**
     * Здесь определяется дефолтная конфигурация, которая может быть переопределена в конструкторе
     * @return {Object.<string,*>}
     * */
    static getDefaultConfig() {
        return {}
    }


    /**
     * Сброс глобально измененной конфигурации
     * */
    static dropDefaultsChanged() {
        this.__changedDefaults = {};
    }


    /**
     * Задаем глобальную конфигурацию, после чего все новые экземпляры будут использовать обновленные данные
     * @param {string} path
     * @param {*} value
     * @static
     * */
    static setDefaultConfig(path, value) {
        set(this.__changedDefaults, path, value);
        this.applyConfig(path, value);
    }


    /**
     * @param {Object} constructorConfig
     * */
    constructor(constructorConfig = {}) {
        /** @type {Object} Данные с которыми был инициализирован Объект */
        this.__constructorConfig = constructorConfig;// merge({}, defaults, changedDefaults, constructorConfig);
        this.__createEmitter();
    }


    /**
     * Добавляем функционал событий (обертка для mitt)
     * @private
     * */
    __createEmitter() {
        if (!this._emitterInstance) {
            this._emitterInstance = new mitt();
            this.on = this._emitterInstance.on;
            this.off = this._emitterInstance.off;
            this.emit = this._emitterInstance.emit;
        }
    }


    /**
     * Хелпер для получения конфига
     * @param {string} path Строковый путь для lodash`s get, если не передан возвращается весь объект конфига
     * @return {*}
     * */
    getConfig(path = '') {
        const self = this.constructor;
        const defaults = self.getDefaultConfig();
        const changedDefaults = self.__changedDefaults;

        const actualConfig = merge({}, defaults, changedDefaults, this.__constructorConfig);
        return !isEmpty(path) ? get(actualConfig, path) : actualConfig;
    }


    /**
     * Задаем новые значения конфига после инициализации конструктора
     * @param {string|object} path Строковый путь для lodash`s set, если не передан подразумевается весь объект конфига
     * @param {Object} config
     *
     * @fires BaseClass#EVENT_CONFIG_CHANGE
     * */
    setConfig(path = '', config = {}) {
        if (arguments.length !== 2) {
            throw new Error('Expect 2 path and config arguments passed');
        }

        const currentConf = this.getConfig(path);
        const self = this.constructor;

        if (!isEqual(currentConf, config)) {
            set(this.__constructorConfig, path, config);
            this.applyConfig(path, config);
            this.emit(self.EVENT_CONFIG_CHANGE, {path, value: config});
        }
    }


    /**
     * Дополнительная логика при смене конфигурации
     * Данный метод не вызовет событие {BaseClass#EVENT_CONFIG_CHANGE}, для этого в более общем случае
     * следует использовать метод {BaseClass#setDefaultConfig}
     * */
    applyConfig(key, value) {
    }


    /**
     * Дополнительная логика при смене глобальной конфигурации
     * */
    static applyConfig(key, value) {
    }


    /**
     * Хелпер для создания экземпляра класса
     * @param {Object} defs Объект содержащий ключ class который определяет конструктор
     * @return {Object} экземпляр класса
     * */
    static createInstance(defs) {
        const constructorName = defs.class;
        if (!constructorName) {
            throw new Error('The "class" property must be present');
        }
        return new constructorName(omit(defs, 'class'));
    }


    /**
     * По умолчанию представляет имя класса
     * @inheritDoc
     * */
    toString() {
        // Если не задан name возвращаем по дефолту [object Object]
        return this.constructor.name || super.toString();
    }
}