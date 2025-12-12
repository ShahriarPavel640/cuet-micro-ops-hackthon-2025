import { Context, Env, Input, MiddlewareHandler, TypedResponse, ValidationTargets } from "hono";
import * as v3 from "zod/v3";
import { ZodSafeParseResult } from "zod/v4";
import * as v4 from "zod/v4/core";

//#region src/index.d.ts
type ZodSchema = v3.ZodType | v4.$ZodType;
type ZodError<T$1 extends ZodSchema> = T$1 extends v4.$ZodType ? v4.$ZodError<v4.output<T$1>> : v3.ZodError;
type ZodSafeParseResult$1<T$1, T2, T3 extends ZodSchema> = T3 extends v4.$ZodType ? ZodSafeParseResult<T$1> : v3.SafeParseReturnType<T$1, T2>;
type zInput<T$1> = T$1 extends v3.ZodType ? v3.input<T$1> : T$1 extends v4.$ZodType ? v4.input<T$1> : never;
type zOutput<T$1> = T$1 extends v3.ZodType ? v3.output<T$1> : T$1 extends v4.$ZodType ? v4.output<T$1> : never;
type zInfer<T$1> = T$1 extends v3.ZodType ? v3.infer<T$1> : T$1 extends v4.$ZodType ? v4.infer<T$1> : never;
type Hook<T$1, E extends Env, P extends string, Target extends keyof ValidationTargets = keyof ValidationTargets, O = {}, Schema extends ZodSchema = any> = (result: ({
  success: true;
  data: T$1;
} | {
  success: false;
  error: ZodError<Schema>;
  data: T$1;
}) & {
  target: Target;
}, c: Context<E, P>) => Response | void | TypedResponse<O> | Promise<Response | void | TypedResponse<O>>;
type HasUndefined<T$1> = undefined extends T$1 ? true : false;
type ExtractValidationResponse<VF> = VF extends ((value: any, c: any) => infer R) ? R extends Promise<infer PR> ? PR extends TypedResponse<infer T, infer S, infer F> ? TypedResponse<T, S, F> : PR extends Response ? PR : PR extends undefined ? never : never : R extends TypedResponse<infer T, infer S, infer F> ? TypedResponse<T, S, F> : R extends Response ? R : R extends undefined ? never : never : never;
type DefaultInput<Target extends keyof ValidationTargets, In, Out> = {
  in: HasUndefined<In> extends true ? { [K in Target]?: In extends ValidationTargets[K] ? In : { [K2 in keyof In]?: In[K2] extends ValidationTargets[K][K2] ? In[K2] : ValidationTargets[K][K2] } } : { [K in Target]: In extends ValidationTargets[K] ? In : { [K2 in keyof In]: In[K2] extends ValidationTargets[K][K2] ? In[K2] : ValidationTargets[K][K2] } };
  out: { [K in Target]: Out };
};
declare function zValidatorFunction<T$1 extends ZodSchema, Target extends keyof ValidationTargets, E extends Env, P extends string, In = zInput<T$1>, Out = zOutput<T$1>, I extends Input = DefaultInput<Target, In, Out>, V extends I = I>(target: Target, schema: T$1): MiddlewareHandler<E, P, V>;
declare function zValidatorFunction<T$1 extends ZodSchema, Target extends keyof ValidationTargets, E extends Env, P extends string, HookFn extends Hook<InferredValue, E, P, Target, {}, T$1>, In = zInput<T$1>, Out = zOutput<T$1>, I extends Input = DefaultInput<Target, In, Out>, V extends I = I, InferredValue = zInfer<T$1>>(target: Target, schema: T$1, hook?: HookFn, options?: {
  validationFunction: (schema: T$1, value: ValidationTargets[Target]) => ZodSafeParseResult$1<any, any, T$1> | Promise<ZodSafeParseResult$1<any, any, T$1>>;
}): MiddlewareHandler<E, P, V, ExtractValidationResponse<HookFn>>;
declare const zValidator: typeof zValidatorFunction;
//#endregion
export { Hook, zValidator };
//# sourceMappingURL=index.d.ts.map