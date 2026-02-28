const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const auth = require('../middleware/auth');
const Article = require('../models/Article');
const { check, validationResult } = require('express-validator');

// --- 📤 CONFIGURATION MULTER (UPLOAD) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        // Nom unique : article-TIMESTAMP.ext
        cb(null, 'article-' + Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Limite à 5MB
    fileFilter: function (req, file, cb) {
        const filetypes = /jpeg|jpg|png|webp/;
        const mimetype = filetypes.test(file.mimetype);
        const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) {
            return cb(null, true);
        }
        cb(new Error('Images seulement (jpeg, jpg, png, webp)!'));
    }
});

// @route   GET api/articles
// @desc    Lire tous les articles (Public)
router.get('/', async (req, res) => {
    try {
        const articles = await Article.find().sort({ createdAt: -1 });
        res.json(articles);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// @route   POST api/articles
// @desc    Créer un article (Admin seulement)
router.post('/', auth, upload.single('image'), [
    check('title', 'Titre requis').not().isEmpty(),
    check('content', 'Contenu requis').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Non autorisé' });

        // Construction de l'URL de l'image
        let imageUrl = '';
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }

        const newArticle = new Article({
            title: req.body.title,
            content: req.body.content,
            image: imageUrl
        });
        const article = await newArticle.save();
        res.json(article);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// @route   PUT api/articles/:id
// @desc    Modifier un article (Admin seulement)
router.put('/:id', auth, upload.single('image'), [
    check('title', 'Titre requis').not().isEmpty(),
    check('content', 'Contenu requis').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Non autorisé' });

        let article = await Article.findById(req.params.id);
        if (!article) return res.status(404).json({ msg: 'Article non trouvé' });

        article.title = req.body.title;
        article.content = req.body.content;

        // Si une nouvelle image est envoyée, on remplace l'ancienne
        if (req.file) {
            article.image = `/uploads/${req.file.filename}`;
        }

        await article.save();
        res.json(article);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// @route   DELETE api/articles/:id
// @desc    Supprimer un article (Admin seulement)
router.delete('/:id', auth, async (req, res) => {
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Non autorisé' });
        await Article.findByIdAndDelete(req.params.id);
        res.json({ msg: 'Article supprimé' });
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

module.exports = router;