import Model from "../../src/Model.js";
import Store from "../../src/Store.js";

/**
 * Testing iterator protocol
 *
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */

describe('Iterator protocol', () => {
    const store = new Store();
    store.loadModels([{id: 1}, {id: 37}, {id: 7}]);

    test('Цикл for of', () => {
        for (let model of store) {
            expect(model).toBeInstanceOf(Model);
        }
    });
});
