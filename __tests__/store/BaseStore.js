/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import Model from "../../src/Model.js";
import Store from "../../src/Store.js";
import {expect, jest} from '@jest/globals';
import Sorter from "../../src/Sorter.js";


// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
// axios.create.mockReturnThis();

class PersonTestModel extends Model {
    get fields() {
        return {
            ...super.fields,
            name: null,
            age: null
        };
    }
}

class PersonsTestStore extends Store {
    get model() {
        return PersonTestModel;
    }
}


describe('Работа с моделями', () => {
    test('Добавление', (done) => {
        const $model = new PersonTestModel({name: 'xoxa', age: 37});
        const $store = new PersonsTestStore({hasEmitter: true});
        $store.loadModels([{name: 'foo'}, {name: 'xoxa', age: 37}, {name: 'xoxa', age: 37}]);

        $store.on(PersonsTestStore.EVENT_MODELS_CHANGE, (modelsChanged) => {
            expect($store.count).toEqual(4);
            expect($store.findById($model.getId()).getAttributes()).toMatchObject({name: 'xoxa', age: 37});
            expect(modelsChanged).toEqual([$model]);
            done();
        });

        $store.loadModel($model);

    });

    test('Удаление', () => {
        const $store = new PersonsTestStore();
        let $model = $store.loadModel({name: 'xoxa', age: 37});
        expect($store.count).toEqual(1);
        expect($store.isEmpty).toBeFalsy();

        $store.emit = jest.fn();
        expect($store.remove($model)).toBeTruthy();
        expect($store.count).toEqual(0);
        expect($store.isEmpty).toBeTruthy();

        expect($store.emit).toBeCalledTimes(2);
        expect($store.emit).toHaveBeenNthCalledWith(1, $store.constructor.EVENT_MODELS_CHANGE, [$model]);
        expect($store.emit).toHaveBeenNthCalledWith(2, $store.constructor.EVENT_MODELS_REMOVED, [$model]);
    });


    test('Очищение', () => {
        /** @type {PersonsTestStore} $store */
        const $store = new PersonsTestStore({isPaginated: true, pageSize: 2});
        $store.loadModels([{name: 'xoxa1', age: 37}, {name: 'xoxa2', age: 37}, {name: 'xoxa3', age: 37}]);

        expect($store.isEmpty).toBeFalsy();
        expect($store.pagination.pageSize).toEqual(2);
        expect($store.pagination.pageCount).toEqual(2);

        $store.emit = jest.fn();
        const modelsToRemove = $store.models;
        const oldPagination = {...$store.pagination};

        $store.clear();
        expect($store.isEmpty).toBeTruthy();
        expect($store.pagination.pageSize).toEqual(2);
        expect($store.pagination.pageCount).toEqual(1);

        expect($store.emit).toBeCalledTimes(2);
        expect($store.emit).toHaveBeenNthCalledWith(1, $store.constructor.EVENT_MODELS_CHANGE, modelsToRemove);
        expect($store.emit).toHaveBeenNthCalledWith(2, $store.constructor.EVENT_MODELS_REMOVED, modelsToRemove);
    });


    test('Поиск', () => {
        const $store = new PersonsTestStore();
        $store.loadModels({id: 1, name: 'xoxa1', age: 11});
        const $model = $store.loadModel({id: 2, name: 'xoxa2', age: 22});

        expect($store.findById(2)).toEqual($model);
        expect($store.find({age: 22}).getId()).toEqual(2);
        expect($store.find({name: 'bobr'})).toBeFalsy();
        expect($store.find((model) => model.getAttribute('name') === 'xoxa2')).toEqual($model);
    });


    test('Сериализация моделей в массив', () => {
        const data = [{id: 666, name: 'xoxa1', age: 11}, {id: 1, name: 'xoxa2'}, {id: 2, age: 33}];
        const expected = [{id: 666, name: 'xoxa1', age: 11}, {id: 1, name: 'xoxa2', age: null}, {id: 2, name: null, age: 33}];
        const $store = new PersonsTestStore();
        $store.loadModels(data);
        expect($store.toArray()).toEqual(expected);
    });

    test('Суммирование ИТОГО', () => {
        const $store = new PersonsTestStore();
        $store.loadModels([{id: 666, name: 'xoxa1', age: 11}, {id: 1, name: 'xoxa2'}, {id: 2, age: 33}]);
        expect($store.sumBy('age')).toEqual(44);
    })

    test('Загрузка с сервера', (done) => {
        /** @type {PersonsTestStore} $store */
        const $store = new PersonsTestStore({fetchUrl: 'https://api.com', hasEmitter: true});
        const mockModels = [
            {id: 1, name: 'foo'},
            {id: 2, name: 'xoxa1', age: 37}
        ];
        $store.doRequest = jest.fn().mockResolvedValue(mockModels);

        $store.on($store.constructor.EVENT_FETCH, (data) => {
            expect(data).toEqual(mockModels);
            expect($store.doRequest).toHaveBeenCalledTimes(1);
            expect($store.isFetched).toBeTruthy();
            done();
        });
        $store.fetch();
    });

    test('Загрузка с сервера один раз', async () => {
        /** @type {PersonsTestStore} $store */
        const $store = new PersonsTestStore({fetchUrl: 'https://api.com'});
        $store.doRequest = jest.fn();

        await $store.ensureFetched();
        expect($store.doRequest).toHaveBeenCalledWith({url: 'https://api.com', params: {}});

        await $store.ensureFetched();
        // Второй раз не был вызван запрос
        expect($store.doRequest).toHaveBeenCalledTimes(1);
        expect($store.isFetched).toBeTruthy();
    });


    test('Перезагрузка', (done) => {
        /** @type {PersonsTestStore} $store */
        const $store = new PersonsTestStore({fetchUrl: 'https://api.com', hasEmitter: true});
        const mockModels = [
            {id: 1, name: 'foo'},
            {id: 2, name: 'xoxa1', age: 37}
        ];
        $store.doRequest = jest.fn().mockResolvedValue(mockModels);

        $store.on($store.constructor.EVENT_FETCH, (data) => {
            expect(data).toEqual(mockModels);
            expect($store.doRequest).toHaveBeenCalledTimes(1);
            expect($store.isFetched).toBeTruthy();
            done();
        });
        $store.reload();
    });
});


