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
  contentSecurityPolicy: false // Permet l'affichage du CSS et des images sans blocage
}));
app.use(cors());
app.use(express.json({ limit: '10kb' })); 
app.use(cookieParser());

// Protection contre le spam de requêtes sur l'API
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// --- 🔗 CONNEXION BASE DE DONNÉES ---
mongoose.connect(mongoUri)
  .then(() => console.log('Base de données connectée ! 🛡️'))
  .catch(err => console.error('Erreur de connexion MongoDB :', err));

// --- 📍 ROUTES DE L'API ---
app.use('/api/appointments', require('./routes/appointments'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/articles', require('./routes/articles'));

// --- 🎨 AFFICHER LE VISUEL DU SITE WEB (FRONTEND) ---
// On indique que tous les fichiers HTML/CSS/JS sont désormais dans le dossier 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Si la requête ne concerne pas l'API, on renvoie l'index.html du dossier public
app.get(/^(?!\/api).+/, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ⚙️ LANCEMENT DU SERVEUR ---
// Railway et Render utilisent la variable d'environnement PORT
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Serveur ALLO KINÉ actif sur le port ${PORT}`);
});
