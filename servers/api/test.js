"use strict";

var Sequelize = require('sequelize');
var sequelize = new Sequelize(
    'development', // database
    'development', // username
    'development', // password
    {
        host: 'localhost',
        dialect: 'postgres'
    }
);

var Author = sequelize.define('Author', {
    firstName: {type: Sequelize.STRING},
    lastName: {type: Sequelize.STRING}
});

var Book = sequelize.define('Book', {
    title: {type: Sequelize.STRING}
});

var firstAuthor;
var secondAuthor;

Author.hasMany(Book, {constraints: true});
Book.belongsTo(Author, {constraints: true});

var query = {
    where: {
        'Author.lastName': 'Testerson'
    },
    include: [Author]
};

sequelize.sync({force: true})
    .then(function () {
        return Author.create({firstName: 'Test', lastName: 'Testerson'});
    })
    .then(function (author1) {
        firstAuthor = author1;
        return Author.create({firstName: 'The Invisible', lastName: 'Hand'});
    })
    .then(function (author2) {
        secondAuthor = author2;
        return Book.create({AuthorId: firstAuthor.id, title: 'A simple book'});
    })
    .then(function () {
        return Book.create({AuthorId: firstAuthor.id, title: 'Another book'});
    })
    .then(function () {
        return Book.create({AuthorId: secondAuthor.id, title: 'Some other book'});
    })
    .then(function () {
        // This is the part you're after.
        return Book.count(query);
    })
    .then(function (count) {
        console.log('Count result: ' + count);
        return Book.findAll(query);
    })
    .then(function (books) {
        console.log('Books result length: ' + books.length);
        return Book.findAndCountAll(query);
    })
    .then(function () {
        console.log('There should not be an error');
        process.exit(0);
    });