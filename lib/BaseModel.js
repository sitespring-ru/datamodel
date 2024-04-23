"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;
var _lodashEs = require("lodash-es");
var _BaseClass = _interopRequireDefault(require("./BaseClass.js"));
var _BaseProxy = _interopRequireDefault(require("./BaseProxy.js"));
var _validate = _interopRequireDefault(require("validate.js"));
var _dayjs = _interopRequireDefault(require("dayjs"));
var _BaseStore = _interopRequireDefault(require("./BaseStore.js"));
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
/**
 * Базовая модель? поддерживающая аттрибуты, валидацию, прокси для запросов к серверу
 *
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @property {Boolean} isPhantom Имеет ли модель id в базе данных на стороне сервера
 */
class BaseModel extends _BaseClass.default {
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
   * */

  /**
   * Событие смены значения аттрибута
   * @event BaseModel#EVENT_REQUEST_START
   * @param {AttributesMap} $changed Объект измененных аттрибутов
   * */
  static EVENT_ATTRIBUTES_CHANGE = 'attributesChanged';

  /**
   * Событие получения данных с сервера
   * @event BaseModel#EVENT_FETCH
   * @param {AttributesMap} $data Объект данных
   * */
  static EVENT_FETCH = 'fetch';

  /**
   * Событие создание новой модели на сервере
   * @event BaseModel#EVENT_CREATE
   * @param {AttributesMap} $data Объект полученных аттрибутов
   * * */
  static EVENT_CREATE = 'create';

  /**
   * Событие сохранения данных на сервере
   * @event BaseModel#EVENT_SAVE
   * @param {AttributesMap} $changed Объект сохраненных аттрибутов
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
   * @param {Object} $data Текущий стек ошибок
   * */
  static EVENT_ERRORS_CHANGE = 'errorschange';

  /**
   * Алиас модели для построения rest api запросов, генерации id и т.п.
   * @type {String}
   * */
  entityName = 'base-model';

  /**
   * Название аттрибута сод. primary key
   * @type {String}
   * */
  idProperty = 'id';

  /**
   * @type {Boolean}
   * @readonly
   * */
  get isModel() {
    return true;
  }

  /**
   * Конфигурация для Прокси
   * @return {Object}
   * */
  getProxyConfig() {
    return _BaseProxy.default.globalDefaultProxyConfig();
  }
  /**
   *  Конфигурация для настройки validate.js
   *  @return {Object}
   *  */
  getValidationConfig() {
    return {
      // Since validators don't include the argument name in the error message the validate function prepends it for them.
      // This behaviour can be disabled by setting the fullMessages option to false.
      fullMessages: false
    };
  }
  /**
   * Карта предопределенных фильтров для работы с аттрибутами
   * При расширении Модели можно добавлять свои фильтры для последующего использования
   * в аттрибутах
   * @return {Object.<String,AttributeFilter>}
   * */
  static filtersMap() {
    return {
      string: $rawValue => ($rawValue + '').trim(),
      int: $rawValue => $rawValue && Number.parseInt($rawValue) || null,
      float: $rawValue => $rawValue && Number.parseFloat($rawValue) || null,
      date: $rawValue => $rawValue !== null ? new Date($rawValue) : null,
      submitDate: ($rawValue, $format = 'YYYY-MM-DD') => $rawValue && (0, _dayjs.default)($rawValue).format($format) || null,
      submitTime: ['submitDate', 'HH:mm:ss'],
      submitDateTime: ['submitDate', 'YYYY-MM-DD HH:mm:ss']
    };
  }

  /**
   * Карта действий для CRUD rest api
   * @return {Object.<String,String>}
   * */
  urls() {
    const $id = this.getId();
    return {
      fetch: `${this.entityName}/${$id}`,
      create: `${this.entityName}`,
      save: `${this.entityName}/${$id}`,
      delete: `${this.entityName}/${$id}`
    };
  }

  /**
   * Карта глаголов для CRUD rest api
   * @return {Object.<String,String>}
   * */
  verbs() {
    return {
      fetch: 'GET',
      create: 'POST',
      save: 'PUT',
      delete: 'DELETE'
    };
  }

  /**
   * Конфигурация аттрибутов Модели c дефолтными значениями
   * @return {AttributesMap}
   * */
  fields() {
    return {
      id: this.constructor.generateId()
    };
  }

  /**
   * Массив полей, которые могут быть изменены с помощью метода setAttributes
   * */
  safeAttributes() {
    return (0, _lodashEs.keys)(this.fields());
  }

  /**
   * Правила валидации
   * По умолчанию используется библиотека https://validatejs.org/
   * @see https://validatejs.org/
   * */
  rules() {
    return {
      id: {
        numericality: true
      }
    };
  }

