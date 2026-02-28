const mongoose = require('mongoose');

const ArticleSchema = new mongoose.Schema({
    title: { type: String, required: true },
    content: { type: String, required: true },
    image: { type: String }, // URL de l'image
    author: { type: String, default: 'Dr Ghraybia' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Article', ArticleSchema);