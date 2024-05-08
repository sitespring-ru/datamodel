/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */


import {describe, expect, jest, test} from "@jest/globals";
import {BaseProxy} from "../../index.js";

describe('Work with extra params', () => {
    test('Setup extra params', async () => {
        const proxy = new BaseProxy({
            extraParams: {foo: 'bar', fields: 'id', expand: 'ref'}
        });

        // Эмулируем ответ
        proxy.axios.request = jest.fn().mockResolvedValue({});

        await proxy.doRequest();
        expect(proxy.axios.request).toBeCalledWith({
            params: {foo: 'bar', fields: 'id', expand: 'ref'}
        })
    });
});