const express = require('express');
const { Telegraf } = require('telegraf');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const bot = new Telegraf(process.env.BOT_TOKEN);

const corsOptions = {
  origin: 'https://09e4-31-162-12-215.ngrok-free.app', // Замените на URL вашего клиента
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
};
app.use(cors(corsOptions));

app.use(express.json());
app.use(bodyParser.json());

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log('Connected to MongoDB'))
    .catch((error) => console.error('Error connecting to MongoDB:', error));

const userSchema = new mongoose.Schema({
    userId: String,
    userName: String,
    score: Number
});
const User = mongoose.model('User', userSchema);

app.post('/api/getuser', async (req, res, next) => {
    const { userId } = req.body;
    console.log('Получен запрос на /api/getuser с userId:', userId);
    try {
        if (!userId) {
            throw new Error('userId не передан');
        }
        let user = await User.findOne({ userId });
        if (!user) {
            user = new User({ userId, userName: '', score: 0 });
            await user.save();
        }
        console.log('Отправка данных пользователя:', { userId: user.userId, username: user.userName, score: user.score });
        res.json({ userId: user.userId, username: user.userName, score: user.score });
    } catch (error) {
        console.error('Ошибка при получении данных пользователя:', error);
        res.status(500).json({ message: error.message });
    }
});

app.post('/api/savescore', async (req, res, next) => {
    const { userId, score } = req.body;
    console.log('Получен запрос на /api/savescore с данными:', { userId, score });
    if (!userId || isNaN(score)) {
        console.log('Ошибка: некорректные данные');
        return res.status(400).json({ message: 'Invalid input' });
    }
    try {
        let user = await User.findOne({ userId });
        if (user) {
            user.score = score;
            await user.save();
            console.log('Токены сохранены:', user.score);
            res.json({ score: user.score });
        } else {
            console.log('Ошибка: пользователь не найден');
            res.status(404).json({ message: 'User not found' });
        }
    } catch (error) {
        console.error('Ошибка при сохранении токенов:', error);
        res.status(500).json({ message: error.message });
    }
});

app.use(express.static(path.join(__dirname, 'client/build')));

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'client/build', 'index.html'));
});

// Telegraf bot command to send WebApp button
bot.command('start', (ctx) => {
    ctx.reply('Welcome! Click the button below to open the app.', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Open WebApp', web_app: { url: 'https://09e4-31-162-12-215.ngrok-free.app' } }]
            ]
        }
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    bot.launch();
});

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
