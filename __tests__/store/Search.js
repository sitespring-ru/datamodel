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
        await store.search('  Foo bar   ');

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                search: 'Foo bar'
            }
        });
    });

    test('Empty value', async () => {
        const store = new BaseStore({
            fetchUrl: 'https://api.com'
        });
        store.doRequest = jest.fn();
        await store.search('  ');

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {}
        });
    });


    test('With filters', async () => {
        const store = new BaseStore({
            fetchUrl: 'https://api.com',
            searchParam: 'queryText',
            filters: {
                byAge: {property: 'age', value: 16, operator: '>='},
                byName: {property: 'name'}
            }
        });
        store.doRequest = jest.fn();
        await store.search('baz');

        expect(store.doRequest).toHaveBeenCalledWith({
            url: 'https://api.com',
            params: {
                queryText: 'baz',
                filter: "[{\"property\":\"age\",\"value\":16,\"operator\":\">=\"},{\"property\":\"name\",\"operator\":\"=\",\"value\":true}]"
            }
        });
    });
});
