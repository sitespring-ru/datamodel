import BaseClass from "./BaseClass.js";
import {isEmpty, isNull, isObject, isString} from "lodash-es";

/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 *
 * @class BaseStoreFilter
 * @property {String|Number} id
 * @property {String} property
 * @property {String|Array|Number|Boolean} value
 * @property {String} operator
 */
export default class BaseStoreFilter extends BaseClass {
    static OPERATOR_GREATER = '>'
    static OPERATOR_GREATER_OR_EQUAL = '>='
    static OPERATOR_LOWER = '<'
    static OPERATOR_LOWER_OR_EQUAL = '<='
    static OPERATOR_EQUAL = '='
    static OPERATOR_NOT_EQUAL = '!='
    static OPERATOR_LIKE = '~'
    static OPERATOR_IN = '><'
    static OPERATOR_NOT_IN = '<>'
    static OPERATOR_BETWEEN = '-'

    get defaults() {
        return {
            id: null,
            value: true,
            property: null,
            operator: this.constructor.OPERATOR_EQUAL,
            serializeToString: null,
            serializeToQuery: null
        }
    }

    get id() {
        return this.initialConfig.id || this.property
    }

    static get operators() {
        return [
            this.OPERATOR_GREATER,
            this.OPERATOR_GREATER_OR_EQUAL,
            this.OPERATOR_LOWER,
            this.OPERATOR_LOWER_OR_EQUAL,
            this.OPERATOR_EQUAL,
            this.OPERATOR_NOT_EQUAL,
            this.OPERATOR_LIKE,
            this.OPERATOR_IN,
            this.OPERATOR_NOT_IN,
            this.OPERATOR_BETWEEN
        ]
    }


    static parseFromMixed(mixed) {
        if (mixed instanceof BaseStoreFilter) {
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
            throw new Error('Filter`s property must be set');
        }
        return new this({
            id: obj.id,
            operator: obj.operator,
            property: obj.property,
            value: obj.value
        })
    }


    static parseFromString(str) {
        const reg = new RegExp('([\\w]+)([' + this.operators.join('|') + ']+)(.*)')
        const matches = str.match(reg)
        if (null != matches) {
            return new this({
                id: matches[1],
                operator: matches[2],
                value: JSON.parse(matches[3])
            })
        }
        return null;
    }

    toString() {
        return `${this.id}${this.operator}${JSON.stringify(this.value)}`;
    }
}
