/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */


import {describe, expect, jest, test} from "@jest/globals";
import {BaseProxy} from "../../index.js";

describe('Work with extra headers', () => {
    test('Setup extra headers via constructor', async () => {
        const proxy = new BaseProxy({
            extraHeaders: {
                'Accept': 'multipart/form-data; boundary=something'
            }
        });

        // Эмулируем ответ
        proxy.axios.request = jest.fn().mockResolvedValue({});

        await proxy.doRequest();
        expect(proxy.axios.request).toBeCalledWith({
            headers: {
                'Accept': 'multipart/form-data; boundary=something'
            }
        })
    });

    test('Authorization token added', async () => {
        const proxy = new BaseProxy({
            extraHeaders: {
                'Content-Language': 'de-DE, en-CA'
            }
        });

        BaseProxy.bearerToken = 123;

        // Эмулируем ответ
        proxy.axios.request = jest.fn().mockResolvedValue({});

        await proxy.doRequest();
        expect(proxy.axios.request).toBeCalledWith({
            headers: {
                'Content-Language': 'de-DE, en-CA',
                'Authorization': 'Bearer 123'
            }
        })
    });
});