FxA KV Server
=============

A simple key-value storage service for Firefox Accounts reliers.

# API Endpoints

Authorization is done with an oauth token from the [FxA Oauth Server](https://github.com/mozilla/fxa-oauth-server)

## Scopes

The app must have the `kv:read` scope for `GET` and `kv:write` scope for `PUT` and `DELETE`

## PUT /v1/data/{ key }

```sh
curl -v \
-X PUT \
-H "Authorization: Bearer 558f9980ad5a9c279beb52123653967342f702e84d3ab34c7f80427a6a37e2c0" \
"https://kv.accounts.firefox.com/v1/data/question1" \
-d 'Why is a raven like a writing desk?'
```

## GET /v1/data/{ key }

```sh
curl -v \
-H "Authorization: Bearer 558f9980ad5a9c279beb52123653967342f702e84d3ab34c7f80427a6a37e2c0" \
"https://kv.accounts.firefox.com/v1/data/question1"
```

## DELETE /v1/data/{ key }

```sh
curl -v \
-X DELETE \
-H "Authorization: Bearer 558f9980ad5a9c279beb52123653967342f702e84d3ab34c7f80427a6a37e2c0" \
"https://kv.accounts.firefox.com/v1/data/question1"
```
