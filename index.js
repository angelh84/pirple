/*
* Primary file for the API
*/

// Dependencies
var http = require('http');
var https = require('https');
var url = require('url');
var StringDecoder = require('string_decoder').StringDecoder;
var config = require('./lib/config');
var fs = require('fs');
var _data = require('./lib/data');
var handlers = require('./lib/handlers');
var helpers = require('./lib/helpers');


// Instantiate the HTTP server
var httpServer = http.createServer((req, res) => {
    unifiedServer(req, res)
});

// Start the server
httpServer.listen(config.httpPort, () => {
    console.log('The server is listening on port ' + config.httpPort)
});

// Instantiate the HTTPS server
var httpsServerOptions = {
    'key': fs.readFileSync('./https/key.pem'),
    'cert': fs.readFileSync('./https/cert.pem')
};
var httpsServer = https.createServer(httpsServerOptions, (req, res) => {
    unifiedServer(req, res)
});

// Start the HTTPS server
httpsServer.listen(config.httpsPort, () => {
    console.log('The server is listening on port ' + config.httpsPort)
});

// All the server logic for both the http and https createServer
var unifiedServer = (req, res) => {
    // Get the URL and parse it
    var parsedUrl = url.parse(req.url, true);

    // Get the path
    var path = parsedUrl.pathname;
    var trimmedPath = path.replace(/^\/+|\/+$/g, '');

    // Get the query string as an object
    var queryStringObject = parsedUrl.query;

    // Get the HTTP Method
    var method = req.method.toLowerCase();

    // Get the headers as an object
    var headers = req.headers;

    // Get the payload if any
    var decoder = new StringDecoder('utf-8');
    var buffer = '';
    req.on('data', data => {
        buffer += decoder.write(data)
    });
    req.on('end', () => {
        buffer += decoder.end()

        // Choose the handler this request should go to
        // if one is not found, use the notFound handler
        var chosenHandler = typeof(router[trimmedPath]) !== 'undefined'
            ? router[trimmedPath]
            : handlers.notFound;

        // Construct the data object to send to the handler
        var data = {
            'trimmedPath': trimmedPath,
            'queryStringObject': queryStringObject,
            'method': method,
            'headers': headers,
            'payload': helpers.parseJsonToObject(buffer)
        };

        // Route the request to the handler specified in the router
        chosenHandler(data, (statusCode, payload) => {
            // Use the status code caleld back by the handler, or default to 200
            statusCode = typeof(statusCode) == 'number'
                ? statusCode
                : 200;

            // Use the payload called back by the handler, or default to an empty object
            payload = typeof(payload) == 'object'
                ? payload
                : {};

            //  Covert the payload to a string
            var payloadString = JSON.stringify(payload);

            // Return the response
            res.setHeader('Content-Type', 'application/json');
            res.writeHead(statusCode);
            res.end(payloadString);

            // Log the request path
            console.log('Request received on path: ' + trimmedPath)
            console.log('With this method: ' + method)
            console.log('With these query string parameters ', queryStringObject)
            console.log('With these headers: ', headers)
            console.log('With this payload: ', buffer)
            console.log('Returning this reponse: ', statusCode, payloadString)
        })
    });
};


// Define a request router
var router = {
    'ping': handlers.ping,
    'users': handlers.users
}