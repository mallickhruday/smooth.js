import React, {
  useRef,
  useCallback,
  createContext,
  useContext,
  useMemo,
  useEffect,
} from 'react'
import { createPath } from 'history'
import { Router, withRouter } from 'react-router-dom'
import HiddenHistoryContext from './HiddenHistoryContext'

export const HiddenRouterContext = createContext()

export function useHiddenRouter() {
  return useContext(HiddenRouterContext)
}

export function usePause() {
  const resolve = useRef()
  const promise = useMemo(
    () =>
      new Promise(r => {
        resolve.current = r
      }),
    [],
  )
  const hiddenRouter = useHiddenRouter()
  useEffect(() => {
    if (hiddenRouter) {
      hiddenRouter.waitForPromise(promise)
    }
  }, [hiddenRouter, promise])
  return resolve.current
}

function createURL(location) {
  return typeof location === 'string' ? location : createPath(location)
}

function HiddenRouter({ history, children }) {
  const hiddenHistory = useContext(HiddenHistoryContext)
  const promises = useRef([])

  const flush = useCallback(() => {
    if (promises.current.length || !hiddenHistory.state) return
    const [method, action, state] = hiddenHistory.state
    history[method](action, state)
    hiddenHistory.reset()
  }, [hiddenHistory, history])

  const waitForPromise = useCallback(
    promise => {
      if (promises.current.includes(promise)) return
      promise.then(() => {
        const index = promises.current.indexOf(promise)
        if (index !== -1) {
          promises.current.splice(index, 1)
        }
        // 65ms is 4 frames, pretty invisible when we change page
        // it ensures that React have time to start a new request for an example
        setTimeout(() => flush(), 65)
      })
      promises.current.push(promise)
    },
    [flush],
  )

  const hiddenRouter = useMemo(() => ({ waitForPromise }), [waitForPromise])

  const staticHistory = useMemo(() => {
    if (!hiddenHistory.location) return null
    const noop = () => {}
    return {
      action: 'POP',
      location: hiddenHistory.location,
      push: noop,
      replace: noop,
      go: noop,
      goBack: noop,
      goForward: noop,
      listen: () => noop,
      block: () => noop,
      createHref: path => createURL(path),
    }
  }, [hiddenHistory.location])

  return staticHistory ? (
    <div style={{ display: 'none' }} hidden>
      <HiddenRouterContext.Provider value={hiddenRouter}>
        <Router history={staticHistory}>{children}</Router>
      </HiddenRouterContext.Provider>
    </div>
  ) : null
}

export default withRouter(HiddenRouter)
