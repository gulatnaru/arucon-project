import test from 'node:test';import assert from 'node:assert/strict';
import type { SQLiteDatabase } from 'expo-sqlite';
import { sqliteResourceCode, StorageIncidentRecorder, type StorageEnvironment } from '../../src/storage/storageIncident';
import { observeSqliteAccess, nativeStatement, SqlOperationError, type SqlAccessTrace } from '../../src/storage/sqliteAccess';
const entry=(id:number,patch:Partial<SqlAccessTrace>={}):SqlAccessTrace=>({id,file:'player.db',operation:'UPDATE pet_snapshot',phase:'execute',status:'failed',atMs:id,waiting:0,connectionId:1,transactionId:2,error:'Error code 14: unable to open database file',...patch});
const env:StorageEnvironment={availableBytes:127*1024*1024,mainUri:'file:///test/player.db',mainExists:true,parentExists:true,journalExists:false,walExists:false,tempDirectoryExists:false,attemptedVfsPath:'NOT_EXPOSED_BY_EXPO',note:'observed candidates, not an actual xOpen path'};
test('resource codes distinguish FULL/CANTOPEN/extended codes from contention; follow cause chain',()=>{
 assert.equal(sqliteResourceCode(new Error('database is locked')),null);assert.equal(sqliteResourceCode(new Error('SQLITE_FULL')),13);assert.equal(sqliteResourceCode(new Error('Error code 782: extended cantopen')),782);
 assert.equal(sqliteResourceCode(new Error('cleanup',{cause:new Error('Error code 14: failed')})),14);
});
test('first execute failure and environment survive later cleanup/repeated errors without conflating recovery with original cause',()=>{
 const r=new StorageIncidentRecorder();let reads=0;const environment=()=>{reads++;return env;};
 assert.equal(r.observe(entry(1),environment),true);r.observe(entry(2,{phase:'finalize',status:'cleanup_failed'}),environment);r.observe(entry(3,{operation:'TRANSACTION',phase:'transaction'}),environment);
 assert.equal(reads,1);assert.equal(r.snapshot()[0].first.phase,'execute');assert.equal(r.snapshot()[0].first.id,1);assert.equal(r.snapshot()[0].cleanup.length,1);
 r.observe(entry(4,{file:'other.db',operation:'TRANSACTION',phase:'transaction',status:'complete',error:undefined}),environment);assert.equal(r.snapshot()[0].recovery,undefined);
 r.observe(entry(5,{operation:'TRANSACTION',phase:'transaction',status:'complete',error:undefined,connectionId:3,transactionId:4}),environment);
 assert.equal(r.snapshot()[0].recovery?.id,5);assert.equal(r.snapshot()[0].environment.attemptedVfsPath,'NOT_EXPOSED_BY_EXPO');
 const copy=r.snapshot();(copy[0].first as {id:number}).id=100;assert.equal(r.snapshot()[0].first.id,1);
});
test('diagnostic observer failures cannot replace primary SQL failures or skip statement cleanup',async()=>{
 const error=new Error('Error code 14: cannot open');let cleanup=0;
 const db={databasePath:'/isolated/observer.db',prepareAsync:async()=>({executeAsync:async()=>{throw error;},finalizeAsync:async()=>{cleanup++;}})}as unknown as SQLiteDatabase;
 const stop=observeSqliteAccess(()=>{throw new Error('diagnostic file unavailable');});
 try{await assert.rejects(nativeStatement(db,'UPDATE pet_snapshot SET revision=?',['private-bind'],'run'),x=>x instanceof SqlOperationError&&x.cause===error&&x.phase==='execute');assert.equal(cleanup,1);}finally{stop();}
});
