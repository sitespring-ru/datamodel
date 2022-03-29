"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

var _lodash = require("lodash");

var _mitt = _interopRequireDefault(require("mitt"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * Базовый класс поддерживающий конфигурацию и события
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
class BaseClass {
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

  /**
   * @param {?Object} [$config] Объект конфигурации Конструктора
   * */
  constructor($config = {}) {
    if (!(0, _lodash.isEmpty)($config)) {
      Object.assign(this, $config);
    }

    this.init(arguments);
  }
  /**
   * Хук инициализации Класса
   * */


  init() {}
  /**
   * Хелпер для создания экземпляра класса
   * @param {?Object} [defs] Объект содержащий ключ class который определяет конструктор
   * @return {BaseClass|BaseStore|BaseProxy|BaseModel|Object} экземпляр класса
   * */


  static createInstance(defs = {}) {
    const constructorName = defs.class || this;

    if (!constructorName) {
      throw new Error('The "class" property must be present');
    }

    const instance = new constructorName();
    const props = (0, _lodash.omit)(defs, 'class');

    if (!(0, _lodash.isEmpty)(props)) {
      (0, _lodash.forEach)(props, (val, prop) => {
        if (!(0, _lodash.hasIn)(instance, prop)) {
          throw new Error(`Unknown property "${prop}"`);
        }

        (0, _lodash.set)(instance, prop, val);
      });
    }

    return instance;
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
   * Создаем экземпляр Emitter`a
   * Таким образом экземпляр Emitter-а создается при первом вызове метода, а не при создании класса
   * @return {Emitter}
   * */


  getEmitter() {
    if (!this.__emitterInstance) {
      this.__emitterInstance = new _mitt.default();
    }

    return this.__emitterInstance;
  }
  /**
   * Register an event handler for the given type.
   * Добавляем возможность работать с массивом событий и одним обработчиком
   *
   * @see https://github.com/developit/mitt
   *
   * @param {string|symbol|Array<string|symbol>} $event Type of event to listen for, or '*' for all events
   * @param {Function} $handler Function to call in response to given event
   * @return void
   * */


  on($event, $handler) {
    if ((0, _lodash.isArray)($event)) {
      (0, _lodash.forEach)($event, $eventItem => this.getEmitter().on($eventItem, $handler));
    } else {
      this.getEmitter().on($event, $handler);
    }
  }
  /**
   * Remove an event handler for the given type. If handler is omitted, all handlers of the given type are removed.
   * Добавляем возможность работать с массивом событий и одним обработчиком
   *
   * @see https://github.com/developit/mitt
   *
   * @param {string|symbol} $event Type of event to listen for, or '*' for all events
   * @param {Function} $handler Function to call in response to given event
   * @return void
   * */


  off($event, $handler) {
    if ((0, _lodash.isArray)($event)) {
      (0, _lodash.forEach)($event, $eventItem => this.getEmitter().off($eventItem, $handler));
    } else {
      this.getEmitter().off($event, $handler);
    }
  }
  /**
   * Invoke all handlers for the given type. If present, '*' handlers are invoked after type-matched handlers.
   * Note: Manually firing '*' handlers is not supported.
   * @see https://github.com/developit/mitt
   *
   * @param {string|symbol} $event Type of event to listen for, or '*' for all events
   * @param {?Any|*} [$data] Any value (object is recommended and powerful), passed to each handler
   * @return void
   * */


  emit($event, $data = {}) {
    this.getEmitter().emit($event, $data);
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

exports.default = BaseClass;