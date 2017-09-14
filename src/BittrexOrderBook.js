const uuidv4 = require('uuid/v4')
const EventEmitter = require('events').EventEmitter

const ORDER_ADD = 0
const ORDER_UPDATE = 1
const ORDER_DELETE = 2

class BittrexOrderBook extends EventEmitter {
    /**
     * BittrexOrderBook constructor.
     *
     * @param {clientInterface} client
     * @param {string} market
     */
    constructor(client, market) {
        super()

        this.uuid = uuidv4()
        this.client = client
        this.wasAlreadyStarted = false
        this.market = market
        this.orders = {
            asks: {},
            bids: {},
        }
    }

    /**
     * Starts orderbook.
     */
    start() {
        if (this.wasAlreadyStarted) {
            return
        }

        this.wasAlreadyStarted = true

        this.queryExchangeState()
            .then(() => this.subscribe())
            .then(() => this.emit('started'))
            .catch(err => this.emit('error', err))
    }

    /**
     * Requests exchange state for current market.
     *
     * @returns {Promise}
     */
    queryExchangeState() {
        return new Promise((resolve, reject) => {
            this.client.call('CoreHub', 'QueryExchangeState', this.market).done((err, result) => {
                if (err) {
                    return reject(err)
                }

                this.fillOrderBook(result)

                return resolve()
            })
        })
    }

    /**
     * Subscribes to exchange deltas for current market.
     *
     * @returns {Promise}
     */
    subscribe() {
        return new Promise((resolve, reject) => {
            this.client.call('CoreHub', 'SubscribeToExchangeDeltas', this.market).done((err, result) => {
                if (err) {
                    this.wasAlreadyStarted = false

                    return reject(err)
                }

                return result === true ? resolve() : reject()
            })
        })
    }

    /**
     * Fills orderbook with data from exchange state response or exchange state update.
     *
     * @param {object} payload
     */
    fillOrderBook(payload) {
        if (payload['Buys'].length > 0) {
            payload['Buys'].forEach(buy => this.processOrder('bids', buy, true))
        }

        if (payload['Sells'].length > 0) {
            payload['Sells'].forEach(sell => this.processOrder('asks', sell, true))
        }
    }

    /**
     * Adds or deletes given order to/from orderbook.
     *
     * @param {string} side
     * @param {object} order
     * @param {boolean} fromInitial
     */
    processOrder(side, order, fromInitial) {
        const item = {
            quantity: order['Quantity'],
            rate: order['Rate'],
        }

        if (fromInitial === true) {
            return this.addOrder(side, item)
        }

        switch (order['Type']) {
            case ORDER_ADD:
            case ORDER_UPDATE:
                return this.addOrder(side, item)
            case ORDER_DELETE:
                return this.deleteOrder(side, item.rate)
        }
    }

    /**
     * Pushes new order to the orderbook.
     *
     * @param {string} side
     * @param {object} item
     */
    addOrder(side, item) {
        this.orders[side][item.rate] = item
    }

    /**
     * Removes order at given rate from the orderbook.
     *
     * @param {string} side
     * @param {number} rate
     */
    deleteOrder(side, rate) {
        delete this.orders[side][rate]
    }

    /**
     * Asks volume in BTC.
     *
     * @returns {number}
     */
    btcAsksVolume() {
        return this.volume('asks', true)
    }

    /**
     * Bids volume in BTC.
     *
     * @returns {number}
     */
    btcBidsVolume() {
        return this.volume('bids', true)
    }

    /**
     * Asks volume in market currency.
     *
     * @returns {number}
     */
    asksVolume() {
        return this.volume('asks')
    }

    /**
     * Bids volume in market currency.
     *
     * @returns {number}
     */
    bidsVolume() {
        return this.volume('bids')
    }

    /**
     * Returns volume in desired currency.
     *
     * @param {string} side
     * @param {boolean} asBtc = false
     * @returns {number}
     */
    volume(side, asBtc = false) {
        let volume = 0.0

        if (!this.orders.hasOwnProperty(side)) {
            return volume
        }

        for (let i in this.orders[side]) {
            if (!this.orders[side].hasOwnProperty(i)) {
                continue
            }

            if (asBtc) {
                volume += (this.orders[side][i].rate * this.orders[side][i].quantity)
            } else {
                volume += this.orders[side][i].quantity
            }
        }

        return volume
    }

    /**
     * Handles message from exchange state update.
     *
     * @param {string} uuid
     * @param {object} update
     */
    processUpdate(uuid, update) {
        if (this.uuid !== uuid) {
            return
        }

        this.fillOrderBook(update)
        this.emit('update', update)
    }
}

module.exports = BittrexOrderBook
