/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import BaseClass from "../../src/BaseClass";

class BaseTestClass extends BaseClass {
    mother = 'fucker';
    foo = {
        bar: 'baz'
    }
}

test('Конфигурация через конcтруктор', () => {
    const $baseClass = new BaseTestClass({foo: {bar: 'boo'}});
    // Значение осталось прежним, т.к. конструктор вызывался в контексте родителя (BaseClass)
    expect($baseClass.foo).toMatchObject({bar: 'baz'});
});


test('Конфигурация через статический хелпер', () => {
    /** @type {BaseTestClass} */
    const $baseClass = BaseTestClass.createInstance({foo: {bar: 'boo'}});
    expect($baseClass.foo).toMatchObject({bar: 'boo'});
    expect($baseClass.mother).toMatch('fucker');
})


test('Попытка задать несуществующее свойство', () => {
    let $baseClass;
    $baseClass = new BaseTestClass({'no': 'baz'});
    expect($baseClass.no).toBeUndefined();
    expect(() => BaseTestClass.createInstance({'class': BaseTestClass, 'no': 'baz'})).toThrowError('Unknown property "no"');
});


test('Строковое представление', () => {
    const $baseClass = new BaseClass();
    expect($baseClass + '').toEqual('BaseClass');
});

test('Деструктуризация', () => {
    const $baseClass = new BaseClass({
        hasEmitter: true
    });
    // force create emitter instance
    $baseClass.on('foo', () => {
        throw new Error('This shouldn`t be called');
    });
    $baseClass.destroy();
    expect($baseClass.__emitterInstance).toBeNull();
    $baseClass.emit('foo');
});