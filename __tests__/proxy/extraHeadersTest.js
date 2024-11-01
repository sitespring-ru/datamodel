/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */


import {describe, expect, jest, test} from "@jest/globals";
import BaseProxy from "../../src/Proxy.js";

describe('Proxy extra headers tests', () => {
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


    test('Extra headers via class extending', () => {
        class ExtProxy extends BaseProxy {
            get extraHeaders() {
                return {
                    'Proxy-Type': 'Ext'
                }
            }
        }
        ExtProxy.bearerToken = null;
        const proxy = new ExtProxy({
            extraHeaders: {
                'Authorization': 'Bearer 123'
            }
        });

        expect(proxy.requestHeaders).toEqual({
            'Proxy-Type': 'Ext'
        })
    })


    test('Extra headers via class extending with constructor merge', () => {
        class Ext2Proxy extends BaseProxy {
            get extraHeaders() {
                return {
                    ...this.initialConfig.extraHeaders,
                    'Proxy-ext2': 'true'
                }
            }
        }

        Ext2Proxy.bearerToken = null;

        const proxy = new Ext2Proxy({
            extraHeaders: {
                'Authorization': 'Bearer 456',
                'Extra-ext2': 'true',
            }
        });

        expect(proxy.requestHeaders).toEqual({
            'Proxy-ext2': 'true',
            'Authorization': 'Bearer 456',
            'Extra-ext2': 'true',
        })
    })
});
