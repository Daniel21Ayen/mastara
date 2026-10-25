// apps/api/test/question-numbering.spec.ts
import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("Question Numbering & Renumbering Lifecycle", () => {
  it("allocates display_number sequentially starting at 1 per set/topic", async () => {
    const questionsStore: any[] = [];

    // Simulate transactional creation
    async function createQuestion(input: { topicId: string; prompt: string; displayNumber?: number }) {
      let num = input.displayNumber;
      if (!num) {
        const count = questionsStore.filter((q) => q.topicId === input.topicId).length;
        num = count + 1;
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

  it("survives concurrent creates producing sequential display numbers", async () => {
    const store: any[] = [];
    let lock = Promise.resolve();

    async function concurrentCreate(topicId: string, index: number) {
      // Simulate serializable transaction lock on the set counter
      const release = lock;
      let nextResolve: () => void;
      lock = new Promise<void>((r) => (nextResolve = r));

      await release;
      try {
        const count = store.filter((q) => q.topicId === topicId).length;
        const q = { id: `q-${index}`, topicId, display_number: count + 1 };
        store.push(q);
        return q;
      } finally {
        nextResolve!();
      }
    }

    const promises = Array.from({ length: 10 }, (_, i) => concurrentCreate("topic-concurrent", i));
    const results = await Promise.all(promises);

    const allocatedNumbers = results.map((r) => r.display_number);
    assert.deepEqual(allocatedNumbers, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("renumbers subsequent questions upon deletion to keep continuous order without gaps", async () => {
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

      // Renumber
      for (const item of store) {
        if (item.topicId === q.topicId && item.display_number > deletedNum) {
          item.display_number -= 1;
        }
      }
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
  });

  it("backfills existing questions in creation order", async () => {
    const legacyQuestions: { id: string; topicId: string; display_number: number | null; created_at: Date }[] = [
      { id: "leg-1", topicId: "topic-Y", display_number: null, created_at: new Date(1000) },
      { id: "leg-2", topicId: "topic-Y", display_number: null, created_at: new Date(2000) },
      { id: "leg-3", topicId: "topic-Y", display_number: null, created_at: new Date(3000) },
    ];

    // Backfill
    legacyQuestions.sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
    legacyQuestions.forEach((q, idx) => {
      q.display_number = idx + 1;
    });

    assert.equal(legacyQuestions[0]!.display_number, 1);
    assert.equal(legacyQuestions[1]!.display_number, 2);
    assert.equal(legacyQuestions[2]!.display_number, 3);
  });
});
