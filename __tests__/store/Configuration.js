/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseStore from "../../src/BaseStore.js";
import {expect} from "@jest/globals";
import BaseProxy from "../../src/BaseProxy.js";
import {BaseModel} from "../../index.js";


class CustomModel extends BaseModel{}
class CustomProxy extends BaseProxy {
}


describe('Configuration', () => {
    test('Constructor', () => {
        const store = new BaseStore({
            model: CustomModel,
            proxy: CustomProxy
        });
        expect(store.model).toEqual(CustomModel);
        expect(store.proxy).toBeInstanceOf(CustomProxy);
    })
});