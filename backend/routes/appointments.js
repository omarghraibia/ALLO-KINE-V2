const express = require('express');
const router = express.Router();
const https = require('https');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const multer = require('multer');
const path = require('path');
const { check, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth'); // Import du cadenas

// Fonction de vérification reCAPTCHA (identique à auth.js)
function verifyRecaptchaToken(token) {
    return new Promise((resolve) => {
        const secret = process.env.RECAPTCHA_SECRET;
        if (!secret) return resolve(true); // Si pas de secret configuré, on laisse passer (dev mode)
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

// --- CONFIGURATION UPLOAD (Dossier Médical) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, 'doc-' + Date.now() + path.extname(file.originalname));
    }
});
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// Route Publique (Les patients créent un RDV)
router.post('/', upload.array('documents', 3), [
    check('nom', 'Le nom est requis').not().isEmpty(),
    check('prenom', 'Le prénom est requis').not().isEmpty(),
    check('telephone', 'Le téléphone est requis').not().isEmpty(),
    check('motif', 'Le motif est requis').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { nom, prenom, email, telephone, motif, diagnostic, recaptchaToken, dateRdv, heureRdv } = req.body;

        // Vérification reCAPTCHA
        const recaptchaOk = await verifyRecaptchaToken(recaptchaToken);
        if (!recaptchaOk) return res.status(400).json({ msg: 'Vérification anti-robot échouée (reCAPTCHA)' });

        // Tentative de liaison avec l'utilisateur si connecté (via cookie)
        let userId = null;
        if (req.cookies && req.cookies.token) {
            try {
                const decoded = jwt.verify(req.cookies.token, process.env.JWT_SECRET);
                userId = decoded.user.id;
            } catch (e) {
                // Token invalide ou expiré, on continue en anonyme
            }
        }

        // --- TÉLÉMÉDECINE ONE-CLICK ---
        let meetingLink = '';
        if (motif && motif.toLowerCase().includes('visio')) {
            // Génère un lien unique sécurisé
            const roomName = `AlloKine-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
            meetingLink = `https://meet.jit.si/${roomName}`;
        }

        // --- GESTION DES FICHIERS ---
        const documents = req.files ? req.files.map(file => `/uploads/${file.filename}`) : [];

        const newAppointment = new Appointment({ 
            nom, prenom, email, telephone, motif, diagnostic, 
            user: userId,
            dateRdv, // Nouveau champ agenda
            heureRdv, // Nouveau champ agenda
            documents, // Nouveau champ dossier médical
            meetingLink // Nouveau champ télémédecine
        });
        const appointment = await newAppointment.save();

        // --- NOTIFICATION EMAIL AU PRATICIEN (NOUVEAU) ---
        // Pour un service premium, le cabinet est alerté en temps réel
        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });

        const mailOptions = {
            from: '"Site Web ALLO KINÉ" <' + process.env.EMAIL_USER + '>',
            to: process.env.EMAIL_USER, // S'envoie à soi-même (le cabinet)
            subject: `🔔 Nouveau RDV : ${nom} ${prenom}`,
            text: `Nouvelle demande.\nPatient : ${nom} ${prenom}\nTéléphone : ${telephone}\nMotif : ${motif}\nDate souhaitée : ${dateRdv || 'Non spécifiée'} à ${heureRdv || ''}\n\nConnectez-vous au dashboard.`
        };
        transporter.sendMail(mailOptions, (err) => { if(err) console.error("Erreur mail admin:", err); });

        res.json(appointment);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// Route Privée (Lecture des RDV - Séparation des rôles)
router.get('/', auth, async (req, res) => {
    try {
        let appointments;
        if (req.user.role === 'admin') {
            // L'admin voit TOUT
            appointments = await Appointment.find().sort({ createdAt: -1 });
        } else {
            // Le patient ne voit que SES rendez-vous
            appointments = await Appointment.find({ user: req.user.id }).sort({ createdAt: -1 });
        }
        res.json(appointments);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// @route   PUT api/appointments/:id
// @desc    Mettre à jour le statut d'un RDV (Admin seulement)
router.put('/:id', auth, async (req, res) => {
    const { statut } = req.body;
    try {
        if (req.user.role !== 'admin') return res.status(403).json({ msg: 'Non autorisé' });

        let appointment = await Appointment.findById(req.params.id);
        if (!appointment) return res.status(404).json({ msg: 'Rendez-vous non trouvé' });

        appointment.statut = statut;
        
        // --- ENVOI EMAIL SI CONFIRMÉ ---
        if (statut === 'confirme' && appointment.email) {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER, // Votre email (ex: contact@allokine.com)
                    pass: process.env.EMAIL_PASS  // Mot de passe d'application
                }
            });

            const mailOptions = {
                from: '"ALLO KINÉ" <' + process.env.EMAIL_USER + '>',
                to: appointment.email,
                subject: '✅ Rendez-vous Confirmé - Dr Ghraybia',
                text: `Bonjour ${appointment.prenom},\n\nVotre rendez-vous pour "${appointment.motif}" a été confirmé par le Dr Ghraybia.\n\nNous vous attendons au cabinet.\n\nCordialement,\nL'équipe ALLO KINÉ`
            };

            transporter.sendMail(mailOptions, (error, info) => {
                if (error) console.log("Erreur email:", error);
                else console.log('Email envoyé: ' + info.response);
            });
        }

        await appointment.save();
        res.json(appointment);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

module.exports = router;
