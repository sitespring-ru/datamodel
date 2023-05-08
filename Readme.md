# Sitespring datamodel
Framework and environment agnostic data management base classes, supporting 
- fields validation
- fetching
- proxy to fetch and error handling
- store of models
- CRUD operations
- work in browser and nodejs envs


Перед установкой в локальный проект, пакуем

    npm pack 

Далее в нужном проекте устанавливаем

    win>> npm i D:/projects/sitespring/repos/datamodel/sitespring-datamodel-x.y.z.tgz -D
    unix>> npm i /projects/sitespring/repos/datamodel/sitespring-datamodel-x.y.z.tgz -D

## Разработка

Запуск тестов

    npm run test

Документация

    npm run docs

Компиляция babel

    npm run build