describe('Работа с фильтрами', () => {
    test('Добавление и удаление через конструктор', () => {
        /** @type {PersonsTestStore} */
        let $store = new PersonsTestStore({
            filters: [{property: 'age'}]
        });
        expect($store.filters[0]).toMatchObject({property: 'age', operator: "=", value: true});
        expect($store.hasFilters).toBeTruthy();
        expect($store.filtersCount).toEqual(1);

        // Напрямую через setter как в куонструторе
        expect(() => $store.filters = [{value: 'huyEgoZnaet'}])
            .toThrowError('Filter`s property must be set');

        $store.removeAllFilters();
        expect($store.hasFilters).toBeFalsy();
        expect($store.filtersCount).toEqual(0);
    });

    test('Добавление через метод', (done) => {
        let $store = new PersonsTestStore({hasEmitter: true});
        $store.on($store.constructor.EVENT_FILTERS_CHANGE, ({newFilters}) => {
            expect($store.hasFilters).toBeTruthy();
            expect($store.filtersCount).toEqual(1);
            expect(newFilters[0]).toMatchObject({
                id: 'id1',
                property: 'age'
                , operator: "="
                , value: true
            });
            done();
        });
        $store.addFilter({id: 'id1', property: 'age'});
    });


    test('Удаление через метод', (done) => {
        let $store = new PersonsTestStore({hasEmitter: true});
        $store.addFilter({property: 'age'});
        $store.on($store.constructor.EVENT_FILTERS_CHANGE, ({newFilters, oldFilters}) => {
            expect($store.filtersCount).toEqual(0);
            expect(newFilters).toEqual([]);
            expect(oldFilters[0]).toMatchObject({property: 'age', operator: "=", value: true});
            done();
        });
        // Не вызовет события
        $store.removeFilter('notExists');
        // Вызовет событие
        $store.removeFilter('age');
    });

    test('Фильтрация на стороне сервера', async () => {
        /** @type {PersonsTestStore} */
        let $store = new PersonsTestStore({fetchUrl: 'https://api.com'});
        $store.setFilters([
            {property: 'age', value: 16, operator: '>='},
            {property: 'name'}
        ]);
        $store.doRequest = jest.fn();
        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                filters: "age>=16,name=true"
            }
        });
    });

    test('Авто фильтрация', async () => {
        /** @type {PersonsTestStore} */
        let $store = new PersonsTestStore({autoFilter: true});
        $store.doRequest = jest.fn();

        await $store.addFilter({property: 'name'});
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {
                filters: "name=true"
            }
        });

        $store.setFilters([
            {property: 'age', value: 16, operator: '>='},
            {property: 'name'}
        ]);
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {
                filters: "age>=16,name=true"
            }
        });

        $store.removeAllFilters();
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {}
        });
    });
});