  /**
   * Карта фильтров аттрибутов для установки значений
   * @return {Object.<String,AttributeFilter>}
   * */
  innerFilters() {
    return {};
  }

  /**
   * Карта фильтров аттрибутов для отправки на сервер
   * @return {Object.<String,AttributeFilter>}
   * */
  submitFilters() {
    return {};
  }

  /**
   * Карта связей для автоматической обработки данных
   * @return {Object<String,RelationDefinition>}
   * */
  relations() {
    return {};
  }

  /**
   * Если связь
   * */
  getHasRelation(name) {
    return !!this.relations()[name];
  }

  /**
   * Применяем фильтр для аттрибута
   * @param {AttributeFilter|null} $filterDef
   * @param {*} $rawValue
   * @param {?Array} $args Дополнительные аргументы для передачи в метод фильтра
   * @return {*} Значение после обработки фильтра
   * */
  applyFilter($filterDef, $rawValue, $args = []) {
    if (!$filterDef) {
      return $rawValue;
    }
    // Кейс когда передано название фильтра из карты предопределенных фильтров
    if ((0, _lodashEs.isString)($filterDef)) {
      return this.applyFilter(this.constructor.filtersMap()[$filterDef], $rawValue, $args);
    }
    // Кейс когда передан метод напрямую
    if ((0, _lodashEs.isFunction)($filterDef)) {
      return $filterDef.apply(this, [$rawValue, ...$args]);
    }
    // Кейс когда передан массив, первый элемент которого название фильтра и доп. аргументы
    if ((0, _lodashEs.isArray)($filterDef)) {
      return this.applyFilter($filterDef[0], $rawValue, $filterDef.slice(1));
    }
    throw new Error(`Invalid filter type ${name}`);
  }

  /**
   * Стандартный конструктор задает начальную конфигурацию
   * @param {object} $attributes Аттрибуты модели
   * @param {Object} $config Конфиг для передачи в родительский конструктор
   * */
  constructor($attributes = {}, $config = {}) {
    super($config);
    this.isPhantom = true;

    /**
     * Сохраненные данные
     * @type {AttributesMap}
     * @protected
     * */
    this._savedAttributes = {};
    // Задаем начальные данные
    Object.assign(this._savedAttributes, this.fields());

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
    this._isDeleted = false;

    /**
     * Индексированный объект ошибок
     * @type {AttributesMap}
     * @protected
     * */
    this._errors = {};

    /**
     * Стек кешированных связанных Моделей/Хранилищ
     * @type {Object<String,(BaseModel|BaseStore)>}
     * @protected
     * */
    this._relations = {};
    this.__createMagicProps();
    if (!(0, _lodashEs.isEmpty)($attributes)) {
      this._innerSetAttributes($attributes);
      this.commitChanges();
    }
  }

