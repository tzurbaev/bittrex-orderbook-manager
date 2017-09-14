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

``` js
const BittrexClient = require('bittrex-order-manager')
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
