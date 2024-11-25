/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */

import BaseStore from "../../src/BaseStore.js";
import {beforeEach, describe, expect, jest, test} from '@jest/globals';


// Эмулируем модуль целиком
jest.mock('axios');

describe('Dirty state tests', () => {
    let store;

    beforeEach(() => {
        store = new BaseStore()
        store.doRequest = jest.fn();
    })

    test('Change filter', async () => {
        expect(store.isDirty).toBeFalsy();
        store.addFilter({property: 'foo', value: 'bar'})
        expect(store.isDirty).toBeTruthy();
    });

    test('Change sort', async () => {
        expect(store.isDirty).toBeFalsy();
        store.addSorter({property: 'foo'})
        expect(store.isDirty).toBeTruthy();
    });

    test('Add models', async () => {
        expect(store.isDirty).toBeFalsy();
        store.loadModel({name: 'bar'})
        expect(store.isDirty).toBeTruthy();
    });

    test('Search string', async () => {
        expect(store.isDirty).toBeFalsy();
        await store.setSearchString('f');
        expect(store.isDirty).toBeTruthy();
    });

    test('Fetching', async () => {
        expect(store.isDirty).toBeFalsy();
        store.addFilter({property: 'foo', value: 'bar'})
        await store.fetch()
        expect(store.isDirty).toBeFalsy();
    });

    test('Dirty models', async () => {
        expect(store.isDirty).toBeFalsy();
        const model = store.createModel();
        store.loadModel(model);
        store.commitChanges();

        expect(store.isDirty).toBeFalsy()

        model.id = 'change'
        expect(model.isDirty).toBeTruthy()
        expect(store.isDirty).toBeTruthy()

        model.commitChanges()
        expect(model.isDirty).toBeFalsy()
        expect(store.isDirty).toBeFalsy()
    });
});
