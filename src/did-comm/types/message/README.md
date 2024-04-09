# InfraDID Agent Communication Protocol Message Types

This folder contains the message types for various InfraDID Agent Communication Protocol protocols.

## DID Connection Protocol

### WebSocket Messages

```javascript
class WebSocketMessage {
  constructor(to: String, m: String) {
    this.to = to;
    this.m = m;
  }
}
```

| Field | Type   | Description                                             |
| ----- | ------ | ------------------------------------------------------- |
| to    | String | http://socket.io Socket ID of receiver websocket client |
| m     | String | encrypted message (JWE)                                 |

### DIDConnectRequestMessage

DID peer(e.g Verifier) creates `DidConnectRequestMessage` to initiate DID Connection process with another DID peer(e.g Holder) to create a secret communication channel. This can be encoded as various forms such as QR-code, NFC signal, etc.

There are 3 types of `DidConnectRequestMessage`:

-   `DidConnectRequestMessage`: General DID Connect Request Message

    ```javascript
    Interface Initiator {
        type: String,
        service_endpoint: String,
        socketId: String
    }
    Interface Context {
        domain: String,
        action: String
    }
    class DIDConnectRequestMessage {
      constructor(
        type: String,
      	from: String,
        created_time: Number,
      	initiator: Initiator,
      	context: Context
        ) {
            this.type = type;
            this.from = from;
            this.created_time = created_time;
            this.expires_time = data.expires_time;
            this.body = {
                initiator: initiator,
                context: context
            };
        }
    }
    ```

-   `CompactDidConnectRequestMessage`: Reduce the field name to reduce the size of the message

    ```javascript
    class CompactDIDConnectRequestMessage {
        constructor(data: DIDConnectRequestMessage) {
            this.type = data.type;
            this.from = data.from;
            this.created_time = data.created_time;
            this.expires_time = data.expires_time;
            this.body = {
                i: {
                    se: data.body.initiator.service_endpoint,
                    sid: data.body.initiator.socketId
                },
                c: {
                    d: data.body.context.domain,
                    a: data.body.context.action
                }
            };
        }
    }
    ```

-   `MinimalCompactDidConnectRequestMessage`: Assume _Holder_ knows _Verifier_'s service endpoint
    ```javascript
    class MinimalCompactDIDConnectRequestMessage {
        constructor(data: DIDConnectRequestMessage) {
            this.type = data.type;
            this.from = data.from;
            this.created_time = data.created_time;
            this.expires_time = data.expires_time;
            this.body = {
                i: {
                    sid: data.body.initiator.socketId
                },
                c: {
                    d: data.body.context.domain,
                    a: data.body.context.action
                }
            };
        }
    }
    ```

### DIDAuthInitMessage

-   **SHOULD** be signed by the creator's **_ephemeral key_**(a.k.a epk)

```javascript
class DIDAuthInitMessage {
  constructor(id: String, type: String, from: String, to: String[], created_time: Number, expires_time: Number, context: Context, socketId: String, peerSocketId: String) {
    this.id = id;
    this.type = type;
    this.from = data.from;
    this.to = to;
    this.created_time = created_time;
    this.expires_time = expires_time;
    this.body = {
      context: context,
      socketId: socketId,
      peerSocketId: peerSocketId
    };
  }
}
```

### DIDAuthMessage

-   **SHOULD** be signed by the message creator DID, and encrypted by **_DID-Shared-Secret-Key_** of DIDs
-   The counter party’s **socket ID is used as challenge value** of DID-Auth signature

```javascript
class DIDAuthMessage {
  constructor(id: String, type: String, from: String, to: String[], created_time: Number, expires_time: Number, context: Context, socketId: String, peerSocketId: String) {
    this.id = id;
    this.type = type;
    this.from = data.from;
    this.to = to;
    this.created_time = created_time;
    this.expires_time = expires_time;
    this.body = {
      context: context,
      socketId: socketId,
      peerSocketId: peerSocketId
    };
  }
}
```

### DIDAuthFailedMessage

-   **SHOULD** be encrypted by **_DID-Shared-Secret-Key of DIDs_**

```javascript
class DIDAuthFailedMessage {
  constructor(id: String, type: String, from: String, to: String[], created_time: Number, expires_time: Number, context: Context, reason: String) {
    this.id = id;
    this.type = type;
    this.from = from;
    this.to = to;
    this.created_time = created_time;
    this.expires_time = data.expires_time;
    this.body = {
      context: context,
      reason: reason
    };
  }
}
```

### DIDConnectedMessage

-   **SHOULD** be encrypted by **_DID-Shared-Secret-Key of DIDs_**

```javascript
class DIDConnectedMessage {
  constructor(id: String, type: String, from: String, to: String[], created_time: Number, expires_time: Number, context: Context, status: String) {
    this.id = id;
    this.type = type;
    this.from = from;
    this.to = to;
    this.created_time = created_time;
    this.expires_time = data.expires_time;
    this.body = {
      context: context,
      status: status
    };
  }
}
```

## VP Protocol

WIP

## Permission Grant Protocol

WIP
