/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseClass from "@/models/BaseClass.js";

BaseClass.getDefaultConfig = jest.fn(() => ({
    mother: 'fucker'
}));

beforeEach(() => {
    BaseClass.dropDefaultsChanged();
});

test('Конфигурация через конcтруктор', () => {
    let $baseClass;

    // Пустой
    $baseClass = new BaseClass();
    expect($baseClass.getConfig()).toMatchObject({mother: 'fucker'});

    // Расширяем
    $baseClass = new BaseClass({foo: {bar: 'baz'}});
    expect($baseClass.getConfig()).toMatchObject({mother: 'fucker', foo: {bar: 'baz'}});
    expect($baseClass.getConfig('foo.bar')).toEqual('baz');

    // Переопределяем конфиг
    $baseClass = new BaseClass({mother: 'hooker'});
    expect($baseClass.getConfig()).toMatchObject({mother: 'hooker'});
});


test('Смена конфигурации с ключом + событие', (done) => {
    let $baseClass;
    $baseClass = new BaseClass({some: ['another', 'config']});

    // Вешаем обработчик
    $baseClass.on(BaseClass.EVENT_CONFIG_CHANGE, (e) => {
        expect(e).toMatchObject({path: 'some.another', value: 'huy'});
        done();
    });

    // Не должен вызвать изменений
    $baseClass.setConfig('mother', 'fucker');
    // Должен вызвать изменения
    $baseClass.setConfig('some.another', 'huy');
});


test('Меняем конфигурацию глобально', () => {
    BaseClass.setDefaultConfig('global', 'scope...');
    const $baseClass = new BaseClass();
    expect($baseClass.getConfig()).toMatchObject({
        mother: 'fucker',
        global: 'scope...'
    })
});

test('Строковое представление', () => {
    const $baseClass = new BaseClass();
    expect($baseClass + '').toEqual('BaseClass');
});


test('Конструктор', () => {
    const $baseClass = BaseClass.createInstance({
        class: BaseClass,
        foo: 'bar',
        any: 'data'
    });

    expect($baseClass).toBeInstanceOf(BaseClass);
    expect($baseClass.getConfig()).toEqual({
        mother: 'fucker',
        foo: 'bar',
        any: 'data'
    });
});