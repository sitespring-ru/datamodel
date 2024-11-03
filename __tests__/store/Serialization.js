/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {describe, expect} from "@jest/globals";
import BaseStore from "../../src/BaseStore.js";
import BaseFilter from "../../src/BaseFilter.js";
import BaseSorter from "../../src/BaseSorter.js";

describe('Store serialization tests', () => {
    test('URLSearchParams', () => {
        const params = new URLSearchParams('?q=bazz&filters=created_at-["2024-10-21","2024-10-31"]:foo>bar');
        const store = new BaseStore();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new BaseFilter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: BaseFilter.OPERATOR_BETWEEN
            }),
            new BaseFilter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: BaseFilter.OPERATOR_GREATER
            })
        ])
    })

    test('Parse from query string', () => {
        const params = 'q=bazz&filters=created_at-["2024-10-21","2024-10-31"]:foo>bar&sort=-name,birthdate';
        const store = new BaseStore();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new BaseFilter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: BaseFilter.OPERATOR_BETWEEN
            }),
            new BaseFilter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: BaseFilter.OPERATOR_GREATER
            })
        ])

        expect(store.sorters).toEqual([
            new BaseSorter({
                id: 'name',
                property: 'name',
                direction: BaseSorter.SORT_DESC,
            }),
            new BaseSorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: BaseSorter.SORT_ASC
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
        const store = new BaseStore();
        store.parseMetasFromRequestParams(params);
        expect(store.filters).toEqual([
            new BaseFilter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: BaseFilter.OPERATOR_BETWEEN
            }),
            new BaseFilter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: BaseFilter.OPERATOR_GREATER
            })
        ])

        expect(store.sorters).toEqual([
            new BaseSorter({
                id: 'name',
                property: 'name',
                direction: BaseSorter.SORT_DESC,
            }),
            new BaseSorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: BaseSorter.SORT_ASC
            })
        ])

        expect(store.searchString).toEqual('bazz')
    })

    test('Serialize to object', () => {
        const store = new BaseStore();
        store.setSearchString('bazz');
        store.filters = [
            new BaseFilter({
                id: 'created_at',
                property: 'created_at',
                value: ["2024-10-21", "2024-10-31"],
                operator: BaseFilter.OPERATOR_BETWEEN
            }),
            new BaseFilter({
                id: 'foo',
                property: 'foo',
                value: 'bar',
                operator: BaseFilter.OPERATOR_GREATER
            })
        ]
        store.sorters = [
            new BaseSorter({
                id: 'name',
                property: 'name',
                direction: BaseSorter.SORT_DESC,
            }),
            new BaseSorter({
                id: 'birthdate',
                property: 'birthdate',
                direction: BaseSorter.SORT_ASC
            })
        ]

        expect(store.serializeMetasToRequestParams()).toEqual({
            q: 'bazz',
            filters: 'created_at-["2024-10-21","2024-10-31"]:foo>bar',
            sort: '-name,birthdate'
        })

    })
})
