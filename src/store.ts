import { readFileSync, writeFileSync, renameSync, mkdirSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { z } from 'zod';
import { FlagSchema,seed,type Flag } from './engine.js';
const AuditSchema=z.object({at:z.string(),key:z.string(),from:z.number(),to:z.number(),enabled:z.boolean(),rollout:z.number()});
const StateSchema=z.object({flags:z.array(FlagSchema),audit:z.array(AuditSchema)});
export class Conflict extends Error {}
export class Missing extends Error {}
export class Store {
 private state: z.infer<typeof StateSchema>;
 constructor(private path?:string) {
  this.state=path && existsSync(path)?StateSchema.parse(JSON.parse(readFileSync(path,'utf8'))):{flags:structuredClone(seed),audit:[]};
 }
 list(){return structuredClone(this.state.flags);}
 get(key:string){return this.list().find(f=>f.key===key);}
 audit(){return structuredClone(this.state.audit.slice(-50).reverse());}
 update(key:string,next:Flag){
  const old=this.get(key); if(!old) throw new Missing('Unknown flag');
  if(next.key!==key) throw new Error('Flag key is immutable');
  if(old.version!==next.version) throw new Conflict('Version changed; reload before saving');
  const updated={...next,version:old.version+1};
  const state={flags:this.list().map(f=>f.key===key?updated:f),audit:[...this.state.audit,{at:new Date().toISOString(),key,from:old.version,to:updated.version,enabled:updated.enabled,rollout:updated.rollout}].slice(-1000)};
  // Publish state only after durable replacement succeeds. One process/writer only.
  if(this.path){mkdirSync(dirname(this.path),{recursive:true});writeFileSync(this.path+'.tmp',JSON.stringify(state,null,2),{mode:0o600});renameSync(this.path+'.tmp',this.path);}
  this.state=state; return structuredClone(updated);
 }
}
