import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
export async function sqliteD1(){
  const db=new DatabaseSync(':memory:');
  db.exec(await readFile('migrations/0001_auth.sql','utf8'));
  const binding={
    async batch(statements:{run:()=>Promise<unknown>}[]){return Promise.all(statements.map(s=>s.run()));},
    prepare(query:string){
      const statement=db.prepare(query);
      return {
        bind(...values:(string|number|null)[]){
          return {
            async first(){return statement.get(...values)??null;},
            async all(){return {results:statement.all(...values)};},
            async run(){const result=statement.run(...values);return {meta:{changes:Number(result.changes)}};}
          };
        }
      };
    }
  };
  return {db,binding:binding as unknown as D1Database};
}
