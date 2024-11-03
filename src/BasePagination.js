/**
 * @class BasePagination Represent paging data
 *
 * @author Evgeny Shevtsov, info@sitespring.ru
 * @homepage https://sitespring.ru
 * @licence Proprietary
 *
 * @property {number} pageCount Количество страниц
 * @property {number} currentPage Текущая полученная страница
 * @property {number} pageSize Размер страницы
 * @property {number} totalCount Общее количество Моделей
 */
export default class BasePagination {
    constructor(props) {
        this.pageCount = props.pageCount || 0;
        this.currentPage = props.currentPage || 1;
        this.pageSize = props.pageSize || 20;
        this.totalCount = props.totalCount;
    }

    get hasNextPage() {
        return this.pageCount > 1 && this.currentPage < this.pageCount
    }
}
