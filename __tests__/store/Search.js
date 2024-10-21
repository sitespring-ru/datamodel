/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */

import BaseModel from "../../src/BaseModel";
import BaseStore from "../../src/BaseStore";
import {expect, jest} from '@jest/globals';


// Эмулируем модуль целиком
jest.mock('axios');

describe('Search request test', () => {
    test('Search request default param', async () => {
        const store = new BaseStore({
            fetchUrl: 'https://api.com'
        });
        store.doRequest = jest.fn();
        store.setSearchString('  Foo bar   ');
        await store.fetch();

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                q: 'Foo bar'
            }
        });
    });

    test('Empty value', async () => {
        const store = new BaseStore({
            fetchUrl: 'https://api.com'
        });
        store.doRequest = jest.fn();
        store.setSearchString('  ');
        await store.reload();

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {}
        });
    });


    test('With filters', async () => {
        const store = new BaseStore({
            fetchUrl: 'https://api.com',
            searchParam: 'queryText',
            filters: [
                {property: 'age', value: 16, operator: '>='},
                {property: 'name'}
            ]
        });
        store.doRequest = jest.fn();
        store.setSearchString('baz');
        await store.fetch();

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                queryText: 'baz',
                filter: "age>=16,name=true"
            }
        });
    });
});
