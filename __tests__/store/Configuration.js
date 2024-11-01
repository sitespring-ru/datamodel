/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import Store from "../../src/Store.js";
import {expect} from "@jest/globals";
import Proxy from "../../src/Proxy.js";
import BaseModel from "../../src/Model.js";


class CustomModel extends BaseModel {
}

class CustomProxy extends Proxy {
}


describe('Configuration', () => {
    test('Constructor', () => {
        const store = new Store({
            model: CustomModel,
            proxy: CustomProxy,
            sorters: [{
                property: 'date',
                direction: 'asc'
            }],
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
        expect(store.sorters[0]).toMatchObject({
            property: 'date',
            direction: 'asc'
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
        const store = new Store();
        expect(store.proxy).toBeInstanceOf(Proxy)
        store.proxy = {
            type: CustomProxy,
            baseUrl: 'foo/bar'
        }
        expect(store.proxy).toBeInstanceOf(CustomProxy)
        expect(store.proxy.baseUrl).toBe('foo/bar')
    })

    test('Set models', () => {
        const store = new Store({}, [{title: 'foo'}, {title: 'bar'}]);
        expect(store.models).toHaveLength(2)
    })
});
