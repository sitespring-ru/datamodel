/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {expect} from "@jest/globals";
// import Filter from "../../src/Filter.js";
import {BaseFilter} from "../../index.js"

describe('Base Filters testing', () => {
    test('Create from string', () => {
        const filter = BaseFilter.parseFromMixed('foo<>[1,2,4]')
        expect(filter).toBeInstanceOf(BaseFilter);
        expect(filter.id).toEqual('foo');
        expect(filter.operator).toEqual(BaseFilter.OPERATOR_NOT_IN);
        expect(filter.value).toEqual([1, 2, 4]);
    })

    test('Create from object', () => {
        const filter = BaseFilter.parseFromMixed({
            property: 'bar',
            value: 'baz'
        })
        expect(filter).toBeInstanceOf(BaseFilter);
        expect(filter.id).toEqual('bar');
        expect(filter.operator).toEqual(BaseFilter.OPERATOR_EQUAL);
        expect(filter.value).toEqual('baz');
    })

    test('Create from instance', () => {
        const instance = new BaseFilter({
            property: 'bar',
            value: 'baz'
        });
        const filter = BaseFilter.parseFromMixed(instance)
        expect(filter).toEqual(instance);
    })

    test('String equal value', () => {
        const filter = BaseFilter.parseFromMixed('created_at="2024-10-21"')
        expect(filter.operator).toEqual(BaseFilter.OPERATOR_EQUAL);
        expect(filter.value).toEqual('2024-10-21');
    })

    test('Range value', () => {
        const filter = BaseFilter.parseFromMixed('created_at-["2024-10-21","2024-10-31"]');
        expect(filter.operator).toEqual(BaseFilter.OPERATOR_BETWEEN);
        expect(filter.value).toEqual(['2024-10-21', '2024-10-31']);
    })

    test('To string', () => {
        const filter = new BaseFilter({
            property: 'is_closed',
            value: true
        });
        expect(filter.toString()).toEqual('is_closed=true');
    })
})
