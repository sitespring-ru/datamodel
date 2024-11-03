import BaseClass from "./BaseClass.js";
import {isObject, isString} from "lodash-es";

/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 *
 * @class BaseSorter Represent basic sorter
 * @property {String|Number} id
 * @property {String} property
 * @property {String} direction
 */
export default class BaseSorter extends BaseClass {
    static SORT_ASC = 'asc'
    static SORT_DESC = 'desc'

    get defaults() {
        return {
            id: null,
            property: null,
            direction: this.constructor.SORT_ASC
        }
    }


    constructor(config) {
        super(config);
        if (config.direction) {
            this.constructor.ensureDirection(config.direction)
        }
    }

    get id() {
        return this.initialConfig.id || this.property
    }

    get direction() {
        return this.initialConfig.direction
    }

    set direction(direction) {
        this.constructor.ensureDirection(direction)
        this.initialConfig.direction = direction
    }

    static ensureDirection(direction) {
        if ([this.SORT_ASC, this.SORT_DESC].indexOf(direction) < 0) {
            throw new Error(`Invalid sorter's direction ${direction}`);
        }
    }

    static get operators() {
        return [
            this.SORT_ASC,
            this.SORT_DESC,
        ]
    }


    static parseFromMixed(mixed) {
        if (mixed instanceof BaseSorter) {
            return mixed;
        }
        if (isObject(mixed)) {
            return this.parseFromObject(mixed)
        }
        if (isString(mixed)) {
            return this.parseFromString(mixed)
        }
        return null
    }

    static parseFromObject(obj) {
        if (!obj.property) {
            throw new Error('Sorter`s property must be set');
        }

        return new this({
            id: obj.id,
            property: obj.property,
            direction: obj.direction
        })
    }


    static parseFromString(str) {
        const reg = new RegExp('^(-?)([\\w]+)$')
        const matches = str.match(reg)
        if (null != matches) {
            return new this({
                id: matches[2],
                property: matches[2],
                direction: matches[1] === '-' ? this.SORT_DESC : this.SORT_ASC
            })
        }
        return null;
    }

    toString() {
        return `${this.direction !== this.constructor.SORT_ASC ? '-' : ''}${this.id}`;
    }
}
