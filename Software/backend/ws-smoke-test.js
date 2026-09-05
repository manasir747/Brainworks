const { WebSocket } = require('ws');

const WS_URL = process.env.WS_URL || 'ws://localhost:3000/ws';

function waitFor(ws, predicate, timeoutMs = 4000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('Timed out waiting for WebSocket message'));
    }, timeoutMs);

    function onMessage(raw) {
      const event = JSON.parse(raw.toString());
      if (predicate(event)) {
        cleanup();
        resolve(event);
      }
    }

    function cleanup() {
      clearTimeout(timer);
      ws.off('message', onMessage);
    }

    ws.on('message', onMessage);
  });
}

function connect() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(WS_URL);

    ws.once('open', () => resolve(ws));
    ws.once('error', reject);
  });
}

async function run() {
  const clientA = await connect();
  const welcomeA = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
  console.log('client A connected:', welcomeA);

  clientA.send(JSON.stringify({ type: 'PING', data: {} }));
  const pong = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'pong');
  console.log('PING response:', pong);

  clientA.send('not-json');
  const errorEvent = await waitFor(clientA, (event) => event.type === 'ERROR');
  console.log('invalid JSON response:', errorEvent);

  const clientB = await connect();
  const welcomeB = await waitFor(clientB, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'connected');
  console.log('client B connected:', welcomeB);

  const broadcastToA = await waitFor(clientA, (event) => event.type === 'SYSTEM_STATUS' && event.data.status === 'clients');
  console.log('broadcast to client A:', broadcastToA);

  await new Promise((resolve) => {
    clientB.once('close', resolve);
    clientB.close();
  });
  console.log('client B disconnected');

  await new Promise((resolve) => {
    clientA.once('close', resolve);
    clientA.close();
  });
  console.log('client A disconnected');

  console.log('WebSocket smoke test passed');
}

run().catch((err) => {
  console.error('WebSocket smoke test failed:', err.message);
  process.exit(1);
});
