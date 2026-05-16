# MiniS3 - S3-Compatible Storage Server

A lightweight S3-compatible object storage server written in C++.

## Features

- S3-compatible API (GET, PUT, DELETE)
- TLS/HTTPS support with auto-generated self-signed certificates
- Configurable port, storage directory, buffer size, and thread count
- Built with OpenSSL for TLS and Boost for utilities

## Build

```bash
cmake -S . -B build && cmake --build build -j4
```

Produces two binaries in `build/bin/`:
- `minis3` — the storage server
- `minis3cli` — standalone terminal client

## Running

### HTTP server
```bash
./build/bin/minis3
```

### HTTPS server (auto-generates self-signed cert)
```bash
./build/bin/minis3 -T
```

### Server with built-in terminal console
```bash
./build/bin/minis3 -i
```
The server starts in the background and an interactive menu opens in the same terminal. Exiting the console (`0`) shuts the server down.

### HTTPS + terminal console
```bash
./build/bin/minis3 -i -T
```

### Custom port
```bash
./build/bin/minis3 -p 8443 -T
```

## Web UI

Available at `http://localhost:8080/_ui` whenever the server is running.

## Terminal Client

Connect to a running server from any terminal:

```bash
./build/bin/minis3cli                        # localhost:8080
./build/bin/minis3cli -h myhost -p 9000

```

## TLS Certificate

When running with `-T`, the server automatically generates a self-signed certificate in the storage directory:
- `cert.pem` - Public certificate
- `key.pem` - Private key

The certificate is generated with `CN=localhost` for local development.

## Storage

Objects are stored in the configured storage directory with the following structure:
```
storage/
  cert.pem
  key.pem
  bucket1/
    key1
    key2
  bucket2/
    key3
```