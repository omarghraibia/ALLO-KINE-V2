const mongoose = require('mongoose');
const UserSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'patient' } // Par défaut, un nouvel inscrit est un 'patient'
});
module.exports = mongoose.model('User', UserSchema);
