import {randomBytes,createHash} from 'node:crypto';
import {writeFileSync,existsSync} from 'node:fs';
const output='local-credentials.json';
if(existsSync(output))throw Error('Credentials already exist. Reuse the saved file.');
const writeCode=randomBytes(32).toString('hex'),readCode=randomBytes(32).toString('hex');
const hash=s=>createHash('sha256').update(s).digest('hex');const id=randomBytes(16).toString('hex');
writeFileSync(output,JSON.stringify({id,writeCode,readCode},null,2));
writeFileSync('provision.sql',`INSERT INTO backups (id,writer_hash,reader_hash) VALUES ('${id}','${hash(writeCode)}','${hash(readCode)}');\n`);
console.log('Created private local credentials and hashed provisioning SQL. No codes printed.');
