# Shorty

Shorty, is a simple URL shortener service that is designed to run on Linux. It uses node.js and redis database for its operations.
It consist of two parts:

* client API
* redirection service

## Client API

Client API offers means of setting and retreiving the short URL IDs. Each record consists of two parts:

* short ID
* corresponding url data

Eeach API call requires an api key in the request headers otherwise the call is rejected. There are two calls available at this time:

### setURL

This API take the provider URL and assigns it a new short ID. It also returns the complete shortened URL using the domain name to which the request was made. It has to be a POST request with the following format:

```
**POST**: /api/setURL
```

It accepts the JSON payload with the following structure

```
{
  url: "https://www.google.com"
  expire: 120
}
```

Parameters are:

* url: Defines the URL to shorten or in other words the url to assign the new short ID to.
* expire (optional): Defines how long the url is valid. Its in seconds.

The response in case of success (200) looks like this:

```
{
  url: "https://www.short.com/t8HLbMMGE
  uuid: t8HLbMMGE
}
```

Currently there is no support for multiple URLs in one single API call.

### getURL

This API takes a short ID and returns the associated url data if any is found. Its a GET request.

```
**GET**: /api/setURL/:uuid
```

If it finds the data it returns something like this

```
{
    "url": "https://www.google.com"
}
```

If nothing is found it returns

```
{
    "url": null
}
```
