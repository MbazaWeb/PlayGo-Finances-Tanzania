import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';
const MAX_BODY = 16_384;
const blocked = ['/api/payments','/api/transfers','/api/topups','/api/merchant-payments','/api/bank','/api/nmb','/api/fee-payments'];

function json(res, status, body, requestId) {
  res.writeHead(status, {
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    'Referrer-Policy':'no-referrer',
    'X-Frame-Options':'DENY',
    'X-Request-ID':requestId,
    'Content-Security-Policy':"default-src 'none'; frame-ancestors 'none'",
  });
  res.end(JSON.stringify(body));
}

createServer((req,res) => {
  const requestId = randomUUID();
  const pathname = new URL(req.url || '/', 'http://localhost').pathname;
  // Deny financial execution regardless of client parameters, env variables, or HTTP method.
  if (blocked.some(prefix => pathname === prefix || pathname.startsWith(prefix + '/'))) {
    req.resume();
    return json(res, 423, {error:'REAL_PAYMENTS_DISABLED',message:'Banking and financial execution are not enabled. No transaction was processed.',requestId}, requestId);
  }
  if (pathname === '/health' && req.method === 'GET') {
    return json(res,200,{status:'ok',environment:'foundation-only',realPaymentsEnabled:false,nmbConnected:false,requestId},requestId);
  }
  if (pathname === '/api/capabilities' && req.method === 'GET') {
    return json(res,200,{mode:'foundation-only',realPayments:false,realBankLinking:false,realOtp:false,productionAuth:false},requestId);
  }
  req.resume();
  return json(res,404,{error:'NOT_FOUND',requestId},requestId);
}).listen(PORT, HOST, () => {
  console.log(`PlayGo foundation API listening on http://${HOST}:${PORT} (real payments disabled)`);
});
