const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { check, validationResult } = require('express-validator');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');
const https = require('https');
const crypto = require('crypto');

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

    const { nom, prenom, telephone, email, password, recaptchaToken } = req.body;
    try {
        // vérifier reCAPTCHA si fourni
        if (recaptchaToken) {
            const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
            if (!recaptchaOk) return res.status(400).json({ msg: 'reCAPTCHA invalide' });
        }
        let user = await User.findOne({ email });
        if (user) return res.status(400).json({ msg: 'Cet email est déjà utilisé' });

        user = new User({ nom, prenom, telephone, email, password });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        await user.save();

        const payload = { user: { id: user.id, role: user.role } };
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24h en millisecondes
            sameSite: 'Strict' // Protection CSRF
        }).json({ msg: 'Inscription réussie', role: user.role });
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

// --- 🔐 CONNEXION CLASSIQUE ---
// --- ✉️ MOT DE PASSE OUBLIÉ ---
router.post('/forgot', async (req, res) => {
    const { email, recaptchaToken } = req.body;
    try {
        if (recaptchaToken) {
            const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
            if (!recaptchaOk) return res.status(400).json({ msg: 'reCAPTCHA invalide' });
        }
        const user = await User.findOne({ email });
        if (user) {
            const token = crypto.randomBytes(20).toString('hex');
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1h
            await user.save();
            // ici on enverrait un email, pour l'instant on logge
            console.log(`Réinitialisation mot de passe : http://localhost:5000/reset.html?token=${token}`);
        }
        // ne pas indiquer si l'adresse existe ou non
        res.json({ msg: "Si l'email est enregistré, un lien de réinitialisation a été envoyé." });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erreur serveur');
    }
});

// --- 🔒 RÉINITIALISATION DU MOT DE PASSE ---
router.post('/reset', async (req, res) => {
    const { token, password, recaptchaToken } = req.body;
    try {
        if (recaptchaToken) {
            const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
            if (!recaptchaOk) return res.status(400).json({ msg: 'reCAPTCHA invalide' });
        }
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        if (!user) return res.status(400).json({ msg: 'Token invalide ou expiré' });
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(password, salt);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();
        res.json({ msg: 'Mot de passe mis à jour avec succès' });
    } catch (err) {
        console.error(err);
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
        const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24h
            sameSite: 'Strict'
        }).json({ msg: 'Connecté avec succès', role: user.role });
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
        const token = jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' });

        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            maxAge: 24 * 60 * 60 * 1000, // 24h
            sameSite: 'Strict'
        }).json({ msg: 'Connecté avec succès', role: user.role });

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
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'Strict'
    });
    return res.json({ msg: 'Déconnexion réussie' });
});

// --- ✅ VÉRIFIER L'AUTHENTIFICATION ---
router.get('/verify', (req, res) => {
    const token = req.cookies && req.cookies.token;
    
    if (!token) {
        return res.status(401).json({ msg: 'Non authentifié' });
    }
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        return res.json({ 
            msg: 'Authentifié',
            role: decoded.user.role,
            id: decoded.user.id
        });
    } catch (err) {
        res.clearCookie('token', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'Strict'
        });
        return res.status(401).json({ msg: 'Token invalide' });
    }
});

module.exports = router;
