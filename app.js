const express = require('express')
const axios = require('axios')
const env = require('./env')

const app = express()
const PORT = env.port



// Part 1
app.get('/data', async (req, res) => {
    const { user } = req.query;

    try {
        if (user === undefined || user < 1 || user > 1000) throw new Error('invalid user id')

        const response = await axios.get('https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty')

        const data = await response.data

        const result = []

        for (const temp of data) {
            if (temp % parseInt(user) === 0) result.push(temp)
        }

        res.json({ result })
    } catch (error) {
        res.status(500).send('Internal Server Error');
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});