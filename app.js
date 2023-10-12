const express = require('express')
const axios = require('axios')
const env = require('./env')
const http = require('http')
const WebSocket = require('ws')

const app = express()
const PORT = env.port

// Part 2
// TODO: add redis

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

// Part 3
// TODO: store ohlc data 15 minutes in redis

const server = http.createServer(app)
const wss = new WebSocket.Server({ server })

const BitstampWebSocket = new WebSocket('wss://ws.bitstamp.net')

const ohlcData = {} // 儲存 OHLC 資料的物件

BitstampWebSocket.on('open', () => {
    console.log('Connected to Bitstamp WebSocket')

    const currencyPairs = ['btcusd', 'ethusd', 'xrpusd', 'ltcusd', 'bchusd', 'adausd', 'linkusd', 'dotusd', 'dogeusd', 'maticusd']

    const subscribeMessage = {
        event: 'bts:subscribe',
        data: {
            channel: `live_trades_${currencyPairs.join(',').toLowerCase()}`
        }
    }

    BitstampWebSocket.send(JSON.stringify(subscribeMessage))
})

BitstampWebSocket.on('message', message => {
    const tradeData = JSON.parse(message)

    // 更新 OHLC 資料
    updateOHLCData(tradeData)
})

function updateOHLCData(tradeData) {
    const currencyPair = tradeData.currency_pair

    if (!ohlcData[currencyPair]) {
        ohlcData[currencyPair] = []
    }

    const timestamp = tradeData.timestamp
    const price = parseFloat(tradeData.price)

    // 建立新的 OHLC 資料
    const newOHLC = {
        timestamp,
        open: price,
        high: price,
        low: price,
        close: price
    }

    // 加入 OHLC 資料
    ohlcData[currencyPair].push(newOHLC)

    // 清理過期資料，保留 15 分鐘的資料
    const fifteenMinutesAgo = Date.now() - 15 * 60 * 1000
    ohlcData[currencyPair] = ohlcData[currencyPair].filter(ohlc => ohlc.timestamp >= fifteenMinutesAgo)
}

wss.on('connection', ws => {
    ws.on('message', message => {
        const parsedMessage = JSON.parse(message)

        if (parsedMessage.event === 'subscribe') {
            const subscribedPairs = parsedMessage.data.currencyPairs
            console.log(`Subscribed to: ${subscribedPairs.join(', ')}`)
            ws.send(JSON.stringify({ event: 'subscribed', data: { currencyPairs: subscribedPairs } }))
        } else if (parsedMessage.event === 'unsubscribe') {
            const unsubscribedPairs = parsedMessage.data.currencyPairs
            console.log(`Unsubscribed from: ${unsubscribedPairs.join(', ')}`)
            ws.send(JSON.stringify({ event: 'unsubscribed', data: { currencyPairs: unsubscribedPairs } }))
        }
    })
})

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});