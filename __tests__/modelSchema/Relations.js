/**
 * @author Evgeny Shevtsov, g.info.hh@gmail.com
 * 
 * @licence Proprietary
 */
import ModelSchema from "../../src/ModelSchema";


class Author extends ModelSchema {
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
                schema: Author,
                foreignKey: 'author_id'
            }
        }
    }
}

class Article extends ModelSchema {
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
class Book extends ModelSchema {
    entityName = 'book';

    fields() {
        return {
            ...super.fields(),
            title: 'bar',
            articles: [],
            author: null,
            author_id: null
        };
    }

    relations() {
        return {
            articles: {
                type: 'hasMany',
                schema: Article,
                foreignKey: 'book_id'
            },
            author: {
                type: 'hasOne',
                schema: Author,
                foreignKey: 'author_id'
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

        expect(theBook.author).toBeInstanceOf(Object);
        expect(theBook.author.name).toEqual('Иванов П.');
        expect(theBook.articles).toBeInstanceOf(Array);
        expect(theBook.articles.length).toBe(2);
        expect(theBook.getHasRelation('articles')).toBeTruthy();
        expect(theBook.getHasRelation('author')).toBeTruthy();
        expect(theBook.getHasRelation('foo')).toBeFalsy();
    });
});