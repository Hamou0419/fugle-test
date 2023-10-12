const express = require('express')
const axios = require('axios')
const env = require('./env')

const app = express()
const PORT = env.port

// Part 2

const ipRequests = {}
const userRequests = {}

app.use((req, res, next) => {
    const { ip } = req
    const { user } = req.query

    if (!ipRequests[ip]) ipRequests[ip] = 1
    else ipRequests[ip]++


    if (user) {
        if (!userRequests[user]) userRequests[user] = 1
        else userRequests[user]++
    }

    setTimeout(() => {
        delete ipRequests[ip]
        if (user) delete userRequests[user]
    }, 60000)

    next()
});

// Part 1
app.get('/data', async (req, res) => {
    const { ip } = req
    const { user } = req.query

    if (ipRequests[ip] > 10) return res.status(429).json({ ip: ipRequests[ip], id: userRequests[user] || 0 })
    if (user && userRequests[user] > 5) return res.status(429).json({ ip: ipRequests[ip], id: userRequests[user] })

    try {
        if (user === undefined || parseInt(user) < 1 || parseInt(user) > 1000) throw new Error('invalid user id')

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