import express from 'express';
import { timingSafeEqual } from 'node:crypto';
import { ContextSchema,FlagSchema,evaluate } from './engine.js';
import { Store,Conflict,Missing } from './store.js';
export function createApp(store:Store,token:string){
 const app=express(); app.disable('x-powered-by'); app.use(express.json({limit:'16kb'}));
 app.use((_req,res,next)=>{res.set('X-Content-Type-Options','nosniff');res.set('Cache-Control','no-store');next();});
 app.get('/api/health',(_req,res)=>res.json({status:'ok',mode:'educational-demo'}));
 app.get('/api/flags',(_req,res)=>res.json(store.list()));
 app.get('/api/audit',(_req,res)=>res.json(store.audit()));
 app.post('/api/evaluate/:key',(req,res)=>{
  const parsed=ContextSchema.safeParse(req.body); if(!parsed.success){res.status(400).json({error:'Invalid evaluation context'});return;}
  res.json(evaluate(store.get(String(req.params.key)),parsed.data));
 });
 app.put('/api/flags/:key',(req,res)=>{
  const supplied=req.headers.authorization??''; const expected=`Bearer ${token}`;
  if(!token || Buffer.byteLength(supplied)!==Buffer.byteLength(expected) || !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))){res.status(401).json({error:'Admin token required'});return;}
  const parsed=FlagSchema.safeParse(req.body); if(!parsed.success || parsed.data.key!==req.params.key){res.status(400).json({error:'Invalid flag or key mismatch'});return;}
  try{res.json(store.update(String(req.params.key),parsed.data));}catch(e){
   if(e instanceof Conflict){res.status(409).json({error:e.message});return;}
   if(e instanceof Missing){res.status(404).json({error:e.message});return;} throw e;
  }
 });
 app.use(express.static('dist'));
 app.use((err:unknown,_req:express.Request,res:express.Response,_next:express.NextFunction)=>{
  if(err instanceof SyntaxError){res.status(400).json({error:'Invalid JSON'});return;}
  res.status(500).json({error:'Request failed'});
 }); return app;
}
