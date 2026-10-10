import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { expoSqliteConnection, LocalPetStore, type SqlConnection, type SqlExecutor } from './sqlite';
import { sqliteAccessTrace, SqlOperationError } from './sqliteAccess';
import { sqliteResourceCode } from './storageIncident';
import { storageEnvironment } from './nativeStorageDiagnostics';
import { initialPet } from '../domain/model';
import { APPROVED_GAME_CONFIG } from '../domain/config';

/** Explicit disposable namespace; all files retained. Never touches player DBs
 * or fills the host disk. DELETE-journal open failure and page quota are separate. */
export async function checkNativeReliability() {
  const root = new Directory(Paths.document, `storage-reliability-${Date.now()}`);root.create();
  const directory = new Directory(root,'database');directory.create();
  const originalUri=directory.uri;
  const name=`isolated-reliability-${Date.now()}.db`, db=await openDatabaseAsync(name,{useNewConnection:true},originalUri);
  const base=expoSqliteConnection(db),atMs=Date.now();let armed=false, journalBlocker:Directory|undefined,quotaPages:number|undefined;
  const observed:{case:string;code:number|null;phase:string;operation:string;environment:ReturnType<typeof storageEnvironment>;message:string;cleanup?:string}[]=[];
  const failConnection:SqlConnection={...base,withExclusiveTransactionAsync:work=>base.withExclusiveTransactionAsync(tx=>{
    if(quotaPages!==undefined) return tx.execAsync(`PRAGMA max_page_count=${quotaPages}`).then(()=>work(tx));
    const intercept:SqlExecutor={...tx,runAsync:async(sql,params)=>{
      if(armed&&/^UPDATE pet_snapshot/iu.test(sql.trim())){
        armed=false; journalBlocker=new Directory(directory,`${name}-journal`); journalBlocker.create();
        try{return await tx.runAsync(sql,params);}
        catch(error){observed.push({case:'JOURNAL_PATH_IS_DIRECTORY',code:sqliteResourceCode(error),phase:error instanceof SqlOperationError?error.phase:'unknown',operation:'UPDATE pet_snapshot',environment:storageEnvironment(db.databasePath),message:String(error),...(error instanceof SqlOperationError&&error.cleanupError?{cleanup:String(error.cleanupError)}:{})});throw error;}
        finally{journalBlocker.move(new Directory(root,'retained-journal-blocker'));journalBlocker=undefined;}
      }
      return tx.runAsync(sql,params);
    }};return work(intercept);
  })};
  const originalStore=new LocalPetStore(base,APPROVED_GAME_CONFIG),faultStore=new LocalPetStore(failConnection,APPROVED_GAME_CONFIG);
  try{
    await base.execAsync('PRAGMA journal_mode=DELETE; PRAGMA synchronous=FULL');await originalStore.migrate();
    const petId='isolated-cantopen-pet';await originalStore.createPet({...initialPet(petId,'격리 저장 시험','reserved',atMs,APPROVED_GAME_CONFIG),food:2,tableInstalled:true});
    const command={type:'consumeMeal' as const,commandId:'same-cantopen-request',mealId:'same-cantopen-meal',mode:'direct' as const,observedAtMs:atMs};
    const before=await originalStore.loadPet(petId);armed=true;let cantopen:unknown;
    try{await faultStore.execute(petId,command);}catch(error){cantopen=error;}
    if(sqliteResourceCode(cantopen)!==14||observed[0]?.phase!=='execute')throw new Error(`CANTOPEN execute was not reproduced: ${String(cantopen)}`);
    const after=await originalStore.loadPet(petId),zero=await base.getFirstAsync<{count:number}>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?',[petId]);
    if(JSON.stringify(before)!==JSON.stringify(after)||zero?.count!==0)throw new Error('CANTOPEN changed a failed economic state');
    await Promise.all(Array.from({length:20},()=>originalStore.execute(petId,command)));
    const recovered=await originalStore.loadPet(petId),one=await base.getFirstAsync<{count:number}>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?',[petId]);
    if(recovered?.food!==1||recovered.totalExpUnits!==15_000_000||one?.count!==1)throw new Error('CANTOPEN same-request recovery duplicated or lost settlement');

    const quotaId='isolated-full-pet';await originalStore.createPet({...initialPet(quotaId,'격리 용량 시험','reserved',atMs,APPROVED_GAME_CONFIG),food:1,tableInstalled:true});
    await base.execAsync('CREATE TABLE qa_space_probe (payload BLOB); CREATE TRIGGER qa_full BEFORE INSERT ON command_ledger BEGIN INSERT INTO qa_space_probe VALUES(zeroblob(131072)); END;');
    const pages=await base.getFirstAsync<{page_count:number}>('PRAGMA page_count');if(!pages)throw new Error('Missing page quota');
    const priorLimit=await base.getFirstAsync<{max_page_count:number}>('PRAGMA max_page_count');
    quotaPages=pages.page_count;
    const quotaBefore=await originalStore.loadPet(quotaId),quotaCommand={...command,commandId:'same-full-request',mealId:'same-full-meal'};let full:unknown;
    try{await faultStore.execute(quotaId,quotaCommand);}catch(error){full=error;observed.push({case:'ISOLATED_PAGE_QUOTA',code:sqliteResourceCode(error),phase:error instanceof SqlOperationError?error.phase:'unknown',operation:error instanceof SqlOperationError?error.operation:'unknown',environment:storageEnvironment(db.databasePath),message:String(error)});}
    finally{quotaPages=undefined;await base.execAsync(`PRAGMA max_page_count=${priorLimit?.max_page_count??1073741823}; DROP TRIGGER qa_full`);}
    if(sqliteResourceCode(full)!==13)throw new Error(`SQLite FULL was not reproduced: ${String(full)}`);
    if(JSON.stringify(quotaBefore)!==JSON.stringify(await originalStore.loadPet(quotaId)))throw new Error('FULL did not atomically roll back the snapshot');
    await Promise.all(Array.from({length:20},()=>originalStore.execute(quotaId,quotaCommand)));
    const quotaAfter=await originalStore.loadPet(quotaId),quotaMeals=await base.getFirstAsync<{count:number}>('SELECT COUNT(*) AS count FROM meal_ledger WHERE pet_id=?',[quotaId]);
    if(quotaAfter?.food!==0||quotaAfter.totalExpUnits!==15_000_000||quotaMeals?.count!==1)throw new Error('FULL same-request recovery duplicated settlement');
    const integrity=await base.getFirstAsync<{integrity_check:string}>('PRAGMA integrity_check');if(integrity?.integrity_check!=='ok')throw new Error('Isolated DB integrity failed');
    const result={status:'PASS_NATIVE_RESOURCE_RECOVERY',retainedDirectory:root.uri,name,actualJournal:'DELETE',observed,
      cantopen:{failedStateUnchanged:true,mealsBeforeRecovery:0,retries:20,meals:one.count,food:recovered.food,totalExpUnits:recovered.totalExpUnits},
      full:{failedStateUnchanged:true,retries:20,meals:quotaMeals.count,food:quotaAfter.food,totalExpUnits:quotaAfter.totalExpUnits},
      integrity:integrity.integrity_check,originalEventCause:'NOT_PROVEN_BY_SYNTHETIC_REPRO',trace:sqliteAccessTrace().filter(x=>x.file===name)};
    new File(root,'result.json').write(JSON.stringify(result,null,2));return result;
  }catch(error){new File(root,'failure.json').write(JSON.stringify({error:String(error),observed,trace:sqliteAccessTrace().filter(x=>x.file===name)},null,2));throw error;}finally{if(journalBlocker)journalBlocker.move(new Directory(root,'retained-journal-blocker'));await db.closeAsync();}
}
