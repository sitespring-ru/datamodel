/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import Model from "../../src/Model.js"
import Proxy from "../../src/Proxy.js"
import Store from "../../src/Store.js"
import {expect, jest} from "@jest/globals";

class TestModel extends Model {
}

class TestProxy extends Proxy {
}

// Эмулируем модуль целиком
// jest.mock('axios');

describe('Fetching model test', () => {
    test('Fetch model using stores proxy', async () => {
        const store = new Store({
            model: TestModel,
            proxy: TestProxy
        });


        // store.proxy.doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike', id: 55});
        // const model = await store.fetchOne(13);
        // expect(model.proxy).toBeInstanceOf(TestProxy);
        // expect(model).toBeInstanceOf(TestModel);
        // expect(store.doRequest).toHaveBeenCalledWith({url: 'some/BaseUrl/base-model/13'});

    })
});
