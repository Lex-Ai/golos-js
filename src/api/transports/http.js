import Promise from 'bluebird';
import newDebug from 'debug';
import config from '../../config';
import fetch from 'cross-fetch';
import Transport from './base';

const cbMethods = [
  'set_block_applied_callback',
  'set_pending_transaction_callback',
  'set_callback'
];

const debugProtocol = newDebug('golos:protocol');
const debugHttp = newDebug('golos:http');

class RPCError extends Error {
  constructor(rpcError) {
    super(rpcError.message);
    this.name = 'RPCError';
    this.code = rpcError.code;
    this.data = rpcError.data;
  }
}

export function jsonRpc(uri, {method, id, params}) {
  const payload = {id, jsonrpc: '2.0', method, params};
  return fetch(uri, {
    body: JSON.stringify(payload),
    method: 'post',
    mode: 'cors',
    headers: {
      Accept: 'application/json, text/plain, */*',
      'Content-Type': 'application/json',
    },
  }).then(res => {
    if (!res.ok) {
      throw new Error(`HTTP ${ res.status }: ${ res.statusText }`);
    }
    return res.json();
  }).then(rpcRes => {
    if (rpcRes.id !== id) {
      throw new Error(`Invalid response id: ${ rpcRes.id }`);
    }
    if (rpcRes.error) {
      throw new RPCError(rpcRes.error);
    }
    return rpcRes.result
  });
}

export default class HttpTransport extends Transport {
  constructor(options = {}) {
    super(Object.assign({id: 0}, options));

    this.currentP = Promise.fulfilled();
  }

  send(api, data, callback) {
  	const id = data.id || this.id++;
    const params = [api, data.method, data.params];
    const url = config.get("websocket");
    jsonRpc(url, {method: 'call', id, params})
      .then(res => { callback(null, res) }, err => { callback(err) })
  }
}