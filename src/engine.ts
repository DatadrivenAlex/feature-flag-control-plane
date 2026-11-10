import { createHash } from 'node:crypto';
import { z } from 'zod';
export const FlagSchema = z.object({
  key: z.string().regex(/^[a-z][a-z0-9-]{2,63}$/),
  name: z.string().min(1).max(100), enabled: z.boolean(),
  rollout: z.number().int().min(0).max(100),
  plans: z.array(z.enum(['free','pro','enterprise'])).max(3),
  version: z.number().int().positive()
}).strict();
export const ContextSchema = z.object({
  subject: z.string().min(1).max(100),
  plan: z.enum(['free','pro','enterprise'])
}).strict();
export type Flag = z.infer<typeof FlagSchema>;
export type Context = z.infer<typeof ContextSchema>;
export function bucket(key: string, subject: string): number {
  // Length-delimited tuple prevents ambiguous concatenation; no raw subject is returned.
  const digest = createHash('sha256').update(JSON.stringify([key,subject])).digest();
  return digest.readUInt32BE(0) % 10000;
}
export function evaluate(flag: Flag | undefined, context: Context) {
  if (!flag) return { value:false, reason:'flag_not_found', version:null, bucket:null };
  const b = bucket(flag.key,context.subject);
  if (!flag.enabled) return { value:false, reason:'disabled',version:flag.version,bucket:b };
  if (flag.plans.length && !flag.plans.includes(context.plan))
    return { value:false,reason:'plan_not_targeted',version:flag.version,bucket:b };
  const value = b < flag.rollout * 100;
  return { value, reason:value?'rollout_match':'outside_rollout', version:flag.version,bucket:b };
}
export const seed: Flag[] = [
 {key:'smart-search',name:'Smart search preview',enabled:true,rollout:35,plans:['pro','enterprise'],version:1},
 {key:'checkout-v2',name:'Checkout refresh',enabled:false,rollout:100,plans:[],version:1},
 {key:'usage-insights',name:'Usage insights',enabled:true,rollout:100,plans:[],version:1}
];
