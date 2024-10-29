/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */

import Store from "../../src/Store.js";
import {describe, expect, jest, test} from '@jest/globals';


// Эмулируем модуль целиком
jest.mock('axios');

describe('Search request test', () => {
    test('Search request default param', async () => {
        const store = new Store({
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
        const store = new Store({
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
        const store = new Store({
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
