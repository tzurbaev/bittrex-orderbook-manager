# Bittrex Orderbook Manager

[![Software License][ico-license]](LICENSE.md)

## Requirements
This package requires Node.js 6.0.x+

## Installation

You can install the package via npm:

``` bash
$ npm install --save bittrex-orderbook-manager
```

or via yarn:

``` bash
$ yarn add bittrex-orderbook-manager
```

## Documentation

This package provides ability to track orderbooks updates from bittrex.com market.
All you need is to import `bittrex-orderbook-manager`, create new instance, add event listeners & start connection.

This example shows how to connect to the market & create orderbooks for all currencies available:
``` js
const BittrexClient = require('bittrex-orderbook-manager')
const bittrex = new BittrexClient()

bittrex.connect()
    .then(client => console.log('Client created'))
    .catch(err => console.error('Error', err))

bittrex.on('connected', () => {
    const collection = bittrex.orderBooksCollection()

    collection.on('ready', () => {
        console.log(`${collection.count()} orderbooks are ready`)

        // Now you can access any orderbook via collection.orderBooks object.
        // Please note, that all orderbooks are auto-updated.

        const btcNxt = collection.orderBooks['BTC-NXT']

        btcNxt.on('update', () => {
            const volumes = {
                asks: {
                    inBtc: btcNxt.btcAsksVolume(),
                    inNxt: btcNxt.asksVolume(),
                },
                bids: {
                    inBtc: btcNxt.btcBidsVolume(),
                    inNxt: btcNxt.bidsVolume(),
                }
            }

            console.log('BTC-NXT was updated, new volumes are: ', volumes)
        })
    })

    collection.start()
})
```

This example shows how to create orderbook for single currency:

``` js
const BittrexClient = require('bittrex-orderbook-manager')
const bittrex = new BittrexClient()

bittrex.connect()
    .then(client => console.log('Client created'))
    .catch(err => console.error('Error', err))

bittrex.on('connected', () => {
    const orderBook = bittrex.orderBook('BTC-NXT')

    orderBook.on('started), () => console.log('BTC-NXT orderbook was started!'))
    orderBook.on('update', () => {
        const volumes = {
            asks: {
                inBtc: btcNxt.btcAsksVolume(),
                inNxt: btcNxt.asksVolume(),
            },
            bids: {
                inBtc: btcNxt.btcBidsVolume(),
                inNxt: btcNxt.bidsVolume(),
            }
        }

        console.log('BTC-NXT was updated, new volumes are: ', volumes)
    })

    orderBook.start()
})
```

### Events
All classes in this package are extended from `EventEmitter` and emits several events you might want to subscribe to.

Call `obj.on(event, handler)` to subscribe to any event listed below:

``` js
bittrex.on('connectionLost', err => console.error(`Connection lost!`, err))
bittrex.on('reconnected', connection => console.log(`Socket reconnected!`, connection))
orderBook.on('started', () => console.log('Orderbook started'))
orderBooksCollection.on('ready' => console.log('Orderbooks collection is ready'))
```

#### BittrexClient
##### Events related to signalR client
- `bound`
- `connectFailed(err)`
- `connected(connection)`
- `connectionLost(err)`
- `disconnected`
- `error(err)`
- `bindingError(err)`
- `unauthorized(res)`
- `reconnected(connection)`
- `reconnecting(retry)`

##### Market-related events
- `summary(payload)` - emitted when client receives market summary state updates;
- `orderBookUpdate(marketName, payload)` - emits when any registered orderbook being updated.

#### BittrexOrderBook
- `started` - emits when orderbook was loaded & started receiving updates;
- `error(err)` - emits when something goes wrong;
- `update(payload)` - emits on each update from market.

#### OrderBooksCollection
- `orderBookStarted(orderbook, readyCount)` - emits when single orderbook was started. readyCount - total count of registered & ready orderbooks in current collection;
- `ready` - emits when all orderbooks were started & receiving updates;
- `error(err)` - emits when something goes wrong;

## Change log

Please see [CHANGELOG](CHANGELOG.md) for more information on what has changed recently.

## Contributing

Please see [CONTRIBUTING](CONTRIBUTING.md) for details.

## Security

If you discover any security related issues, please email zurbaev@gmail.com instead of using the issue tracker.

## License

The MIT License (MIT). Please see [License File](LICENSE.md) for more information.

[ico-version]: https://poser.pugx.org/tzurbaev/bittrex-orderbook-manager/version?format=flat
[ico-license]: https://poser.pugx.org/tzurbaev/bittrex-orderbook-manager/license?format=flat

[link-npmjs]: https://npmjs.org/package/bittrex-orderbook-manager
[link-author]: https://github.com/tzurbaev
