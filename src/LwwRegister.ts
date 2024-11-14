/**
 * Last-Write-Wins Register: A CRDT for single values
 * Handles merging of single values using timestamps and peer IDs
 */
export class LWWRegister<ValueType> {
  // Unique identifier for this register instance (never changes)
  readonly id: string

  // Current state: [peer who last wrote, timestamp, current value]
  state: State<ValueType>

  constructor(id: string, state: State<ValueType>) {
    this.id = id
    this.state = state
  }

  // Expose only the value to outside world
  get value() {
    return this.state[2]
  }

  // Update the local register's value
  set(value: ValueType) {
    // Increment local timestamp and set new value with our ID
    this.state = [this.id, this.state[1] + 1, value]
  }

  merge(remoteState: State<ValueType>) {
    const [remotePeer, remoteTimestamp] = remoteState
    const [localPeer, localTimestamp] = this.state

    // If our timestamp is newer, keep our value
    // timestamp is a single integer
    // it is a logical clock
    if (localTimestamp > remoteTimestamp) return

    // If timestamps are equal, break tie with peer ID
    if (localTimestamp === remoteTimestamp && localPeer > remotePeer) return

    // Remote state wins: newer timestamp or equal timestamp with greater peer ID
    this.state = remoteState
  }
}
