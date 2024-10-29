/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import {expect} from "@jest/globals";
import Sorter from "../../src/Sorter.js";

describe('Base Store testing', () => {
    test('Create from string', () => {
        const filter = Sorter.parseFromMixed('foo')
        expect(filter).toBeInstanceOf(Sorter);
        expect(filter.id).toEqual('foo');
        expect(filter.direction).toEqual(Sorter.SORT_ASC);
        expect(filter.property).toEqual('foo');
    })

    test('Create from object', () => {
        const filter = Sorter.parseFromMixed({
            property: 'bar',
            direction: 'desc'
        })
        expect(filter).toBeInstanceOf(Sorter);
        expect(filter.id).toEqual('bar');
        expect(filter.direction).toEqual(Sorter.SORT_DESC);
        expect(filter.property).toEqual('bar');
    })

    test('To string', () => {
        const filter = new Sorter({
            property: 'name',
            direction: Sorter.SORT_DESC
        });
        expect(filter.toString()).toEqual('-name');
    })
})
