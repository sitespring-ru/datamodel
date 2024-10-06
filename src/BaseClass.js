import {defaultsDeep, forEach, isArray, isEmpty, omit, set} from "lodash-es";
import mitt from "mitt";

/**
 * Базовый класс поддерживающий конфигурацию и события
 *
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 *
 */
export default class BaseClass {
    /**
     * Экземпляр Emitter-а
     * @typedef {Object} Emitter
     * @property {Function} on
     * @property {Function} off
     * @property {Function} emit
     * @property {Object} all
     *
     * @see https://github.com/developit/mitt
     * */

    get defaults() {
        return {};
    }


    /**
     * @param {?Object} [config] Объект конфигурации Конструктора
     * */
    constructor(config = {}) {
        this.initialConfig = defaultsDeep(config || {}, this.defaults);
    }


    static configure(instance, props) {
        if (!isEmpty(props)) {
            forEach(props, (val, prop) => {
                if (!(prop in instance)) {
                    throw new Error(`Unknown property "${prop}" in "${instance}"`);
                }
                set(instance, prop, val);
            })
        }
        return instance;
    }


    /**
     * Хелпер для создания экземпляра класса
     * @param {?Object|Function} [defs] Объект содержащий ключ class который определяет конструктор или сам конструктор
     * @return {BaseClass|BaseStore|BaseProxy|BaseModel|Object} экземпляр класса
     * */
    static createInstance(defs = {}) {
        // Handle case when defs is constructor directly
        if (typeof defs === 'function') {
            return new defs();
        }
        const constructorName = defs.class || this;
        if (!constructorName) {
            throw new Error('The "class" property must be present');
        }
        const props = omit(defs, 'class');
        return this.configure(new constructorName(), props);
    }


    /**
     * По умолчанию представляет имя класса
     * @inheritDoc
     * */
    toString() {
        // Если не задан name возвращаем по дефолту [object Object]
        return this.constructor.name || super.toString();
    }


    /**
     * Should class support emitting events
     * false by default for
     * @return {Boolean}
     * */
    get hasEmitter() {
        return Boolean(this.initialConfig.hasEmitter);
    }


    /**
     * Создаем экземпляр Emitter`a
     * Таким образом экземпляр Emitter-а создается при первом вызове метода, а не при создании класса
     * @return {Emitter}
     * */
    get emitter() {
        if (!this.__emitterInstance) {
            this.__emitterInstance = new mitt();
        }
        return this.__emitterInstance;
    }


    /**
     * Register an event handler for the given type.
     * Добавляем возможность работать с массивом событий и одним обработчиком
     *
     * @see https://github.com/developit/mitt
     *
     * @param {string|symbol|Array<string|symbol>} event Type of event to listen for, or '*' for all events
     * @param {Function} handler Function to call in response to given event
     * @return void
     * */
    on(event, handler) {
        if (!this.hasEmitter) {
            return;
        }
        if (isArray(event)) {
            forEach(event, (eventItem) => this.emitter.on(eventItem, handler));
        } else {
            this.emitter.on(event, handler);
        }
    }


    /**
     * Remove an event handler for the given type. If handler is omitted, all handlers of the given type are removed.
     * Добавляем возможность работать с массивом событий и одним обработчиком
     *
     * @see https://github.com/developit/mitt
     *
     * @param {string|symbol} event Type of event to listen for, or '*' for all events
     * @param {Function} handler Function to call in response to given event
     * @return void
     * */
    off(event, handler) {
        if (!this.hasEmitter) {
            return;
        }
        if (isArray(event)) {
            forEach(event, (eventItem) => this.emitter.off(eventItem, handler));
        } else {
            this.emitter.off(event, handler);
        }
    }


    /**
     * Invoke all handlers for the given type. If present, '*' handlers are invoked after type-matched handlers.
     * Note: Manually firing '*' handlers is not supported.
     * @see https://github.com/developit/mitt
     *
     * @param {string|symbol} event Type of event to listen for, or '*' for all events
     * @param {?Any|*} [$data] Any value (object is recommended and powerful), passed to each handler
     * @return void
     * */
    emit(event, $data = {}) {
        if (!this.hasEmitter) {
            return;
        }
        this.emitter.emit(event, $data);
    }


    /**
     * Хук метод для очищения ресурсов экземпляра Класса
     * Должен вызываться вручную, т.к. js не имеет магического метода сборщика мусора при удалении Класса
     * */
    destroy() {
        // Очищаем все события и слушателей Эмиттера
        if (this.__emitterInstance) {
            this.__emitterInstance.all.clear();
            this.__emitterInstance = null;
        }
    }
}
