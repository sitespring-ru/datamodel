import BaseModel from "../../src/BaseModel";
import BaseStore from "../../src/BaseStore";

/**
 * Testing iterator protocol
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */

describe('Iterator protocol', () => {
    const store = new BaseStore();
    store.loadModels([{id: 1}, {id: 37}, {id: 7}]);

    test('Цикл for of', () => {
        for (let model of store) {
            expect(model).toBeInstanceOf(BaseModel);
        }
    });
});