require('dotenv').config();

if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET manquant dans .env');
}

const app = require('./app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Serveur API Node.js demarre sur le port ${PORT}`);
});
