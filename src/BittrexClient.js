const extend = require('lodash/extend')
const get = require('lodash/get')
const signalR = require('signalr-client')
const cloudscraper = require('cloudscraper')
const jsonic = require('jsonic')
const axios = require('axios')
const EventEmitter = require('events').EventEmitter
const BittrexOrderBook = require('./BittrexOrderBook')
const OrderBooksCollection = require('./OrderBooksCollection')

class BittrexClient extends EventEmitter {
    /**
     * BittrexClient constructor.
     *
     * @param {object} options = {}
     */
    constructor(options = {}) {
        super()

        this.client = null
        this.options = extend(options, {
            url: 'wss://socket.bittrex.com/signalr',
            marketsUrl: `https://bittrex.com/api/v1.1/public/getmarkets`,
            hubs: ['CoreHub'],
            reconnectionTimeout: 10,
        })

        this.orderBooks = {}
    }

    /**
     * Initializes WS connection.
     *
     * @returns {Promise}
     */
    connect() {
        if (this.client !== null) {
            return Promise.resolve(this.client)
        }

        return new Promise((resolve, reject) => {
            cloudscraper.get(`https://bittrex.com`, (err, response) => {
                if (err) {
                    return reject({
                        culprit: 'cloudscrapper',
                        message: 'Cloudscrapper error occuried.',
                        original: err,
                    })
                }

                this.client = this.createClient(response)
                this.client.start()

                return resolve(this.client)
            })
        })
    }

    /**
     * Creates new signalR client.
     *
     * @param {object} response
     * @returns {clientInterface}
     */
    createClient(response) {
        const client = new signalR.client(
            this.options.url,
            this.options.hubs,
            this.options.reconnectionTimeout,
            true
        )

        client.headers['User-Agent'] = get(response, 'request.headers.User-Agent', '')
        client.headers['cookies'] = get(response, 'request.headers.cookie', '')

        client.serviceHandlers = {
            bound: () => this.emit('bound'),
            connectFailed: err => this.emit('connectFailed', err),
            connected: connection => this.emit('connected', connection, this),
            connectionLost: err => this.emit('connectionLost', err),
            disconnected: () => this.emit('disconnected'),
            onerror: err => this.emit('error', err),
            messageReceived: message => this.emitMessage(message),
            bindingError: err => this.emit('bindingError', err),
            onUnauthorized: res => this.emit('unauthorized', res),
            reconnected: connection => this.emit('reconnected', connection),
            reconnecting: retry => {
                this.emit('reconnecting', retry)

                return true
            },
        }

        return client
    }

    /**
     * Parses raw WS message & delegates it to appropriate receivers.
     *
     * @param {string} raw
     * @returns {boolean}
     */
    emitMessage(raw) {
        try {
            const parsed = jsonic(raw['utf8Data'])

            if (!parsed || !parsed['M']) {
                return false
            }

            parsed['M'].forEach(msg => {
                switch (msg['M']) {
                    case 'updateExchangeState':
                        return this.emitUpdateToOrderBooks(msg)
                    case 'updateSummaryState':
                        return this.emit('summary', msg['A'])
                    default:
                        return this.emit('message', msg)
                }
            })
        } catch (err) {
            this.emit('error', err)
        }

        return false
    }

    /**
     * Emits exchange state update message to registered orderbooks.
     *
     * @param {object} msg
     * @returns {boolean}
     */
    emitUpdateToOrderBooks(msg) {
        if (typeof msg['A'] === 'undefined' || !msg['A']) {
            return false
        }

        const update = msg['A'][0]
        const market = update['MarketName']

        if (!market || typeof this.orderBooks[market] === 'undefined' || !this.orderBooks[market]) {
            return false
        }

        this.orderBooks[market].forEach(item => {
            if (typeof item.handler !== 'function') {
                return
            }

            item.handler(item.uuid, update)
        })
    }

    /**
     * Loads all markets info from Bittrex API.
     *
     * @returns {Promise}
     */
    getMarkets() {
        return new Promise((resolve, reject) => {
            axios.get(this.options.marketsUrl)
                .then(resp => {
                    const data = (typeof resp.data === 'string' ? JSON.stringify(resp.data) : resp.data)

                    return resolve(data.result)
                })
                .catch(err => reject(err))
        })
    }

    /**
     * Creates orderbook for given market.
     *
     * @param {string} market
     * @returns {BittrexOrderBook}
     */
    orderBook(market) {
        const orderBook = new BittrexOrderBook(this.client, market)

        if (typeof this.orderBooks[market] === 'undefined') {
            this.orderBooks[market] = []
        }

        this.orderBooks[market].push({
            uuid: orderBook.uuid,
            handler: orderBook.processUpdate.bind(orderBook),
        })

        return orderBook
    }

    /**
     * Creates orderbooks collection.
     *
     * @returns {OrderBooksCollection}
     */
    orderBooksCollection() {
        return new OrderBooksCollection(this)
    }
}

module.exports = BittrexClient
