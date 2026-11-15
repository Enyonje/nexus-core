let clients = [];

export function connect(ws) {
  clients.push(ws);
}

export function disconnect(ws) {
  clients = clients.filter(c => c !== ws);
}

export function broadcast(event, payload) {
  const message = JSON.stringify({ event, payload });
  clients.forEach(ws => {
    if (ws.readyState === 1) ws.send(message);
  });
}
