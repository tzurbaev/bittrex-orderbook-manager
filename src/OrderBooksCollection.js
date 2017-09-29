const EventEmitter = require('events').EventEmitter
const uniq = require('lodash/uniq')

class OrderBooksCollection extends EventEmitter {
    /**
     * OrderBooksCollection constructor.
     *
     * @param {BittrexClient} bittrex
     */
    constructor(bittrex) {
        super()

        this.bittrex = bittrex
        this.orderBooks = {}
        this.markets = []
        this.readyCount = 0
        this.initialized = false
    }

    /**
     * Starts orderbooks for all available markets.
     */
    start() {
        this.bittrex
            .getMarkets()
            .then(markets => {
                this.markets = uniq(markets.map(m => m['MarketName']))
                this.initAll()
            })
            .catch(err => this.emit('error', err))
    }

    /**
     * Returns available orderbooks count.
     *
     * @returns {number}
     */
    count() {
        return this.readyCount
    }

    /**
     * Initializes all orderbooks.
     */
    initAll() {
        this.markets.forEach(market => {
            const orderBook = this.bittrex.orderBook(market)

            orderBook.on('started', () => {
                this.readyCount++
                this.emit('orderBookStarted', orderBook, this.readyCount)

                if (this.readyCount === this.markets.length) {
                    return this.allInitialized()
                }
            })

            orderBook.on('error', e => this.emit('error', e))

            this.orderBooks[orderBook.market] = orderBook

            orderBook.start()
        })
    }

    /**
     * Emits 'ready' event to all subscribers and marks collection as initialized.
     */
    allInitialized() {
        if (this.initialized) {
            return
        }

        this.initialized = true

        return this.emit('ready', this.orderBooks)
    }
}

module.exports = OrderBooksCollection
