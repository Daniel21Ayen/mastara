# Performance & Load Testing Suite (k6)

Load testing scripts measuring platform latency, concurrency limits, and database pooling under peak student usage.

## Prerequisites
Install [k6](https://k6.io/):
```bash
# Linux (Ubuntu/Debian)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running the Scenarios

### 1. Payment Queue Load Test
Simulates concurrent students submitting CBE/Telebirr payment receipts while admin operators review orders:
```bash
k6 run tests/load/k6-payment-queue.js
```

### 2. Offline Outbox Batch Sync Load Test
Simulates peak evening campus reconnects with multi-action student sync batches:
```bash
k6 run tests/load/k6-sync-batches.js
```

### 3. Paginated List Endpoints Load Test
Validates database connection pooling and Prisma pagination response times across catalog, students, and content:
```bash
k6 run tests/load/k6-paginated-lists.js
```

### 4. Catalog Snapshot & Delta Sync Load Test
Simulates peak student concurrency downloading catalog snapshots, testing 304 ETag caching and delta sync response times:
```bash
k6 run tests/load/k6-catalog-snapshot.js
```

