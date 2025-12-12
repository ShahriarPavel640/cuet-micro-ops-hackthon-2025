import type { Context, Env, MiddlewareHandler } from 'hono';
import type { ApiReferenceConfiguration } from './types.js';
/**
 * The custom theme for Hono
 */
export declare const customTheme = "\n.dark-mode {\n  color-scheme: dark;\n  --scalar-color-1: rgba(255, 255, 245, .86);\n  --scalar-color-2: rgba(255, 255, 245, .6);\n  --scalar-color-3: rgba(255, 255, 245, .38);\n  --scalar-color-disabled: rgba(255, 255, 245, .25);\n  --scalar-color-ghost: rgba(255, 255, 245, .25);\n  --scalar-color-accent: #e36002;\n  --scalar-background-1: #1e1e20;\n  --scalar-background-2: #2a2a2a;\n  --scalar-background-3: #505053;\n  --scalar-background-4: rgba(255, 255, 255, 0.06);\n  --scalar-background-accent: #e360021f;\n\n  --scalar-border-color: rgba(255, 255, 255, 0.1);\n  --scalar-scrollbar-color: rgba(255, 255, 255, 0.24);\n  --scalar-scrollbar-color-active: rgba(255, 255, 255, 0.48);\n  --scalar-lifted-brightness: 1.45;\n  --scalar-backdrop-brightness: 0.5;\n\n  --scalar-shadow-1: 0 1px 3px 0 rgb(0, 0, 0, 0.1);\n  --scalar-shadow-2: rgba(15, 15, 15, 0.2) 0px 3px 6px,\n    rgba(15, 15, 15, 0.4) 0px 9px 24px, 0 0 0 1px rgba(255, 255, 255, 0.1);\n\n  --scalar-button-1: #f6f6f6;\n  --scalar-button-1-color: #000;\n  --scalar-button-1-hover: #e7e7e7;\n\n  --scalar-color-green: #3dd68c;\n  --scalar-color-red: #f66f81;\n  --scalar-color-yellow: #f9b44e;\n  --scalar-color-blue: #5c73e7;\n  --scalar-color-orange: #ff8d4d;\n  --scalar-color-purple: #b191f9;\n}\n/* Sidebar */\n.dark-mode .sidebar {\n  --scalar-sidebar-background-1: #161618;\n  --scalar-sidebar-item-hover-color: var(--scalar-color-accent);\n  --scalar-sidebar-item-hover-background: transparent;\n  --scalar-sidebar-item-active-background: transparent;\n  --scalar-sidebar-border-color: transparent;\n  --scalar-sidebar-color-1: var(--scalar-color-1);\n  --scalar-sidebar-color-2: var(--scalar-color-2);\n  --scalar-sidebar-color-active: var(--scalar-color-accent);\n  --scalar-sidebar-search-background: #252529;\n  --scalar-sidebar-search-border-color: transparent;\n  --scalar-sidebar-search-color: var(--scalar-color-3);\n}\n";
type Configuration<E extends Env> = Partial<ApiReferenceConfiguration> | ((c: Context<E>) => Partial<ApiReferenceConfiguration> | Promise<Partial<ApiReferenceConfiguration>>);
/**
 * The Hono middleware for the Scalar API Reference.
 */
export declare const Scalar: <E extends Env>(configOrResolver: Configuration<E>) => MiddlewareHandler<E>;
/**
 * @deprecated Use `Scalar` instead.
 */
export declare const apiReference: <E extends Env>(configOrResolver: Configuration<E>) => MiddlewareHandler<E>;
export {};
//# sourceMappingURL=scalar.d.ts.map