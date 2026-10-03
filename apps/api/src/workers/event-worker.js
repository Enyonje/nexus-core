import { consumeNextEvent } from "../events/consume.js";
import { acknowledgeEvent } from "../events/ack.js";

const WORKER_ID = `worker-${process.pid}`;

async function run() {
  while (true) {
    const event = await consumeNextEvent(WORKER_ID);

    if (!event) {
      await new Promise(r => setTimeout(r, 1000));
      continue;
    }

    try {
      console.log("Processing event:", event.event_type, event.payload);
      await acknowledgeEvent(event.id, true);
    } catch (err) {
      console.error("Event failed", err);
      await acknowledgeEvent(event.id, false);
    }
  }
}

run();
