import { Directory, File, Paths } from 'expo-file-system';
import { openDatabaseAsync } from 'expo-sqlite';
import { expoSqliteConnection, LocalPetStore, type SqlConnection, type SqlExecutor } from './sqlite';
import { sqliteAccessTrace, SqlOperationError } from './sqliteAccess';
import { sqliteResourceCode, type StorageIncident } from './storageIncident';
import { MAX_DIAGNOSTIC_BYTES, StorageDiagnosticArchive } from './storageDiagnosticArchive';
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
      integrity:integrity.integrity_check,diagnosticArchive:await checkNativeDiagnosticArchive(),originalEventCause:'NOT_PROVEN_BY_SYNTHETIC_REPRO',trace:sqliteAccessTrace().filter(x=>x.file===name)};
    new File(root,'result.json').write(JSON.stringify(result,null,2));return result;
  }catch(error){new File(root,'failure.json').write(JSON.stringify({error:String(error),observed,trace:sqliteAccessTrace().filter(x=>x.file===name)},null,2));throw error;}finally{if(journalBlocker)journalBlocker.move(new Directory(root,'retained-journal-blocker'));await db.closeAsync();}
}

/** Real native File IO in a separate retained directory. Interrupted writes and
 * incident metadata are synthetic; this does not fill the disk or touch DBs. */
async function checkNativeDiagnosticArchive() {
  const canonical = (x: unknown): unknown => Array.isArray(x) ? x.map(canonical)
    : typeof x === 'object' && x !== null ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)])) : x;
  const equal = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
  const root = new Directory(Paths.document, `storage-diagnostic-check-${Date.now()}`); root.create();
  const io = {
    read: (name: string) => {
      const file = new File(root, name); if (!file.exists) return null;
      if (file.size > MAX_DIAGNOSTIC_BYTES) throw new Error('Fixture file exceeds limit');
      return file.textSync();
    },
    write: (name: string, text: string) => new File(root, name).write(text),
  };
  const event = (id: number): StorageIncident => ({ sessionId: 'synthetic-native-file-qa', code: 14,
    first: { id, file: 'isolated-diagnostic-fixture.db', operation: 'UPDATE pet_snapshot', phase: 'execute',
      status: 'failed', atMs: Date.now(), waiting: 0, connectionId: 1, transactionId: id,
      error: 'Error code 14: synthetic incident metadata' }, cleanup: [],
    environment: { availableBytes: Paths.availableDiskSpace, mainUri: new File(root, 'not-opened.db').uri,
      mainExists: false, parentExists: true, journalExists: false, walExists: false, tempDirectoryExists: null,
      attemptedVfsPath: 'NOT_EXPOSED_BY_EXPO', note: 'Synthetic metadata; native File IO only.' } });
  const records = [event(1), event(2)], initial = new StorageDiagnosticArchive(io); initial.restore(); initial.save({ incidents: records });
  const protectedFile = initial.state().activeFile!, before = io.read(protectedFile);
  const interrupted = new StorageDiagnosticArchive({ ...io, write: (name, text) => {
    io.write(name, text.slice(0, 40)); throw new Error('synthetic interrupted write');
  } });
  interrupted.restore(); let interruption: unknown;
  try { interrupted.save({ incidents: [...records, event(3)] }); } catch (error) { interruption = error; }
  if (!interruption || io.read(protectedFile) !== before) throw new Error('Native interrupted checkpoint lost prior file');
  const reopened = new StorageDiagnosticArchive(io), recovered = reopened.restore();
  if (!equal(recovered, records) || reopened.state().readErrors.length !== 1) throw new Error('Native checkpoint fallback failed');
  const repaired = [...records, event(3)]; reopened.save({ incidents: repaired });
  const silent = new StorageDiagnosticArchive({ ...io, write: (name, text) => io.write(name, text.slice(0, 40)) });
  silent.restore(); let verification: unknown;
  try { silent.save({ incidents: [...repaired, event(4)] }); } catch (error) { verification = error; }
  if (!String(verification).includes('verification failed')) throw new Error('Native incomplete write was accepted');
  const final = new StorageDiagnosticArchive(io), restored = final.restore();
  if (!equal(restored, repaired)) throw new Error('Native verified checkpoint did not survive reopening');
  const result = { status: 'PASS_NATIVE_DIAGNOSTIC_FILE_RECOVERY', incidentMetadata: 'SYNTHETIC',
    partialWriteFaults: 'SYNTHETIC', actualFileIo: true, retainedDirectory: root.uri,
    interruptedWritePreservesLastComplete: true, silentPartialWriteRejected: true,
    completeRecordsAfterReopen: restored.length, originalFirstEqual: equal(restored[0], records[0]),
    generation: final.state().generation, ordinaryDatabaseTouched: false, filesDeleted: false };
  new File(root, 'result.json').write(JSON.stringify(result, null, 2)); return result;
}
