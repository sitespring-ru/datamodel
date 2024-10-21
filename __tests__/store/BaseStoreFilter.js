/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {expect} from "@jest/globals";
import BaseStoreFilter from "../../src/BaseStoreFilter.js";

describe('BaseStoreFilters', () => {
    test('Create from string', () => {
        const filter = BaseStoreFilter.parseFromMixed('foo<>[1,2,4]')
        expect(filter).toBeInstanceOf(BaseStoreFilter);
        expect(filter.id).toEqual('foo');
        expect(filter.operator).toEqual(BaseStoreFilter.OPERATOR_NOT_IN);
        expect(filter.value).toEqual([1, 2, 4]);
    })

    test('Create from object', () => {
        const filter = BaseStoreFilter.parseFromMixed({
            property: 'bar',
            value: 'baz'
        })
        expect(filter).toBeInstanceOf(BaseStoreFilter);
        expect(filter.id).toEqual('bar');
        expect(filter.operator).toEqual(BaseStoreFilter.OPERATOR_EQUAL);
        expect(filter.value).toEqual('baz');
    })

    test('Create from instance', () => {
        const instance = new BaseStoreFilter({
            property: 'bar',
            value: 'baz'
        });
        const filter = BaseStoreFilter.parseFromMixed(instance)
        expect(filter).toEqual(instance);
    })

    test('String equal value', () => {
        const filter = BaseStoreFilter.parseFromMixed('created_at="2024-10-21"')
        expect(filter.operator).toEqual(BaseStoreFilter.OPERATOR_EQUAL);
        expect(filter.value).toEqual('2024-10-21');
    })

    test('Range value', () => {
        const filter = BaseStoreFilter.parseFromMixed('created_at-["2024-10-21","2024-10-31"]');
        expect(filter.operator).toEqual(BaseStoreFilter.OPERATOR_BETWEEN);
        expect(filter.value).toEqual(['2024-10-21', '2024-10-31']);
    })

    test('To string', () => {
        const filter = new BaseStoreFilter({
            property: 'is_closed',
            value: true
        });
        expect(filter.toString()).toEqual('is_closed=true');
    })
})
