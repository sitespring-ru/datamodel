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
    get entityName() {
        return 'test-model'
    }

    get fields() {
        return {
            ...super.fields,
            dob: '',
            name: ''
        };
    }
}

class TestProxy extends BaseProxy {
}

// Эмулируем модуль целиком
jest.mock('axios');

describe('Store fetching model tests', () => {
    test('Fetch single model', async () => {
        const store = new BaseStore({
            model: TestModel,
            proxy: TestProxy
        });
        store.proxy.doRequest = jest.fn().mockResolvedValue({dob: '2000-02-03', name: 'Mike', id: 55});

        const model = await store.fetchOne(13);
        expect(model.proxy).toBeInstanceOf(TestProxy);
        expect(model).toBeInstanceOf(TestModel);
        expect(store.proxy.doRequest).toHaveBeenCalledWith({method: 'GET', url: 'test-model/13'});
        expect(model.$).toEqual({dob: '2000-02-03', name: 'Mike', id: 55})
        expect(store.count).toBe(0)
    })

    test('Fetch batchs model', async () => {
        const store = new BaseStore();
        store.proxy.doRequest = jest.fn().mockResolvedValue([
            {dob: '2000-02-03', name: 'Mike', id: 51},
            {dob: '2000-02-03', name: 'Mike', id: 52},
            {dob: '2000-02-03', name: 'Mike', id: 53},
        ]);

        await store.fetchModels([51,52,53]);
        expect(store.proxy.doRequest).toHaveBeenCalledWith({
            method: 'GET',
            url: 'base-model',
            params:{
                filters: 'id><[51,52,53]'
            }
        })
        expect(store.count).toBe(3)
    })

});
