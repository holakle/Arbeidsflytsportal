async function runWorker() {
  // Placeholder for outbox processing / exports / indexing jobs.
  // eslint-disable-next-line no-console
  console.log('Worker running at', new Date().toISOString());
}

setInterval(runWorker, 15000);
void runWorker();

