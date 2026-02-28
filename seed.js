const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const User = require('./models/User');

const seedAdmin = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        await User.deleteMany({ email: 'omar_oumay@hotmail.com' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('Admin123!', salt);

        const admin = new User({
            nom: 'Ghraybia',
            prenom: 'Fethi',
            telephone: '21698561586',
            email: 'omar_oumay@hotmail.com',
            password: hashedPassword,
            role: 'admin' // Le rôle spécial pour votre père
        });

        await admin.save();
        console.log('✅ Compte administrateur mis à jour !');
        process.exit();
    } catch (err) {
        process.exit(1);
    }
};
seedAdmin();
