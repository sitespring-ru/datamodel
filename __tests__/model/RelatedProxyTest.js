/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel.js";
import {describe, expect, test} from "@jest/globals";
import {BaseProxy} from "../../index.js";

class Proxy1 extends BaseProxy {
}

class Proxy2 extends BaseProxy {
}

class ChildModelA extends BaseModel {
}

class ChildModelB extends BaseModel {
}

class ParentModel extends BaseModel {
    get relations() {
        return {
            'relationA': {
                type: 'hasOne',
                model: ChildModelA
            },
            'relationB': {
                type: 'hasOne',
                model: ChildModelB,
                proxy: Proxy2
            },
            'relationC': {
                type: 'hasMany',
                model: ChildModelA,
                foreignKey: 'c_id'
            },
            'relationD': {
                type: 'hasMany',
                model: ChildModelB,
                proxy: Proxy2,
                foreignKey: 'd_id'
            }
        }
    }
}

describe('Related proxies tests', () => {
    test('Expect related model proxy to be inherited from parent', () => {
        const model = new ParentModel({}, {proxy: Proxy1})
        expect(model.relationA.proxy).toBeInstanceOf(Proxy1)
    })

    test('Expect related model proxy to be configured from relation config', () => {
        const model = new ParentModel({}, {proxy: Proxy1})
        expect(model.relationB.proxy).toBeInstanceOf(Proxy2)
    })

    test('Expect related store proxy to be inherited from parent', () => {
        const model = new ParentModel({}, {proxy: Proxy1})
        expect(model.relationC.proxy).toBeInstanceOf(Proxy1)
    })

    test('Expect related store proxy to be configured from relation config', () => {
        const model = new ParentModel({}, {proxy: Proxy1})
        expect(model.relationD.proxy).toBeInstanceOf(Proxy2)
    })
})
