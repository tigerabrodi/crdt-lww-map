# CRDTs

I built a Last Write Wins Map and Register from scratch. The goal here was to learn more about CRDTs.

CRDTs, Conflict-free Replicated Data Types, are data structures that can be replicated across nodes in a network without conflicts.

They're used for building collaborative and offline-first applications.

Generally, there are fundamental concepts of distributed systems that you need to understand to understand this is a whole:

- Logical Clocks
- Causal Order
- Tombstones

A normal clock uses a crystal oscillator to tick at a constant rate. Or it uses atomic clocks. Atomic clocks are more accurate, but still have a slight drift. Your clock might think 60 seconds have passed, but mine thinks 59.9 seconds have passed. Before you know it, days have passed and our clocks are couple of seconds out of sync. That's why we can not use normal timestamps when determining last write wins. Also called when we need to determine the causality of events.

"Causal order" is the order in which events occurred. Timestamp will make the impossible things happen.

For example, if I send you a message at 10:00 AM, it might tell me that it arrived at 09:59 AM. This is impossible and incorrect. Happens because of the different drift of the clocks.

---

Tombstones are markers used to indicate that a value has been deleted. We simply use the value null to represent a deleted value. We can't delete the value, because when the merge happens and data syncs, we don't know if value was deleted or if it was never there in the first place.

Therefore tombstones are used to indicate that a value has been deleted.
