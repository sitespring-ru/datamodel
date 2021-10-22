/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import axios from "axios";
import BaseModel from "../../src/models/BaseModel";
import BaseStore from "../../src/models/BaseStore";


// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();

class TestModel extends BaseModel {
    getDefaultAttributes() {
        return {
            ...super.getDefaultAttributes(),
            name: null,
            age: null
        };
    }
}

class TestStore extends BaseStore {
    static getDefaultConfig() {
        return {
            ...super.getDefaultConfig(),
            model: {
                class: TestModel
            }
        }
    }
}


describe('Работа с моделями', () => {
    test('Добавление в конструкторе', () => {
        const $model = new TestModel({name: 'xoxa', age: 37});
        const $store = new TestStore([$model, {name: 'foo'}, {name: 'xoxa', age: 37}, {name: 'xoxa', age: 37}]);
        $store.emit = jest.fn();

        expect($store.getCount()).toEqual(4);
        expect($store.emit).toHaveBeenCalledTimes(0);
    });

    test('Добавление через метод', () => {
        const $store = new TestStore([], {pageSize: 0});
        let $model = new TestModel({name: 'xoxa', age: 37});
        $store.emit = jest.fn();

        $store.loadModel($model);
        expect($store.getCount()).toEqual(1);
        expect($store.emit).toHaveBeenLastCalledWith($store.constructor.EVENT_MODEL_ADD, {models: [$model]})

        $model = $store.loadModel({name: 'foo'});
        expect($store.getCount()).toEqual(2);
        expect($store.emit).toHaveBeenLastCalledWith($store.constructor.EVENT_MODEL_ADD, {models: [$model]})

        // Добавление повторно Модели
        $store.loadModel($model);
        expect($store.getCount()).toEqual(2);
        expect($store.emit).toHaveBeenLastCalledWith($store.constructor.EVENT_MODEL_UPDATE, {models: [$model]})
    });

    test('Удаление', () => {
        let $model = new TestModel({name: 'xoxa', age: 37});
        const $store = new TestStore([$model]);
        $store.emit = jest.fn();

        $store.remove($model);
        expect($store.getCount()).toEqual(0);
        expect($store.emit).toHaveBeenLastCalledWith($store.constructor.EVENT_MODEL_REMOVE, {model: $model})
    });

    test('Очищение', () => {
        let $model = new TestModel({name: 'xoxa', age: 37});
        const $store = new TestStore([$model]);
        $store.emit = jest.fn();

        expect($store.isEmpty()).toBeFalsy();
        $store.clear();
        expect($store.isEmpty()).toBeTruthy();
        expect($store.emit).toHaveBeenLastCalledWith($store.constructor.EVENT_MODEL_CLEAR, {});
    });
});


describe('Работа с фильтрами', () => {
    test('Добавление и удаление через конструктор', () => {
        let $store = new TestStore([], {
            filters: {
                id1: {property: 'age'}
            }
        });
        expect($store.hasFilters()).toBeTruthy();
        expect($store.getFiltersCount()).toEqual(1);
    });
    test('Добавление и удаление через метод', () => {
        let $store = new TestStore();
        $store.emit = jest.fn();
        $store.addFilter('id1', {property: 'age'});
        expect($store.hasFilters()).toBeTruthy();
        expect($store.getFiltersCount()).toEqual(1);
        expect($store.emit).toBeCalledWith($store.constructor.EVENT_FILTERS_CHANGE, {filters: {id1: {property: 'age'}}});

        $store.dropAllFilters();
        expect($store.hasFilters()).toBeFalsy();
        expect($store.getFiltersCount()).toEqual(0);
        expect($store.emit).toBeCalledWith($store.constructor.EVENT_FILTERS_CHANGE, {filters: null});
    });
    test('Фильтрация на стороне клиента', () => {
        let $store = new TestStore([{age: 16, name: 'vasa'}, {age: 13, name: 'ola'}, {name: 'kristi'}, {age: 17}]);
        $store.setFilters({
            // Должен оставить {age: 16, name: 'vasa'}, {age: 17}
            byAge: {property: 'age', value: 16, operator: '>='},
            // Должен оставить {age: 16, name: 'vasa'}, {age: 13, name: 'ola'}, {name: 'kristi'}
            byName: {property: 'name'}
        });
        // Результат будет {age: 16, name: 'vasa'}
        let filteredModels = $store.filter();
        expect(filteredModels).toHaveLength(1);
        expect(filteredModels[0].getAttributes()).toMatchObject({age: 16, name: 'vasa'});
    });
    test('Фильтрация на стороне сервера', async () => {
        let $store = new TestStore([], {fetchUrl: 'https://api.com'});
        $store.setFilters({
            byAge: {property: 'age', value: 16, operator: '>='},
            byName: {property: 'name'}
        });
        $store.doRequest = jest.fn();
        try {
            await $store.fetch();
        } catch (e) {
        }
        expect($store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                filters: [{property: 'age', value: 16, operator: '>='}, {property: 'name'}]
            }
        });
    });
});


describe('Работа с сортировкой', () => {
    test('Добавление и удаление через конструктор', () => {
        let $store = new TestStore([], {
            sorters: {
                id1: {property: 'age', direction: 'desc'}
            }
        });
        expect($store.hasSorters()).toBeTruthy();
        expect($store.getSortersCount()).toEqual(1);
    });
    test('Добавление и удаление через метод', () => {
        let $store = new TestStore();
        $store.emit = jest.fn();
        $store.addSorter('id1', {property: 'age'});
        expect($store.hasSorters()).toBeTruthy();
        expect($store.getSortersCount()).toEqual(1);
        expect($store.emit).toBeCalledWith($store.constructor.EVENT_SORTERS_CHANGE, {sorters: {id1: {property: 'age'}}});

        $store.dropAllSorters();
        expect($store.hasSorters()).toBeFalsy();
        expect($store.getSortersCount()).toEqual(0);
        expect($store.emit).toBeCalledWith($store.constructor.EVENT_SORTERS_CHANGE, {sorters: null});
    });

    test('Сортировка на стороне сервера', async () => {
        let $store = new TestStore([], {fetchUrl: 'https://api.com'});
        $store.setSorters([{property: 'age', direction: 'desc'}, {property: 'name'}]);
        $store.doRequest = jest.fn();
        try {
            await $store.fetch();
        } catch (e) {
        }
        expect($store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                sort: '-age,name'
            }
        });
    });
});

describe('Пагинация', () => {
});