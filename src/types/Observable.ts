import { Except, IDisposable } from '../common'
import { Change, commit, IChangeTarget } from '../funcs/commit'

/**
 * Observers are disposable "change targets".
 *
 * Use `IChangeTarget<T>` if your observer is not disposable.
 */
export interface IObserver<T = any> extends IChangeTarget<T>, IDisposable {}

/** The source of truth for an observable */
export type Source<T = any> = (() => T) | Except<T, Function>

let nextId = 1

/** Unique symbol for the internal Observable instance */
export const __$observable = Symbol('vana:observable') // tslint:disable-line

/** An observable value */
export class Observable<T = any> implements IObserver<T> {
  ['_observers']?: Array<IChangeTarget<T>> = undefined
  protected _get?: () => T
  protected _value?: T

  readonly id: number

  constructor(source: Source<T>) {
    this.id = nextId++
    this._rebind(source)
  }

  get(): T {
    return this._get ? this._get() : this._value!
  }

  /**
   * When the source of truth is a getter, this method only notifies observers.
   * Otherwise, this method also updates the current value.
   */
  set(newValue: T) {
    let oldValue = this.get()
    if (newValue !== oldValue) {
      if (!this._get) {
        this._value = newValue
      }
      commit(this, oldValue, newValue)
    }
  }

  /** Listen for changes. */
  tap(onUpdate: (value: T) => void) {
    let observer: IObserver<T> = {
      dispose: () => this._removeObserver(observer),
      _onChange: change => change.prop !== null || onUpdate(change.newValue),
    }
    this._addObserver(observer)
    return observer
  }

  /** Remove all observers and perform subclass cleanup (if necessary) */
  dispose() {
    if (this._observers) {
      this._observers = undefined
      this.deactivate()
    }
  }

  /** @internal Notify observers of a change */
  ['_onChange'](change: Change<T>) {
    if (!this._observers) return
    for (let observer of this._observers) {
      observer._onChange(change)
    }
  }

  /** @internal Returns false when the given value is outdated */
  ['_isCurrent'](value: any) {
    return value === this.get()
  }

  /** @internal Swap out the source of truth for this observable. */
  ['_rebind'](source: Source<T>) {
    this._get = typeof source == 'function' ? (source as any) : undefined
    this._value = this._get ? undefined : (source as any)
  }

  /** @internal */
  ['_addObserver'](observer: IChangeTarget<T>) {
    if (this._observers) {
      this._observers.push(observer)
    } else {
      this.activate()
      this._observers = [observer]
    }
  }

  /** @internal */
  ['_removeObserver'](observer: IChangeTarget<T>) {
    let observers = this._observers
    if (observers) {
      let index = observers.indexOf(observer)
      if (index < 0) return
      if (observers.length > 1) {
        observers.splice(index, 1)
      } else {
        this._observers = undefined
        this.deactivate()
      }
    }
  }

  /** Called when an Observable goes from 0 observers to 1+ */
  protected activate() {}

  /** Called when an Observable goes from 1+ observers to 0 */
  protected deactivate() {}
}

/** Returns true if the given value has been passed to `o()` and is not stale. */
export function isObservable(value: any): value is object {
  if (value) {
    let observable: Observable = value[__$observable]
    if (observable) {
      return observable._isCurrent(value)
    }
  }
  return false
}

/** Throws an error when the given object is an old revision */
export function getObservable(value: object) {
  let observable: Observable = value[__$observable]
  if (observable) {
    if (!observable._isCurrent(value)) {
      throw Error('Outdated values cannot be observed')
    }
    return observable
  }
}

/** @internal */
export function getObservers(value: object) {
  let observable = getObservable(value)
  if (observable) return observable._observers
  throw Error('Not observable')
}
