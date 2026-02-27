const express = require('express');
const router = express.Router();
const Appointment = require('../models/Appointment');
const auth = require('../middleware/auth'); // Import du cadenas

// Route Publique (Les patients créent un RDV)
router.post('/', async (req, res) => {
    try {
        const newAppointment = new Appointment(req.body);
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
