import { it, expect, describe } from 'vitest'

import { LWWMap } from './LwwMap'

it('should create a new LWWMap', () => {
  const map = new LWWMap('alice', {})
  expect(map).toBeDefined()
})

describe('LWWMap', () => {
  // Basic operations
  describe('basic operations', () => {
    it('should create an empty map', () => {
      const map = new LWWMap('alice', {})
      expect(map.value).toEqual({})
    })

    it('should set and get values', () => {
      const map = new LWWMap('alice', {})
      map.set('name', 'Alice')
      expect(map.get('name')).toBe('Alice')
    })

    it('should check if key exists', () => {
      const map = new LWWMap('alice', {})
      map.set('name', 'Alice')
      expect(map.has('name')).toBe(true)
      expect(map.has('age')).toBe(false)
    })

    it('should delete values', () => {
      const map = new LWWMap('alice', {})
      map.set('name', 'Alice')
      map.delete('name')
      expect(map.has('name')).toBe(false)
      expect(map.get('name')).toBeUndefined()
    })
  })

  // Merge scenarios
  describe('merge operations', () => {
    it('should merge states with higher timestamps winning', () => {
      const map1 = new LWWMap('alice', {})
      const map2 = new LWWMap('bob', {})

      // Set initial values
      map1.set('name', 'Alice')
      map2.set('name', 'Bob')

      // Make another update to map2 (timestamp will be 2)
      map2.set('name', 'Bobby')

      // Merge states
      map1.merge(map2.state)

      expect(map1.get('name')).toBe('Bobby')
    })

    it('should handle peer ID tie-breaking for same timestamps', () => {
      const map1 = new LWWMap('alice', {})
      const map2 = new LWWMap('bob', {})

      // Set values (both will have timestamp 1)
      map1.set('name', 'Alice')
      map2.set('name', 'Bob')

      // Merge states (bob > alice alphabetically)
      map1.merge(map2.state)

      expect(map1.get('name')).toBe('Bob')
    })

    it('should handle concurrent modifications to different keys', () => {
      const map1 = new LWWMap('alice', {})
      const map2 = new LWWMap('bob', {})

      map1.set('name', 'Alice')
      map2.set('age', '25')

      map1.merge(map2.state)
      map2.merge(map1.state)

      // Both maps should have both keys
      expect(map1.value).toEqual({
        name: 'Alice',
        age: '25',
      })
      expect(map2.value).toEqual({
        name: 'Alice',
        age: '25',
      })
    })
  })

  // Tombstone behavior
  describe('tombstone behavior', () => {
    it('should handle deletes with timestamps correctly', () => {
      const map1 = new LWWMap('alice', {})
      const map2 = new LWWMap('bob', {})

      // Set initial value
      map1.set('name', 'Alice')

      // Share state with map2
      map2.merge(map1.state)

      // Delete in map1
      map1.delete('name')

      // Try to update in map2 with same timestamp
      map2.set('name', 'Bob')

      // Merge back
      map1.merge(map2.state)

      // Bob's update should win (bob > alice)
      expect(map1.get('name')).toBe('Bob')
    })

    it('should not revive deleted entries with older timestamps', () => {
      const map1 = new LWWMap('alice', {})

      // Set and delete
      map1.set('name', 'Alice') // timestamp 1
      map1.delete('name') // timestamp 2

      // Try to merge older state
      map1.merge({
        name: ['bob', 1, 'Bob'], // older timestamp
      })

      expect(map1.has('name')).toBe(false)
    })
  })

  // Edge cases
  describe('edge cases', () => {
    it('should handle empty merges', () => {
      const map1 = new LWWMap('alice', {})
      map1.set('name', 'Alice')

      map1.merge({})

      expect(map1.get('name')).toBe('Alice')
    })

    it('should handle multiple successive merges', () => {
      const map2 = new LWWMap('bob', {})
      const map3 = new LWWMap('carol', {})

      map2.set('name', 'Bob') // timestamp 1
      map3.set('name', 'Carol') // timestamp 1

      // First order: (map1 + map2) + map3
      const map1A = new LWWMap('alice', {})
      // timestamp is 1 here
      map1A.set('name', 'Alice')

      // timestamp is 2 here
      map1A.merge(map2.state)
      // timestamp is 3 here
      map1A.merge(map3.state)
      const result1 = map1A.get('name')

      // This is "Carol"
      // Because carol > bob > alice (alphabetical order)
      console.log('result1', result1)

      // Second order: map1 + (map2 + map3)
      const map1B = new LWWMap('alice', {})
      // timestamp is 1 here
      map1B.set('name', 'Alice')

      // First merge map2 and map3
      // no timestamp yet
      const tempMap = new LWWMap('bob', {})
      // timestamp is 1 here
      tempMap.merge(map2.state)
      // timestamp is 2 here
      tempMap.merge(map3.state)

      // Then merge result with map1
      // timestamp is 3 here
      // because 2 from tempMap and 1 from map1B
      map1B.merge(tempMap.state)
      const result2 = map1B.get('name')

      // This is "Carol"
      // Because carol > bob > alice (alphabetical order)
      console.log('result2', result2)

      expect(result1).toBe(result2)
      expect(result1).toBe('Carol') // carol > bob > alice
    })
  })
})
