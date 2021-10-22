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
    defaults() {
        return {
            ...super.defaults(),
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
        expect($store.count.value).toEqual(4);
    });

    test('Добавление через метод', () => {
        const $store = new TestStore([], {pageSize: 0});
        let $model = new TestModel({name: 'xoxa', age: 37});
        $store.loadModel($model);
        expect($store.count.value).toEqual(1);

        $model = $store.loadModel({name: 'foo'});
        expect($store.count.value).toEqual(2);

        // Добавление повторно Модели
        $store.loadModel($model);
        expect($store.getCount()).toEqual(2);
    });

    test('Удаление', () => {
        const $store = new TestStore();
        let $model = $store.loadModel({name: 'xoxa', age: 37});
        expect($store.getCount()).toEqual(1);
        $store.remove($model);
        expect($store.getCount()).toEqual(0);
    });

    test('Очищение', () => {
        let $model = new TestModel({name: 'xoxa', age: 37});
        const $store = new TestStore([$model]);

        expect($store.isEmpty.value).toBeFalsy();
        $store.clear();
        expect($store.isEmpty.value).toBeTruthy();
    });

    test('Поиск', () => {
        const $model = new TestModel({id: 666, name: 'xoxa1', age: 11});
        const $store = new TestStore([$model]);
        const $modelPhantom = $store.loadModel({name: 'xoxa2', age: 22});

        expect($store.findById(666).getId()).toEqual($model.getId());
        expect($store.find({age: 22}).getId()).toEqual($modelPhantom.getId());
        expect($store.find({name: 'bobr'})).toBeFalsy();
        expect($store.find((model) => model.attributes.name === 'xoxa2').getId()).toEqual($modelPhantom.getId());
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
        expect($store.filtersCount.value).toEqual(1);
    });
    test('Добавление и удаление через метод', () => {
        let $store = new TestStore();
        $store.addFilter('id1', {property: 'age'});
        expect($store.hasFilters()).toBeTruthy();
        expect($store.filtersCount.value).toEqual(1);

        $store.dropAllFilters();
        expect($store.hasFilters()).toBeFalsy();
        expect($store.filtersCount.value).toEqual(0);

        expect(() => $store.addFilter('id1', {noprop: 'invalid'})).toThrowError('Filters property must be set');
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
                filters: [{property: 'age', value: 16, operator: '>='}, {property: 'name', operator: '=', value: true}]
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
        expect($store.sortersCount.value).toEqual(1);
    });
    test('Добавление и удаление через метод', () => {
        let $store = new TestStore();
        $store.addSorter({property: 'age'});
        expect($store.sortersCount.value).toEqual(1);

        $store.dropAllSorters();
        expect($store.sortersCount.value).toEqual(0);

        expect(() => $store.addSorter({noprop: 'invalid'}))
            .toThrowError('Expect sorter`s property');
        expect(() => $store.setSorters([{property: 'invalid', direction: 'huyEgoZnaet'}]))
            .toThrowError("Invalid sorter's direction definition huyEgoZnaet. Expect 'asc' or 'desc'");

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
    const mockModels = [{name: 'foo'}, {name: 'xoxa1', age: 37}, {name: 'xoxa2', age: 27}, {name: 'xoxa3', age: 57}, {name: 'xoxa4', age: 137},];

    test('На стороне клиента', () => {
        const $store = new TestStore(mockModels, {isPaginated: true, pageSize: 2});
        expect($store.pagination).toEqual({
            currentPage: 3,
            perPage: 2,
            totalCount: 5,
            pageCount: 3
        });
    });

    test('На стороне сервера', async () => {
        // Пусть Хранилище имеет 2 модели при инициализации, его текущая страница будет 1
        const $store = new TestStore(mockModels.slice(0, 2), {isPaginated: true, pageSize: 2});
        //  Сервер вернет след страницу данных
        $store.doRequest = jest.fn().mockResolvedValue({
            data: {
                data: mockModels.slice(2, 4),
                _meta: {
                    currentPage: 2,
                    perPage: 2,
                    totalCount: 5,
                    pageCount: 3
                }
            }
        });
        // Хранилище еще не загружалось удаленно
        expect($store.isFetched.value).toBeFalsy();
        // Здесь хранилище еще не было загружено, поэтому true
        expect($store.hasNextPage.value).toBeTruthy();

        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({url: null, params: {limit: 2, page: 2}});
        expect($store.count.value).toEqual(4);
        expect($store.hasNextPage.value).toBeTruthy();


        //  Сервер вернет послед. страницу данных
        $store.doRequest = jest.fn().mockResolvedValue({
            data: {
                data: mockModels.slice(4),
                _meta: {
                    currentPage: 3,
                    perPage: 2,
                    totalCount: 5,
                    pageCount: 3
                }
            }
        });
        await $store.fetch();
        expect($store.doRequest).toHaveBeenCalledWith({url: null, params: {limit: 2, page: 3}});
        expect($store.count.value).toEqual(5);
        // Были загружены все модели
        expect($store.hasNextPage.value).toBeFalsy();

        $store.clear();
        expect($store.pagination.currentPage).toEqual(1);
        expect($store.isEmpty.value).toBeTruthy();
        expect($store.hasNextPage.value).toBeTruthy();
    });
});