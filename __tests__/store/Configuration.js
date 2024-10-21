/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseStore from "../../src/BaseStore.js";
import {expect} from "@jest/globals";
import BaseProxy from "../../src/BaseProxy.js";
import {BaseModel} from "../../index.js";


class CustomModel extends BaseModel {
}

class CustomProxy extends BaseProxy {
}


describe('Configuration', () => {
    test('Constructor', () => {
        const store = new BaseStore({
            model: CustomModel,
            proxy: CustomProxy,
            sorters: {
                date: {
                    property: 'date',
                    direction: 'asc'
                }
            },
            filters: [
                {
                    id: 'foo',
                    property: 'bar',
                    value: 'baz'
                }
            ]
        });
        expect(store.model).toEqual(CustomModel);
        expect(store.proxy).toBeInstanceOf(CustomProxy);
        expect(store.sorters).toEqual({
            date: {
                property: 'date',
                direction: 'asc'
            }
        });
        expect(store.filters[0]).toMatchObject(
            {
                id: 'foo',
                property: 'bar',
                operator: '=',
                value: 'baz'
            })
    })

    test('Set proxy', () => {
        const store = new BaseStore();
        expect(store.proxy).toBeInstanceOf(BaseProxy)
        store.proxy = {
            type: CustomProxy,
            baseUrl: 'foo/bar'
        }
        expect(store.proxy).toBeInstanceOf(CustomProxy)
        expect(store.proxy.baseUrl).toBe('foo/bar')
    })

    test('Set models', () => {
        const store = new BaseStore({}, [{title: 'foo'}, {title: 'bar'}]);
        expect(store.models).toHaveLength(2)
    })
});
