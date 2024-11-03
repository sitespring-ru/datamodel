/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {expect} from "@jest/globals";
import BaseSorter from "../../src/BaseSorter.js";

describe('Base Store testing', () => {
    test('Create from string', () => {
        const filter = BaseSorter.parseFromMixed('foo')
        expect(filter).toBeInstanceOf(BaseSorter);
        expect(filter.id).toEqual('foo');
        expect(filter.direction).toEqual(BaseSorter.SORT_ASC);
        expect(filter.property).toEqual('foo');
    })

    test('Create from object', () => {
        const filter = BaseSorter.parseFromMixed({
            property: 'bar',
            direction: 'desc'
        })
        expect(filter).toBeInstanceOf(BaseSorter);
        expect(filter.id).toEqual('bar');
        expect(filter.direction).toEqual(BaseSorter.SORT_DESC);
        expect(filter.property).toEqual('bar');
    })

    test('To string', () => {
        const filter = new BaseSorter({
            property: 'name',
            direction: BaseSorter.SORT_DESC
        });
        expect(filter.toString()).toEqual('-name');
    })
})
