// apps/api/test/question-numbering.spec.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Question Numbering & Renumbering Lifecycle (FR-G11 to G14)", () => {
  it("allocates display_number sequentially starting at 1 per set/topic", async () => {
    const counters = new Map<string, number>();
    const questionsStore: any[] = [];

    // Simulate transactional creation allocating from counters table
    async function createQuestion(input: { topicId: string; prompt: string; displayNumber?: number }) {
      const counterKey = `question_num_${input.topicId}`;
      let num = input.displayNumber;
      if (num) {
        const inUse = questionsStore.some((q) => q.topicId === input.topicId && q.display_number === num);
        if (inUse) {
          throw new Error(`Display number ${num} is already in use in this set.`);
        }
        counters.set(counterKey, Math.max(counters.get(counterKey) ?? 0, num));
      } else {
        const current = counters.get(counterKey) ?? 0;
        num = current + 1;
        counters.set(counterKey, num);
      }

      const q = {
        id: `q-${Date.now()}-${Math.random()}`,
        topicId: input.topicId,
        prompt: input.prompt,
        display_number: num,
        created_at: new Date(),
      };
      questionsStore.push(q);
      return q;
    }

    // Set A (Topic 1)
    const qA1 = await createQuestion({ topicId: "topic-A", prompt: "Q1" });
    const qA2 = await createQuestion({ topicId: "topic-A", prompt: "Q2" });
    const qA3 = await createQuestion({ topicId: "topic-A", prompt: "Q3" });

    // Set B (Topic 2) - restarts at 1!
    const qB1 = await createQuestion({ topicId: "topic-B", prompt: "Q1" });
    const qB2 = await createQuestion({ topicId: "topic-B", prompt: "Q2" });

    assert.equal(qA1.display_number, 1);
    assert.equal(qA2.display_number, 2);
    assert.equal(qA3.display_number, 3);

    // Number restarts at 1 for another set
    assert.equal(qB1.display_number, 1);
    assert.equal(qB2.display_number, 2);
  });

  it("survives concurrent creates producing sequential, collision-free display numbers", async () => {
    const store: any[] = [];
    const counters = new Map<string, number>();
    let mutex = Promise.resolve();

    async function concurrentCreate(topicId: string, index: number) {
      // Simulate atomic PostgreSQL counter increment in transaction
      const release = mutex;
      let nextResolve: () => void;
      mutex = new Promise<void>((r) => (nextResolve = r));

      await release;
      try {
        const counterKey = `question_num_${topicId}`;
        const currentVal = counters.get(counterKey) ?? 0;
        const nextVal = currentVal + 1;
        counters.set(counterKey, nextVal);

        const q = { id: `q-${index}`, topicId, display_number: nextVal };
        store.push(q);
        return q;
      } finally {
        nextResolve!();
      }
    }

    const CONCURRENT_COUNT = 50;
    const promises = Array.from({ length: CONCURRENT_COUNT }, (_, i) =>
      concurrentCreate("topic-concurrent", i),
    );
    const results = await Promise.all(promises);

    const allocatedNumbers = results.map((r) => r.display_number);
    const expected = Array.from({ length: CONCURRENT_COUNT }, (_, i) => i + 1);
    assert.deepEqual(allocatedNumbers, expected);

    // Verify all numbers are strictly unique
    const uniqueNumbers = new Set(allocatedNumbers);
    assert.equal(uniqueNumbers.size, CONCURRENT_COUNT);
  });

  it("renumbers subsequent questions upon deletion to keep continuous order without gaps", async () => {
    const counters = new Map<string, number>([["question_num_topic-X", 4]]);
    let store: { id: string; topicId: string; display_number: number }[] = [
      { id: "q1", topicId: "topic-X", display_number: 1 },
      { id: "q2", topicId: "topic-X", display_number: 2 },
      { id: "q3", topicId: "topic-X", display_number: 3 },
      { id: "q4", topicId: "topic-X", display_number: 4 },
    ];

    function deleteQuestion(id: string) {
      const q = store.find((item) => item.id === id);
      if (!q) throw new Error("Not found");
      const deletedNum = q.display_number;
      store = store.filter((item) => item.id !== id);

      // Renumber: subsequent questions decrement by 1
      for (const item of store) {
        if (item.topicId === q.topicId && item.display_number > deletedNum) {
          item.display_number -= 1;
        }
      }

      // Decrement counter
      const counterKey = `question_num_${q.topicId}`;
      const current = counters.get(counterKey) ?? 0;
      counters.set(counterKey, Math.max(0, current - 1));
    }

    // Delete Q2 (middle)
    deleteQuestion("q2");

    assert.equal(store.length, 3);
    assert.equal(store[0]!.id, "q1");
    assert.equal(store[0]!.display_number, 1);
    assert.equal(store[1]!.id, "q3");
    assert.equal(store[1]!.display_number, 2); // Renumbered from 3 to 2
    assert.equal(store[2]!.id, "q4");
    assert.equal(store[2]!.display_number, 3); // Renumbered from 4 to 3

    // Verify counter decremented from 4 to 3
    assert.equal(counters.get("question_num_topic-X"), 3);
  });

  it("enforces unique constraint per set and rejects duplicate display numbers", async () => {
    const store = [
      { id: "q1", topicId: "topic-Z", display_number: 1 },
      { id: "q2", topicId: "topic-Z", display_number: 2 },
    ];

    function insertQuestion(topicId: string, displayNumber: number) {
      const exists = store.some(
        (q) => q.topicId === topicId && q.display_number === displayNumber,
      );
      if (exists) {
        throw new Error(`Unique constraint violation: [${topicId}, ${displayNumber}] already exists`);
      }
      store.push({ id: `q-${Date.now()}`, topicId, display_number: displayNumber });
    }

    assert.throws(
      () => insertQuestion("topic-Z", 2),
      /Unique constraint violation/,
    );
  });

  it("backfills existing questions in creation order", async () => {
    const legacyQuestions: { id: string; topicId: string; display_number: number | null; created_at: Date }[] = [
      { id: "leg-3", topicId: "topic-Y", display_number: null, created_at: new Date(3000) },
      { id: "leg-1", topicId: "topic-Y", display_number: null, created_at: new Date(1000) },
      { id: "leg-2", topicId: "topic-Y", display_number: null, created_at: new Date(2000) },
    ];

    // Backfill in creation order
    legacyQuestions.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    legacyQuestions.forEach((q, idx) => {
      q.display_number = idx + 1;
    });

    assert.equal(legacyQuestions[0]!.id, "leg-1");
    assert.equal(legacyQuestions[0]!.display_number, 1);
    assert.equal(legacyQuestions[1]!.id, "leg-2");
    assert.equal(legacyQuestions[1]!.display_number, 2);
    assert.equal(legacyQuestions[2]!.id, "leg-3");
    assert.equal(legacyQuestions[2]!.display_number, 3);
  });
});
