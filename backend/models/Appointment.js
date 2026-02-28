const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    email: { type: String }, // Ajout du champ email
    telephone: { type: String, required: true },
    motif: { type: String, required: true },
    diagnostic: { type: String },
    statut: { type: String, default: 'en_attente' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Appointment', AppointmentSchema);