describe('Работа с сортировкой', () => {
    test('Через конструктор', () => {
        /** @type {PersonsTestStore} */
        let $store = new PersonsTestStore({
            sorters: [{property: 'age', direction: 'desc'}]
        });
        expect($store.sortersCount).toEqual(1);
        expect($store.hasSorters).toBeTruthy();
        expect(() => $store.addSorter({noprop: 'invalid'})).toThrowError('Sorter`s property must be set');
        // Напрямую через setter как в куонструторе
        expect(() => $store.sorters = [{property: 'invalid', direction: 'huyEgoZnaet'}])
            .toThrowError("Invalid sorter's direction huyEgoZnaet");

        $store.removeAllSorters();
        expect($store.hasSorters).toBeFalsy();
        expect($store.sortersCount).toEqual(0);
    });

    test('Добавление метод', (done) => {
        let $store = new PersonsTestStore({hasEmitter: true});
        $store.on(Store.EVENT_SORTERS_CHANGE, ({newSorters, oldSorters}) => {
            expect($store.sortersCount).toEqual(1);
            expect(newSorters).toEqual($store.sorters);
            expect(newSorters[0]).toMatchObject({property: 'age', direction: 'asc'});
            done();
        });
        $store.addSorter({property: 'age'});
    });

    test('Удаление через метод', (done) => {
        let $store = new PersonsTestStore({hasEmitter: true});
        $store.addSorter({property: 'age'});

        $store.on(Store.EVENT_SORTERS_CHANGE, ({newSorters, oldSorters}) => {
            expect($store.sortersCount).toEqual(0);
            expect(newSorters).toEqual([]);
            expect(oldSorters[0]).toMatchObject({property: 'age', direction: 'asc'});
            done();
        });

        $store.removeSorter('age');
    });

    test('Сортировка на стороне сервера', async () => {
        let $store = new PersonsTestStore({fetchUrl: 'https://api.com'});
        $store.setSorters([{property: 'age', direction: 'desc'}, {property: 'name'}]);
        $store.doRequest = jest.fn();
        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                sort: '-age,name'
            }
        });
    });

    test('Авто сортировка', async () => {
        /** @type {PersonsTestStore} */
        let $store = new PersonsTestStore({autoSort: true});
        $store.doRequest = jest.fn();

        await $store.addSorter({property: 'name'});
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {
                sort: "name"
            }
        });

        $store.setSorters([
            {property: 'age', direction: Sorter.SORT_DESC},
            {property: 'name'}
        ]);
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {
                sort: "-age,name"
            }
        });

        $store.removeAllSorters();
        expect($store.doRequest).toHaveBeenCalledWith({
            url: '/base-model',
            params: {}
        });
    });
});


describe('Пагинация', () => {
    const mockModels = [
        {id: 1, name: 'foo'},
        {id: 2, name: 'xoxa1', age: 37},
        {id: 3, name: 'xoxa2', age: 27},
        {id: 4, name: 'xoxa3', age: 57},
        {id: 5, name: 'xoxa4', age: 137}
    ];
    const modelsToData = ($models) => $models.map($model => $model.getAttributes());

    test('Работа с локальными данными', () => {
        const $store = new PersonsTestStore({isPaginated: true, pageSize: 2});
        $store.loadModels(mockModels);
        expect($store.pagination).toEqual({
            currentPage: 1,
            pageSize: 2,
            totalCount: 5,
            pageCount: 3
        });
    });

    test('Проверка свойства', () => {
        const $store = new PersonsTestStore({isPaginated: true});
        expect($store.isPaginated).toBeTruthy();

        $store.isPaginated = false;
        expect($store.isPaginated).toBeFalsy();
    });



    test('Получение с сервера', async () => {
        const $store = new PersonsTestStore({isPaginated: true, pageSize: 2});
        //  Сервер вернет след страницу данных
        $store.doRequest = jest.fn().mockResolvedValue({
            data: mockModels.slice(2, 4),
            _meta: {
                currentPage: 1,
                pageSize: 2,
                totalCount: 5,
                pageCount: 3
            }
        });
        expect($store.isFetched).toBeFalsy();
        expect($store.hasNextPage).toBeFalsy(); // Not fetched yet

        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({url: '/base-model', params: {limit: 2, page: 1}});
        expect($store.count).toEqual(2);
        expect($store.hasNextPage).toBeTruthy();

        //  Сервер вернет послед. страницу данных
        $store.doRequest = jest.fn().mockResolvedValue({
            data: mockModels.slice(4),
            _meta: {
                currentPage: 3,
                perPage: 2,
                totalCount: 5,
                pageCount: 3
            }
        });
        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({url: '/base-model', params: {limit: 2, page: 2}});
        expect($store.count).toEqual(3);
        // Были загружены все модели
        expect($store.hasNextPage).toBeFalsy();

        $store.clear();
        expect($store.pagination.currentPage).toEqual(1);
        expect($store.isEmpty).toBeTruthy();
        expect($store.hasNextPage).toBeFalsy();
    });


    test('Initial config magic props', () => {
        const store = new PersonsTestStore({
            isPaginated: true,
            pageSize: 6,
            foo: 'bar'
        });

        expect(store.foo).toBeUndefined() // no 'foo' in defaults
        expect(store.pageSize).toEqual(6)
        expect(store.isPaginated).toBeTruthy()
    })
});
