import { LWWRegister } from './LwwRegister'

// Types for LWWMap
type Value<ValueType> = {
  [key: string]: ValueType // Simple key-value map visible to users
}

type StateObject<ValueType> = {
  [key: string]: State<ValueType>
}

/**
 * Last-Write-Wins Map: A CRDT for key-value maps
 * Composes multiple LWWRegisters to handle multiple key-value pairs
 */
export class LWWMap<ValueType> {
  // Unique identifier for this map instance
  readonly id: string

  // Internal storage: each value is managed by its own LWWRegister
  // #data is private
  #data = new Map<string, LWWRegister<ValueType | null>>()

  constructor(id: string, state: StateObject<ValueType>) {
    this.id = id

    for (const [key, registerState] of Object.entries(state)) {
      this.#data.set(key, new LWWRegister(this.id, registerState))
    }
  }

  // Expose a clean key-value view to users (hiding CRDT complexity)
  get value() {
    const value: Value<ValueType> = {}

    for (const [key, register] of this.#data.entries()) {
      // Only include non-null values (exclude tombstones)
      // tombstone means value is deleted
      // they're marked with null
      if (register.value !== null) {
        value[key] = register.value
      }
    }

    return value
  }

  // Get the full CRDT state for all keys
  get state() {
    const state: StateObject<ValueType | null> = {}

    for (const [key, register] of this.#data.entries()) {
      state[key] = register.state
    }

    return state
  }

  has(key: string) {
    const value = this.#data.get(key)
    if (value === undefined) return false

    return value.value !== null
  }

  get(key: string) {
    const register = this.#data.get(key)

    if (!register) return undefined

    if (!register.value) return undefined

    return register.value
  }

  set(key: string, value: ValueType) {
    const register = this.#data.get(key)

    if (register) {
      // Key exists: update its register
      register.set(value)
    } else {
      // New key: create new register with initial state
      this.#data.set(key, new LWWRegister(this.id, [this.id, 1, value]))
    }
  }

  // Delete a key (by setting its value to null)
  delete(key: string) {
    // Setting to null serves as a tombstone
    this.#data.get(key)?.set(null)
  }

  // Merge incoming state from another LWWMap
  merge(remoteState: StateObject<ValueType | null>) {
    for (const [key, remoteRegisterState] of Object.entries(remoteState)) {
      const localRegister = this.#data.get(key)

      if (localRegister) {
        // Key exists: let the register handle the merge
        // This is the `merge` that belongs to the LWWRegister class
        localRegister.merge(remoteRegisterState)
      } else {
        this.#data.set(key, new LWWRegister(this.id, remoteRegisterState))
      }
    }
  }
}
