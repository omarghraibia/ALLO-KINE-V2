const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const https = require('https');

// Vérifie le token reCAPTCHA côté serveur
function verifyRecaptchaToken(token) {
    return new Promise((resolve) => {
        const secret = process.env.RECAPTCHA_SECRET;
        if (!secret) return resolve(false);
        const postData = `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`;

        const options = {
            hostname: 'www.google.com',
            path: '/recaptcha/api/siteverify',
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', (chunk) => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve(parsed.success === true);
                } catch (e) {
                    resolve(false);
                }
            });
        });

        req.on('error', () => resolve(false));
        req.write(postData);
        req.end();
    });
}

// --- 📝 INSCRIPTION CLASSIQUE ---
router.post('/register', [
    // RÈGLES DE VALIDATION
    check('nom', 'Le nom est requis').not().isEmpty(),
    check('prenom', 'Le prénom est requis').not().isEmpty(),
    check('email', 'Veuillez inclure un email valide').isEmail(),
    check('password', 'Veuillez entrer un mot de passe avec 6 caractères minimum').isLength({ min: 6 })
], async (req, res) => {
    // VÉRIFICATION DES ERREURS
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { nom, prenom, telephone, email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Cet email est déjà utilisé' });

        user = new User({ nom, prenom, telephone, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            // envoyer le token dans un cookie HttpOnly sécurisé
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24h en millisecondes
            }).json({ msg: 'Inscription réussie', role: user.role });
        });
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

// --- 🔐 CONNEXION CLASSIQUE ---
router.post('/login', async (req, res) => {
    const { email, password, recaptchaToken } = req.body;
    try {
        // Vérification reCAPTCHA facultative
        if (recaptchaToken) {
            const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
            if (!recaptchaOk) return res.status(400).json({ msg: 'reCAPTCHA invalide' });
        }

        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Identifiants invalides' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Identifiants invalides' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            // envoyer le token dans un cookie HttpOnly sécurisé
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24h
            }).json({ msg: 'Connecté avec succès', role: user.role });
        });
    } catch (err) {
        res.status(500).json({ msg: 'Erreur serveur' });
    }
});

// --- 🌐 CONNEXION AVEC GOOGLE ---
router.post('/google', async (req, res) => {
    const { token } = req.body;
    const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID,  
        });
        const payload = ticket.getPayload();
        const { email, given_name, family_name, sub } = payload;

        let user = await User.findOne({ email });
        
        // Si l'utilisateur Google n'existe pas encore, on crée son compte en sécurisant le mot de passe
        if (!user) {
            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(sub, salt);
            user = new User({
                nom: family_name || 'Inconnu',
                prenom: given_name || 'Inconnu',
                telephone: '', // Pas de téléphone via Google
                email: email,
                password: hashedPassword,
                role: 'patient'
            });
            await user.save();
        }

        // Création du passe-partout (Token)
        const jwtPayload = { user: { id: user.id, role: user.role } };
        jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            // envoyer le token dans un cookie HttpOnly sécurisé
            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                maxAge: 24 * 60 * 60 * 1000 // 24h
            }).json({ msg: 'Connecté avec succès', role: user.role });
        });

    } catch (error) {
        console.error("Erreur Google Auth:", error);
        res.status(401).json({ msg: 'Authentification Google échouée' });
    }
});

// --- 🚪 DÉCONNEXION ---
router.post('/logout', (req, res) => {
    // Supprime le cookie token côté client
    res.clearCookie('token', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production'
    });
    return res.json({ msg: 'Déconnexion réussie' });
});

module.exports = router;
