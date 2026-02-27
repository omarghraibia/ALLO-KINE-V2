const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { OAuth2Client } = require('google-auth-library');

// --- 📝 INSCRIPTION CLASSIQUE ---
router.post('/register', async (req, res) => {
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
            res.json({ token, role: user.role });
        });
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

// --- 🔐 CONNEXION CLASSIQUE ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Identifiants invalides' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Identifiants invalides' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: user.role }); 
        });
    } catch (err) {
        res.status(500).send('Erreur serveur');
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
        
        // Si l'utilisateur Google n'existe pas encore, on crée son compte en 1 seconde
        if (!user) {
            user = new User({
                nom: family_name || 'Inconnu',
                prenom: given_name || 'Inconnu',
                telephone: '', // Pas de téléphone via Google
                email: email,
                password: sub, // L'ID Google sert de mot de passe sécurisé (caché)
                role: 'patient'
            });
            await user.save();
        }

        // Création du passe-partout (Token)
        const jwtPayload = { user: { id: user.id, role: user.role } };
        jwt.sign(jwtPayload, process.env.JWT_SECRET, { expiresIn: '24h' }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: user.role });
        });

    } catch (error) {
        console.error("Erreur Google Auth:", error);
        res.status(401).json({ msg: 'Authentification Google échouée' });
    }
});

module.exports = router;
