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
            filters: {
                foo: {
                    property: 'bar',
                    value: 'baz'
                }
            }
        });
        expect(store.model).toEqual(CustomModel);
        expect(store.proxy).toBeInstanceOf(CustomProxy);
        expect(store.sorters).toEqual({
            date: {
                property: 'date',
                direction: 'asc'
            }
        });
        expect(store.filters).toEqual({
            foo: {
                property: 'bar',
                operator: '=',
                value: 'baz'
            }
        })
    })
});