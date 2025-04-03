/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import BaseClass from "../../src/BaseClass";
import {BaseModel} from "../../index.js";

class BaseTestClass extends BaseClass {
    get defaults() {
        return {
            ...super.defaults,
            foo: {bar: 'baz'}
        }
    }
}

test('Defaults property has define', () => {
    const baseClass = new BaseTestClass();
    // Значение осталось прежним, т.к. конструктор вызывался в контексте родителя (BaseClass)
    expect(baseClass.foo).toMatchObject({bar: 'baz'});
});
