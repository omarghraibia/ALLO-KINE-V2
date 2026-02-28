const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth'); // Import du cadenas

// Route Publique (Les patients créent un RDV)
router.post('/', [
    check('nom', 'Le nom est requis').not().isEmpty(),
    check('prenom', 'Le prénom est requis').not().isEmpty(),
    check('telephone', 'Le téléphone est requis').not().isEmpty(),
    check('motif', 'Le motif est requis').not().isEmpty()
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
        const { nom, prenom, telephone, motif } = req.body;
        const newAppointment = new Appointment({ nom, prenom, telephone, motif });
        const appointment = await newAppointment.save();
        res.json(appointment);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

// Route Privée (Le docteur lit les RDV - Protégée par 'auth')
router.get('/', auth, async (req, res) => {
    try {
        const appointments = await Appointment.find().sort({ createdAt: -1 });
        res.json(appointments);
    } catch (err) {
        res.status(500).send('Erreur Serveur');
    }
});

module.exports = router;