  /**
   * Создаем геттеры и сеттеры для аттрибутов
   * @protected
   * */
  __createMagicProps() {
    (0, _lodashEs.forEach)(this.fields(), (value, attrName) => {
      // Уже есть пропс с именем аттрибута
      if (typeof this[attrName] !== "undefined") {
        return;
      }

      // Создаем связь
      if (this.getHasRelation(attrName)) {
        this.__createRelation(attrName);
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
      });
    });
  }

  /**
   * @protected
   * */
  __createRelation(name) {
    const {
      type,
      model: modelConstructor,
      foreignKey,
      store: storeConstructor
    } = this.relations()[name];
    if (type === 'hasOne') {
      Object.defineProperty(this, name, {
        get() {
          if (!this._relations[name]) {
            const model = modelConstructor.createInstance();
            model.setAttributes(this.getAttribute(name));
            this._relations[name] = model;
          }
          return this._relations[name];
        },
        set(model) {
          if (!(model instanceof modelConstructor)) {
            throw new Error(`${name} relation expect ${modelConstructor.name} instance, ${model.constructor.name} given`);
          }
          this._relations[name] = model;
          if (foreignKey) {
            this.setAttribute(foreignKey, model.getId());
          }
        }
      });
      return;
    }
    if (type === 'hasMany') {
      const storeConstructorReal = storeConstructor || _BaseStore.default;
      Object.defineProperty(this, name, {
        get() {
          if (!this._relations[name]) {
            const store = storeConstructorReal.createInstance({
              model: modelConstructor,
              filters: {
                id: {
                  property: foreignKey,
                  value: this.getId()
                }
              }
            });
            store.loadModels(this.getAttribute(name));
            this._relations[name] = store;
          }
          return this._relations[name];
        },
        set(store) {
          if (!(store instanceof storeConstructorReal)) {
            throw new Error(`${name} relation expect ${storeConstructorReal.name} instance, ${store.constructor.name} given`);
          }
          this._relations[name] = store;
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
    return (0, _lodashEs.reduce)(this._dirtyAttributes, (result, value, key) => {
      return (0, _lodashEs.isEqual)(value, this._savedAttributes[key]) ? result : result.concat(key);
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
   *  @return {boolean}
   * */
  get isDeleted() {
    return this._isDeleted;
  }

  /**
   * Преобразование данных для отправки на сервер
   * @param {?Array} [$names] Список аттрибутов или все
   * @return {Object.<String, *>}
   * */
  getSubmitValues($names = null) {
    const $attrs = this.getAttributes($names);
    const $filters = this.submitFilters();
    return (0, _lodashEs.mapValues)($attrs, ($value, $attr) => this.applyFilter($filters[$attr], $value));
  }

  /**
   * Сохраненные данные
   * @param {?Array} [$names] Имена нужных аттрибутов или будут возвращены все
   * @return {object}
   * */
  getSavedAttributes($names) {
    return $names ? (0, _lodashEs.pick)(this._savedAttributes, $names) : this._savedAttributes;
  }

  /**
   * @param {string} $name Имя аттрибута
   * @return {*} Значение аттрибута
   * */
  getSavedAttribute($name) {
    if (!(0, _lodashEs.has)(this._savedAttributes, $name)) {
      throw new Error(`Unknown attribute name "${$name}"`);
    }
    return this._savedAttributes[$name];
  }

  /**
   * @param {string} $name Имя аттрибута
   * @param {?Boolean} [$isDirty] По умолчанию true
   * @return {*} Значение аттрибута
   * @alias get
   * */
  getAttribute($name, $isDirty = true) {
    const $attrs = $isDirty ? {
      ...this._savedAttributes,
      ...this._dirtyAttributes
    } : this._savedAttributes;
    if (!(0, _lodashEs.has)($attrs, $name)) {
      throw new Error(`Unknown attribute name "${$name}"`);
    }
    return $attrs[$name];
  }

  /**
   * @param {?Array} [$names] Имена нужных аттрибутов или будут возвращены все
   * @param {?Boolean} [$isDirty] По умолчанию true
   * @return {object} Текущие аттрибуты
   * */
  getAttributes($names = null, $isDirty = true) {
    const $attrs = $isDirty ? {
      ...this._savedAttributes,
      ...this._dirtyAttributes
    } : this._savedAttributes;
    return (0, _lodashEs.isArray)($names) ? (0, _lodashEs.pick)($attrs, $names) : $attrs;
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
   * @return void
   * @protected
   * */
  _innerSetAttributes($attrs) {
    const filters = this.innerFilters();
    const safeAttrs = (0, _lodashEs.pick)($attrs, this.safeAttributes());
    const withFilters = (0, _lodashEs.mapValues)(safeAttrs, (value, key) => this.applyFilter(filters[key], value));
    Object.assign(this._dirtyAttributes, withFilters);
  }

  /**
   * Новые значения аттрибутов
   * @param {AttributesMap} $attrs
   * */
  setAttributes($attrs) {
    const beforeAttrs = this.dirtyAttributesNames;
    this._innerSetAttributes($attrs);
    const afterAttrs = this.dirtyAttributesNames;
    const diff = (0, _lodashEs.difference)(afterAttrs, beforeAttrs);
    if (diff.length > 0) {
      this.emit(this.constructor.EVENT_ATTRIBUTES_CHANGE, this.getAttributes(diff));
    }
  }

  /**
   * @param {string} name Название аттрибута
   * @param {*} value Новое значение
   * */
  setAttribute(name, value) {
    this.setAttributes({
      [name]: value
    });
  }

  /**
   * Сброс данных к первоначальным (сохраненным) значениям
   * @param {?Array} [$names] Имена аттрибутов или все
   * */
  resetAttributes($names = []) {
    this._dirtyAttributes = {};
  }

  /**
   * Валидация Модели
   * Ошибки можно прочесть из BaseModel.getErrors()
   * @param {?Array} $names Аттрибуты для валидации, или будут использованы все
   * @param {?Object} $extraConfig Дополнительная конфигурация для Валидатора
   * @return {boolean} Результат валидации
   * */
  validate($names = null, $extraConfig = null) {
    this.dropErrors();
    const $rules = this.rules();
    const $constraintsToValidate = (0, _lodashEs.isArray)($names) ? (0, _lodashEs.pick)($rules, $names) : $rules;
    // Поскольку validate.js не поддерживает создание экземпляра
    // Возможно передать дополнительные опции при валидации, которые мы берем из конфигурации Модели
    const $options = {
      ...this.getValidationConfig(),
      ...$extraConfig
    };
    const $attrs = this.getAttributes($names);
    const $errors = (0, _validate.default)($attrs, $constraintsToValidate, $options);
    if (!(0, _lodashEs.isEmpty)($errors)) {
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
   * @return {Boolean}
   * */
  get hasErrors() {
    return !(0, _lodashEs.isEmpty)(this._errors);
  }

  /**
   * Сброс ошибок
   * */
  dropErrors() {
    this._errors = {};
    this.emit(this.constructor.EVENT_ERRORS_CHANGE, this._errors);
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
    return (0, _lodashEs.get)((0, _lodashEs.values)(this._errors), '[0][0]', null);
  }

  /**
   * Создание прокси для запросов в контексте Модели
   * @return {BaseProxy} Созданный экземпляр Прокси
   * */
  get proxy() {
    if (!this.__innerProxy) {
      // Берем конфигурацию Прокси переданную в конструктор
      this.__innerProxy = _BaseClass.default.createInstance(this.getProxyConfig());
    }
    return this.__innerProxy;
  }

  /**
   * @return {Boolean}
   * */
  get isRequesting() {
    return this.proxy.isRequesting();
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
      const responseData = await proxy.doRequest(config);
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
   * @param {Array} $names Имена нужных аттрибутов или будут возвращены все
   * @return {string} JSON строка с аттрибутами
   * @throws Error В случае неудачи
   * */
  serialize($names = []) {
    try {
      return JSON.stringify(this.getSubmitValues($names));
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
   * @param {object} $responseData
   * @return {object} Индексированный объект, где ключи название аттрибутов, а значения массив ошибок
   * @protected
   * */
  _parseResponseValidationErrors($responseData) {
    /*
    * По умолчанию ожидаем от сервера ответ в формате:
    * [
     *     {
     *          "field": "cottage_id",
     *          "message": "Необходимо заполнить «Идентификатор Коттеджа»."
     *     },
     *      ...
     * ]*/
    if ($responseData[0] && $responseData[0]['message']) {
      // Собираем ошибки в индексированный объект
      return (0, _lodashEs.reduce)($responseData, (result, value) => {
        result[value.field] = [value.message];
        return result;
      }, {});
    }

    /*
    * Уже сформированный объект как есть или пустой обьект
    * */
    return Object($responseData) || {};
  }

  /**
   * Получаем данные с сервера
   * @param {?Object} [$extraConfig]
   * */
  async fetch($extraConfig = {}) {
    const url = this.urls()['fetch'];
    const method = this.verbs()['fetch'];
    const requestConfig = {
      url,
      method,
      ...$extraConfig
    };
    const data = await this.doRequest(requestConfig);
    this.setAttributes(data);
    this.commitChanges();
    this.__fetchRelationsData(data);
    this.isPhantom = false;
    this.emit(this.constructor.EVENT_FETCH, data);
    return Promise.resolve(data);
  }

  /**
   * @protected
   * */
  __fetchRelationsData(data) {
    (0, _lodashEs.forEach)(data, (value, attr) => {
      if (this.getHasRelation(attr)) {
        const relation = this[attr];
        if (relation.isModel) {
          relation.setAttributes(value);
        }
        if (relation.isStore) {
          relation.loadModels(value);
        }
      }
    });
  }

  /**
   * Сохраняем данные на сервер
   * */
  async save() {
    if (!this.isDirty) {
      return Promise.resolve({});
    }
    const url = this.urls()['save'];
    const method = this.verbs()['save'];
    const data = this.getSubmitValues((0, _lodashEs.keys)(this._dirtyAttributes));
    const responseData = await this.doRequest({
      url,
      method,
      data
    });
    this.setAttributes(responseData);
    this.commitChanges();
    this.isPhantom = false;
    this.emit(this.constructor.EVENT_SAVE, responseData);
    return Promise.resolve(responseData);
  }

  /**
   * Создаем модель на сервере
   * */
  async create() {
    const url = this.urls()['create'];
    const method = this.verbs()['create'];
    const data = this.getSubmitValues();
    const responseData = await this.doRequest({
      url,
      method,
      data
    });
    this.setAttributes(responseData);
    this.commitChanges();
    this.isPhantom = false;
    this.emit(this.constructor.EVENT_CREATE, responseData);
    return Promise.resolve(responseData);
  }

  /**
   * Удаляем модель на сервере
   * */
  async delete() {
    const url = this.urls()['delete'];
    const method = this.verbs()['delete'];
    await this.doRequest({
      url,
      method
    });
    this._isDeleted = true;
    this.isPhantom = true;
    this.emit(this.constructor.EVENT_DELETE);
    return Promise.resolve(true);
  }
}
exports.default = BaseModel;