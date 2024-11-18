/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */

import BaseStore from "../../src/BaseStore.js";
import {describe, expect, jest, test} from '@jest/globals';


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
            method: 'GET',
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
            method: 'GET',
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
            method: 'GET',
            params: {
                queryText: 'baz',
                filters: "age>=16:name=true"
            }
        });
    });


    test('Event handling', (done) => {
        const store = new BaseStore({hasEmitter: true})
        store.on(BaseStore.EVENT_SEARCH_CHANGE, search => {
            expect(search).toEqual('foo bar')
            done();
        })

        store.searchString = '  foo bar'
    })
});
