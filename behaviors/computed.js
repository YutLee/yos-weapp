/**
 * Checks if a value is empty.
 */
function isEmpty(value) {
  if (Array.isArray(value)) {
      return value.length === 0
  } else if (typeof value === 'object') {
      if (value) {
          for (const _ in value) {
              return false
          }
      }
      return true
  } else {
      return !value
  }
}

var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
* inlined Object.is polyfill to avoid requiring consumers ship their own
* https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/is
*/
function is(x, y) {
  // SameValue algorithm
  if (x === y) {
      // Steps 1-5, 7-10
      // Steps 6.b-6.e: +0 != -0
      // Added the nonzero y check to make Flow happy, but it is redundant
      return x !== 0 || y !== 0 || 1 / x === 1 / y;
  } else {
      // Step 6.a: NaN == NaN
      return x !== x && y !== y;
  }
}

/**
* Performs equality by iterating through keys on an object and returning false
* when any key has values which are not strictly equal between the arguments.
* Returns true when the values of all keys are strictly equal.
*/
function shallowEqual(objA, objB) {
  if (is(objA, objB)) {
      return true;
  }

  if (typeof objA !== 'object' || objA === null || typeof objB !== 'object' || objB === null) {
      return false;
  }

  var keysA = Object.keys(objA);
  var keysB = Object.keys(objB);

  if (keysA.length !== keysB.length) {
      return false;
  }

  // Test for A's keys different from B.
  for (var i = 0; i < keysA.length; i++) {
      if (!hasOwnProperty.call(objB, keysA[i]) || !is(objA[keysA[i]], objB[keysA[i]])) {
          return false;
      }
  }

  return true;
}

const ALL_DATA_KEY = '**'

const trim = (str = '') => str.replace(/\s/g, '')

export default Behavior({
  lifetimes: {
      attached() {
          this.initComputed(this.data)
      },
  },
  definitionFilter(defFields) {
      const { computed = {} } = defFields
      const observers = Object.keys(computed).reduce((acc, name) => {
          const [field, getter] = Array.isArray(computed[name]) ? computed[name] : [ALL_DATA_KEY, computed[name]]
          return {
              ...acc,
              [field]: function(...args) {
                if (typeof getter === 'function') {
                  const newValue = getter.apply(this, args)
                  const oldValue = this.data[name]
                      if (!isEmpty(newValue) && !shallowEqual(newValue, oldValue)) {
                          this.setData({ [name]: newValue })
                      }
                  }
              },
          }
      }, {})

      Object.assign(defFields.observers = (defFields.observers || {}), observers)
      Object.assign(defFields.methods = (defFields.methods || {}), {
          initComputed: function(data = {}, isForce = false) {
              if (!this.runInitComputed || isForce) {
                  this.runInitComputed = false
                  const context = this
                  const result = { ...this.data, ...data }
                  Object.keys(observers).forEach((key) => {
                      const values = trim(key).split(',').reduce((acc, name) => ([...acc, result[name]]), [])
                      observers[key].apply(context, values)
                  })
                  this.runInitComputed = true
              }
          },
      })
  },
})
