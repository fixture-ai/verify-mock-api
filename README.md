Mock API
========

This is a mock Verify API to help with integration and testing.
This works just like the real Verify API, but everything is faked.
Data never leaves your machine.

## Setup

### Start the mock API

The easiest way to run this mock API is with Docker:

```
docker run --rm -p 8989:8989 fixtureai/verify-mock-api
```

Alternatively, you can start the mock API server with npm:

```
npm install && npm start
```

### Customize the configuration (optional)

The `config.json` file determines how the mock API behaves. It contains API keys,
mock scenarios, and more. The defaults may work for you, or you can provide a custom
`config.json` by volume-mounting a json file to `/app/config.json`:

```
docker run --rm -v /path/to/myconfig.json:/app/config.json -p 8989:8989 fixtureai/verify-mock-api
```

## How to use

1. Start the mock api (see [Setup](#Setup)).
2. Open the welcome page at `http://localhost:8989` (or whatever host and port you used).
3. On the welcome page, see the configured API keys, mock scenarios, etc.
   You can change the configuration by providing your own `config.json` (see [Setup](#Setup)).
4. Use the API like you would use the real API, but with `http://localhost:8989` as the host.

## Docker image

The Mock API Docker image is published to Docker Hub at:
[https://hub.docker.com/r/fixtureai/verify-mock-api](https://hub.docker.com/r/fixtureai/verify-mock-api)
