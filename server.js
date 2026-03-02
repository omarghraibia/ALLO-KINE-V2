require('dotenv').config(); // 1. Charger la config en tout premier
const express = require('express');
const mongoose = require('mongoose');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');

// URI Mongo : utiliser la variable d'env si fournie, sinon fallback local
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/allo-kine';
if (!process.env.MONGO_URI) {
  console.warn('⚠️  Avertissement : la variable d\'environnement MONGO_URI est absente. Utilisation du fallback local.');
} else {
  console.log('✅ Configuration Cloud détectée : Utilisation de MongoDB Atlas.');
}

const app = express();

// --- 📂 CRÉATION DU DOSSIER UPLOADS SI INEXISTANT ---
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir, { recursive: true });
}

// --- 🛡️ MIDDLEWARES DE SÉCURITÉ ---
app.use(helmet({
  contentSecurityPolicy: false // Permet l'affichage du CSS et des scripts externes (Google, PayPal)
}));

// Autoriser les cookies via CORS
app.use(cors({
    origin: true, // Autorise l'origine de la requête
    credentials: true // INDISPENSABLE pour que les cookies httpOnly passent
}));

// CORRECTION : Limite augmentée à 2mb pour permettre les longs articles de blog
app.use(express.json({ limit: '2mb' })); 
app.use(cookieParser());

// Protection contre le spam de requêtes sur l'API
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// --- 🔗 CONNEXION BASE DE DONNÉES ---
mongoose.connect(mongoUri)
  .then(() => console.log('Base de données connectée ! 🛡️'))
  .catch(err => console.error('Erreur de connexion MongoDB :', err));

// --- 🚀 ROUTES DE L'API ---
app.use('/api/appointments', require('./src/routes/appointments'));
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/articles', require('./src/routes/articles'));

// --- 🎨 AFFICHER LE VISUEL DU SITE WEB (FRONTEND) ---
// CORRECTION : Active la recherche des fichiers .html automatiquement (ex: /cabinet chargera /cabinet.html)
app.use(express.static(path.join(__dirname, 'public'), {
    extensions: ['html']
}));

// CORRECTION ARCHITECTURE : Gestion des erreurs 404 (Page non trouvée)
// Si l'utilisateur tape une URL qui n'existe ni dans le dossier public, ni dans l'API :
app.use((req, res, next) => {
    if (req.originalUrl.startsWith('/api')) {
        // Si c'est une fausse route API, renvoyer une erreur JSON 404
        res.status(404).json({ msg: 'Route API introuvable' });
    } else {
        // Si c'est une fausse page du site, rediriger proprement vers l'accueil
        res.redirect('/');
        // Note: Tu pourrais aussi créer une page '404.html' dans 'public' et faire :
        // res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
    }
});

// --- ⚙️ LANCEMENT DU SERVEUR ---
// Railway et Zeabur utilisent la variable d'environnement PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur ALLO KINÉ actif sur le port ${PORT}`);
});
