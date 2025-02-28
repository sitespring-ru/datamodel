/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 *
 * @licence Proprietary
 */
import BaseModel from "../../src/BaseModel.js";
import BaseStore from "../../src/BaseStore.js";
import {expect, jest, test} from '@jest/globals'
import {expectedError} from "@babel/core/lib/errors/rewrite-stack-trace.js";

// Эмулируем модуль целиком
jest.mock('axios');
// Эмулируем работу конструктора, т.к. наш BaseProxy будет создавать экземпляр axios через axios.create
// @see https://stackoverflow.com/questions/51393952/mock-inner-axios-create
// axios.create.mockReturnThis();

class Author extends BaseModel {
    entityName = 'author';

    get fields() {
        return {
            ...super.fields,
            name: null
        };
    }

    get relations() {
        return {
            contributors: {
                type: 'hasMany',
                model: Author,
                foreignKey: 'author_id'
            }
        }
    }

    get rules() {
        return {
            name: {
                presence: true
            }
        }
    }
}

class Article extends BaseModel {
    entityName = 'article';

    get fields() {
        return {
            ...super.fields,
            title: null
        };
    }

    get rules() {
        return {
            title: {
                presence: true
            }
        }
    }
}

/**
 * @class Book
 * @property {Author} author
 * @property {BaseStore<Article>} articles
 * */
class Book extends BaseModel {
    entityName = 'book';

    get fields() {
        return {
            ...super.fields,
            title: 'bar',
            author_id: null
        };
    }

    get relations() {
        return {
            articles: {
                type: 'hasMany',
                model: Article,
                foreignKey: 'book_id'
            },
            author: {
                model: Author,
                type: 'hasOne',
                foreignKey: 'author_id'
            }
        }
    }
}

describe('Referencing between related models', ()=>{
    test('Expected referenced model know about referencing parent', ()=>{
        const book = new Book();
        expect(book.author.isRelated).toBeTruthy();
        expect(book.author.relatedParent).toEqual(book);
    })
})

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
    test('Foreign key', () => {
        const theBook = new Book();
        const theAuthor = new Author({name: 'Иванова С.'});
        theBook.author = theAuthor;
        expect(theBook.author_id).toEqual(theAuthor.id);
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
            method: 'GET',
            url: 'article'
            , params: {
                filters: "book_id=1"
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


describe('Dirty state in relation', () => {
    test('Fetch hasOne realtion', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            author: {
                name: 'Иванов П.'
            }
        });

        await theBook.fetch();
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.author.isDirty).toBeFalsy();
        theBook.author.name = 'foo';
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.isDirtyWithRelated).toBeTruthy();
        expect(theBook.author.isDirty).toBeTruthy();
    })

    test('Add model to hasMany relation', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            articles: [
                {
                    title: 'Артикл 1'
                }, {
                    title: 'Артикл 2'
                }
            ]
        });

        await theBook.fetch();
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.articles.isDirty).toBeFalsy();

        theBook.articles.loadModel({id: 3, title: 'Article 3'})
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.isDirtyWithRelated).toBeTruthy();
        expect(theBook.articles).toBeTruthy();
    })

    test('Edit model in hasMany relation', async () => {
        const theBook = new Book();
        theBook.proxy.doRequest = jest.fn().mockResolvedValue({
            title: 'Книга 1',
            articles: [
                {
                    id: 1,
                    title: 'Артикл 1'
                }, {
                    title: 'Артикл 2'
                }
            ]
        });

        await theBook.fetch();
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.articles.isDirty).toBeFalsy();

        const article = theBook.articles.findById(1)
        article.title = 'Article 1'
        expect(theBook.isDirty).toBeFalsy();
        expect(theBook.isDirtyWithRelated).toBeTruthy();
        expect(theBook.articles).toBeTruthy();
    })
});


describe('Submit values with relations', () => {
    test('collect data', () => {
        const theBook = new Book({
            id: 1,
            title: 'Книга 1',
            author: {
                id: 1,
                name: 'Иванов П.'
            },
            articles: [
                {
                    id: 1,
                    title: 'Артикл 1'
                }, {
                    id: 2,
                    title: 'Артикл 2'
                },
            ]
        });

        expect(theBook.getSubmitValues()).toEqual({
            id: 1,
            author_id: null,
            title: 'Книга 1'
        });
        expect(theBook.getSubmitValues(undefined, true)).toEqual({
            id: 1,
            author_id: null,
            title: 'Книга 1',
            author: {
                id: 1,
                name: 'Иванов П.'
            },
            articles: [
                {
                    id: 1,
                    title: 'Артикл 1'
                }, {
                    id: 2,
                    title: 'Артикл 2'
                },
            ]
        });
    })
});


describe('Validation with relations', () => {
    test('validate model', () => {
        const theBook = new Book();
        theBook.loadData({
            id: 1,
            title: 'Книга 1',
            author: {
                id: 1
            }
        });

        expect(theBook.validateWithRelative()).toBeFalsy();
        expect(theBook.errors).toEqual({
            author: {
                name: "can't be blank"
            }
        })
    })

    test('validate store', () => {
        const theBook = new Book({
            id: 1,
            title: 'Книга 1',
            articles: [
                {
                    id: 1
                }, {
                    id: 2,
                    title: 'Article 2'
                },
            ]
        });
        expect(theBook.validateWithRelative()).toBeFalsy();
        expect(theBook.errors).toEqual({
            'articles[0]': {
                title: "can't be blank"
            }
        })
    })
})
