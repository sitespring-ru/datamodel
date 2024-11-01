/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {describe, expect} from "@jest/globals";
import Store from "../../src/Store.js";
import Filter from "../../src/Filter.js";
import Sorter from "../../src/Sorter.js";

describe('Store serialization tests', () => {
    test('URLSearchParams', () => {
        const params = new URLSearchParams('?q=bazz&filters=created_at-["2024-10-21","2024-10-31"]:foo>bar');
        const store = new Store();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new Filter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: Filter.OPERATOR_BETWEEN
            }),
            new Filter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: Filter.OPERATOR_GREATER
            })
        ])
    })

    test('Parse from query string', () => {
        const params = 'q=bazz&filters=created_at-["2024-10-21","2024-10-31"]:foo>bar&sort=-name,birthdate';
        const store = new Store();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new Filter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: Filter.OPERATOR_BETWEEN
            }),
            new Filter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: Filter.OPERATOR_GREATER
            })
        ])

        expect(store.sorters).toEqual([
            new Sorter({
                id: 'name',
                property: 'name',
                direction: Sorter.SORT_DESC,
            }),
            new Sorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: Sorter.SORT_ASC
            })
        ])

        expect(store.searchString).toEqual('bazz')
    })

    test('Parse from object', () => {
        const params = {
            q: 'bazz',
            filters: 'created_at-["2024-10-21","2024-10-31"]:foo>bar',
            sort: '-name,birthdate'
        };
        const store = new Store();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new Filter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: Filter.OPERATOR_BETWEEN
            }),
            new Filter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: Filter.OPERATOR_GREATER
            })
        ])

        expect(store.sorters).toEqual([
            new Sorter({
                id: 'name',
                property: 'name',
                direction: Sorter.SORT_DESC,
            }),
            new Sorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: Sorter.SORT_ASC
            })
        ])

        expect(store.searchString).toEqual('bazz')
    })

    test('Serialize to object', () => {
        const store = new Store();
        store.setSearchString('bazz');
        store.filters = [
            new Filter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: Filter.OPERATOR_BETWEEN
            }),
            new Filter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: Filter.OPERATOR_GREATER
            })
        ]
        store.sorters = [
            new Sorter({
                id: 'name',
                property: 'name',
                direction: Sorter.SORT_DESC,
            }),
            new Sorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: Sorter.SORT_ASC
            })
        ]

        expect(store.serializeMetasToRequestParams()).toEqual({
            q: 'bazz',
            filters: 'created_at-["2024-10-21","2024-10-31"]:foo>bar',
            sort: '-name,birthdate'
        })

    })
})
