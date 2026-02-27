const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- 📝 INSCRIPTION (Pour les patients) ---
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
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: user.role });
        });
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});

// --- 🔐 CONNEXION (Pour tout le monde) ---
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        let user = await User.findOne({ email });
        if (!user) return res.status(400).json({ msg: 'Identifiants invalides' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ msg: 'Identifiants invalides' });

        const payload = { user: { id: user.id, role: user.role } };
        jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: 3600 }, (err, token) => {
            if (err) throw err;
            res.json({ token, role: user.role }); // On renvoie le token ET le rôle
        });
    } catch (err) {
        res.status(500).send('Erreur serveur');
    }
});
module.exports = router;
