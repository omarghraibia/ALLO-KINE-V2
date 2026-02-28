const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    nom: { type: String, required: true },
    prenom: { type: String, required: true },
    telephone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    
    // --- GESTION DES RÔLES STRICTE ---
    // enum empêche de mettre autre chose que ces 3 mots précis dans la base de données
    role: { type: String, enum: ['patient', 'kine', 'admin'], default: 'patient' }, 
    
    // --- RÉINITIALISATION DE MOT DE PASSE ---
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date }
}, { 
    // --- OPTIONS ---
    timestamps: true // Ajoute automatiquement "createdAt" et "updatedAt" (très pro)
});

module.exports = mongoose.model('User', UserSchema);