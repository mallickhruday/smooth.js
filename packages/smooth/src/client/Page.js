import React, { useRef } from 'react'
import loadable from '@loadable/component'
import App from '__smooth_app'
import Content from '__smooth_content'
import { applyHook } from '../plugin/browser'
import PageContext from './PageContext'

function getFileName(filePath) {
  return filePath.replace(/^\.\//, '').replace(/\.js$/, '')
}

function getIndexPath(isIndex, name) {
  return isIndex ? '/' : `/${name}`
}

function getRoutePath(isIndex, isContent, name) {
  if (isContent) return isIndex ? '/:slug*' : `/${name}/:slug+`
  return getIndexPath(isIndex, name)
}

function getPage(filePath) {
  const rawName = getFileName(filePath)
  const isContent = !rawName.endsWith('$')
  const name = rawName.replace('$', '')
  const isIndex = name === 'index'
  const indexPath = getIndexPath(isIndex, name)
  const routePath = getRoutePath(isIndex, isContent, name)
  const LoadableComponent = loadable.lib(() =>
    import(`__smooth_pages/${rawName}`),
  )
  return {
    isIndex,
    isContent,
    indexPath,
    routePath,
    filePath,
    LoadableComponent,
  }
}

// First content, then indexes
function sortPages(a, b) {
  if (a.isContent === b.isContent) {
    if (a.isIndex === b.isIndex) return 0
    return a.isIndex < b.isIndex ? -1 : 1
  }
  return a.isContent < b.isContent ? -1 : 1
}

export function getPages() {
  const req = require.context(process.env.__smooth_pages, true, /\.js$/, 'weak')
  return req
    .keys()
    .map(getPage)
    .sort(sortPages)
}

export default function Page({
  page,
  lang,
  indexUrl,
  history,
  match,
  location,
}) {
  const PageComponent = useRef()
  const ContentComponent = useRef()
  return (
    <page.LoadableComponent>
      {pageModule => {
        if (page.isContent) {
          ContentComponent.current =
            ContentComponent.current ||
            (props => {
              const Component = pageModule.default
              const element = <Component {...props} />
              return applyHook(
                'wrapContentElement',
                { element, props },
                'element',
              )
            })

          PageComponent.current =
            PageComponent.current ||
            (() => <Content Component={ContentComponent.current} />)
        } else {
          ContentComponent.current = pageModule.default
        }

        const pageContext = {
          lang,
          page: { ...page, module: pageModule, indexUrl },
          history,
          match,
          location,
        }
        return (
          <PageContext.Provider value={pageContext}>
            <App {...pageContext} Component={PageComponent.current} />
          </PageContext.Provider>
        )
      }}
    </page.LoadableComponent>
  )
}