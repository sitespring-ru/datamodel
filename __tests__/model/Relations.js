/**
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel";
import BaseStore from "../../src/BaseStore";
import axios from "axios";

// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
axios.create.mockReturnThis();

class Author extends BaseModel {
    entityName = 'author';

    fields() {
        return {
            ...super.fields(),
            name: null,
            contributors: []
        };
    }

    relations() {
        return {
            contributors: {
                type: 'hasMany',
                model: Author,
                foreignKey: 'author_id'
            }
        }
    }
}

class Article extends BaseModel {
    entityName = 'article';

    fields() {
        return {
            ...super.fields(),
            title: null
        };
    }
}

/**
 * @class Book
 * @property {Author} author
 * @property {BaseStore<Article>} articles
 * */
class Book extends BaseModel {
    entityName = 'book';

    fields() {
        return {
            ...super.fields(),
            title: 'bar',
            articles: [],
            author: null
        };
    }

    relations() {
        return {
            articles: {
                type: 'hasMany',
                model: Article,
                foreignKey: 'book_id'
            },
            author: {
                type: 'hasOne',
                model: Author
            }
        }
    }
}

describe('Магические геттеры связей', () => {
    test('Данные из аттрибутов', () => {
        const theBook = new Book({
            title: 'Книга 1',
            author: {
                name: 'Иванов П.'
            },
            articles: [
                {
                    title: 'Артикл 1'
                }, {
                    title: 'Артикл 2'
                },
            ]
        });

        expect(theBook.author).toBeInstanceOf(Author);
        expect(theBook.author.name).toEqual('Иванов П.');
        expect(theBook.articles).toBeInstanceOf(BaseStore);
        expect(theBook.articles.count).toBe(2);
    });
});

describe('Магические сеттеры связей', () => {
    test('Корректный тип модели', () => {
        const theBook = new Book();
        theBook.author = new Author({name: 'Иванова С.'});
        expect(theBook.author.name).toEqual('Иванова С.');
    });
    test('Некорректный тип модели', () => {
        const theBook = new Book();
        expect(() => {
            theBook.author = 'foo';
        }).toThrowError();
        expect(() => {
            theBook.author = new Object({foo: 'bar'});
        }).toThrow('author relation expect Author instance, Object given');
    });
    test('Корректный тип хранилища', () => {
        const theBook = new Book();
        theBook.articles = new BaseStore();
        expect(theBook.articles).toBeInstanceOf(BaseStore);
    });
    test('Некорректный тип хранилища', () => {
        const theBook = new Book();
        expect(() => {
            theBook.articles = new Book();
        }).toThrowError();
        expect(() => {
            theBook.articles = new Object({foo: 'bar'});
        }).toThrow('articles relation expect BaseStore instance, Object given');
    });
});

describe('Автоматически заполняем связанные данные из ответа', () => {
    test('Связанная модель', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            author: {
                name: 'Иванов П.'
            }
        });

        expect(theBook.author.name).toBeNull();
        await theBook.fetch();
        expect(theBook.author.name).toBe('Иванов П.');
    });

    test('Связанное хранилище', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            articles: [
                {
                    title: 'Артикл 1'
                }, {
                    title: 'Артикл 2'
                },
            ]
        });

        expect(theBook.articles.count).toBe(0);
        await theBook.fetch();
        expect(theBook.articles.count).toBe(2);
    });

    test('Вложенные связанные данные', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            author: {
                id: 1,
                name: 'Иванов',
                contributors: [
                    {
                        id: 3,
                        name: 'Иванова Р.'
                    }, {
                        id: 2,
                        name: 'Соколов Ю.Н.'
                    },
                ]
            }
        });


        await theBook.fetch();
        expect(theBook.author.name).toEqual('Иванов');
        expect(theBook.author.contributors.count).toBe(2);
        expect(theBook.author.contributors.isStore).toBeTruthy();
        expect(theBook.author.contributors.findById(2).name).toEqual('Соколов Ю.Н.');
    });
});


describe('Конфигурация связанных классов', () => {
    test('Фильтры связанного хранилища', async () => {
        const theBook = new Book({id: 1});
        theBook.articles.doRequest = jest.fn();

        await theBook.articles.fetch();
        expect(theBook.articles.model).toEqual(Article);
        expect(theBook.articles.doRequest).toHaveBeenCalledWith({
            url: '/article'
            , params: {
                filters: [{property: 'book_id', value: 1, operator: '='}]
            }
        });
    });

    test('Прокси связанной модели', async () => {
        const theBook = new Book({id: 1, author: {id: 1}});
        theBook.author.doRequest = jest.fn();

        await theBook.author.fetch();
        expect(theBook.author.doRequest).toHaveBeenCalledWith({
            url: 'author/1',
            method: 'GET'
        });
    });
});