const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {
    // NOUVEAU : Récupérer le token depuis les cookies
    const token = req.cookies && req.cookies.token;

    // Vérifier si pas de token
    if (!token) {
        return res.status(401).json({ msg: 'Pas de token, autorisation refusée' });
    }

    // Vérifier le token
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded.user;
        next();
    } catch (err) {
        res.status(401).json({ msg: 'Le token n\'est pas valide' });
    }
};
