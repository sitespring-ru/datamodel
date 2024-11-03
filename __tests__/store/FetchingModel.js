/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel.js"
import BaseProxy from "../../src/BaseProxy.js"
import BaseStore from "../../src/BaseStore.js"
import {expect, jest} from "@jest/globals";

class TestModel extends BaseModel {
}

class TestProxy extends BaseProxy {
}

// Эмулируем модуль целиком
// jest.mock('axios');

describe('Fetching model test', () => {
    test('Fetch model using stores proxy', async () => {
        const store = new BaseStore({
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
