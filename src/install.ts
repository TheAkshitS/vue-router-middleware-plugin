import { middlewarePipeline } from './helpers/middlewarePipeline'
import { retuenMiddlewareArray } from './helpers/returnMiddlewareArray'
import { BasePluginError } from './lib/Exceptions/BasePluginError'
import { OptionsMissingPluginError } from './lib/Exceptions/OptionsMissingPluginError'
import { Middleware } from './types/MiddlewareTypes'
import { Install, PluginOptions } from './types/PluginTypes'
import {
  Route,
  RouteContext,
  RouteHook,
  Router,
  RouteResolver,
  Vue
} from './types/VueTypes'

export const install: Install<Router | PluginOptions> = (
  vue: Vue,
  options?: Router | PluginOptions
) => {
  let router: Router
  let globalMiddlewares: Middleware[] = []
  let context: RouteContext = {}

  if (options && (options as PluginOptions).router) {
    const {
      router: _router,
      middleware,
      context: _context
    } = options as PluginOptions
    router = _router

    /* istanbul ignore if */
    if (middleware !== undefined) {
      globalMiddlewares = retuenMiddlewareArray(middleware)
    }

    if (_context !== undefined) {
      /* istanbul ignore if */
      if (typeof _context === 'object') {
        context = { ..._context }
      } else {
        throw new BasePluginError('invalid context provided in plugin options')
      }
    }
  } else {
    router = options as Router
  }

  /* istanbul ignore else */
  if (router === undefined) {
    throw new OptionsMissingPluginError('router is a required option.')
  } else {
    const routeHook: RouteHook = (
      to: Route,
      from: Route,
      next: RouteResolver
    ) => {
      let middlewares = [...globalMiddlewares]
      if ('middleware' in to.meta) {
        if (typeof to.meta.middleware === 'object') {
          let ignores: Middleware[] = []
          if ('attach' in to.meta.middleware) {
            middlewares = retuenMiddlewareArray(
              to.meta.middleware.attach,
              middlewares
            )
          }
          if ('ignore' in to.meta.middleware) {
            ignores = retuenMiddlewareArray(to.meta.middleware.ignore)
          }

          middlewares = middlewares.filter(
            middleware => !ignores.includes(middleware)
          )
        } else {
          middlewares = retuenMiddlewareArray(to.meta.middleware, middlewares)
        }
      }
      if (middlewares.length) {
        context = { ...context, to, from, next }
        middlewarePipeline(context, middlewares)
      } else {
        next()
      }
    }

    router.beforeEach(routeHook)
  }
}
