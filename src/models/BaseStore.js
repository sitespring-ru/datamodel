import {computed, ref} from "vue";
import {isEmpty} from "lodash";
import BaseProxy from "@/models/BaseProxy.js";

/**
 * Базовый функционал хранилища
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
export default class BaseStore {
    /**
     * Объект дефолтного состояния
     * @return {Object}
     */
    getDefaults() {
        return {
            fetchUrl: null,
            fetchParams: {
                // Обычно 20 моделей стандартный лимит, чтобы запросить все модели можно передать в конструктор limit:0
                limit: 20
            },
            proxy: {
                class: BaseProxy
            }
        }
    }


    /**
     * Стандартный конструктор задает начальную конфигурацию
     * @param {Object} ctrConfig
     * */
    constructor(ctrConfig = {}) {
        // Сохраняем конфиг при котором был создан класс, для дальнейших настроек
        this._constructorConfig = ctrConfig;

        this.models = ref([]);
        this.isEmpty = computed(() => isEmpty(this.models.value));
        this.hasNextPage = ref(true);
    }


    /**
     * Задаем новые значения конфига
     * @param {Object} config
     * */
    setConfig(config = {}) {
        Object.assign(this._constructorConfig, config);
    }


    /**
     * Сброс состояния
     * */
    clear() {
        this.models.value = [];
        this.hasNextPage.value = true;
    }


    /**
     * Создание прокси для запросов в контексте Хранилища
     * @return {BaseProxy}
     * */
    getProxy() {
        if (!this._innerProxy) {
            // Берем конфигурацию Прокси переданную в конструктор
            const proxyConfig = this._constructorConfig.proxy || {};
            const proxyConstructor = proxyConfig.class;
            this._innerProxy = new proxyConstructor(proxyConfig);
        }
        return this._innerProxy;
    }
}