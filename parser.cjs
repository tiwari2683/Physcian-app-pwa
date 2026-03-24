const fs = require('fs');

const files = [
  'e:/InternShip/lasttry/physcian-app/lambdaForCreateAsWellAsUpdate.js',
  'e:/InternShip/lasttry/physcian-app/lambda/appointmentsFunction.js'
];
const readCmds = ['GetItemCommand', 'QueryCommand', 'ScanCommand', 'GetCommand'];
const writeCmds = ['PutCommand', 'UpdateCommand', 'DeleteCommand', 'TransactWriteCommand', 'TransactWriteItems'];

let results = {};

files.forEach(file => {
  if (!fs.existsSync(file)) {
      console.log('Missing file:', file);
      return;
  }
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let currentFunc = 'Global';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Function tracking
    const funcMatch = line.match(/function\s+([a-zA-Z0-9_]+)/) || line.match(/const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async)?/);
    if(funcMatch) currentFunc = funcMatch[1];
    
    // Find TableName definitions
    const allCmds = [...readCmds, ...writeCmds];
    for (const cmd of allCmds) {
      if(line.includes(cmd)) {
        let isRead = readCmds.includes(cmd);
        // Look ahead for TableName
        for(let j=i; j<i+15; j++) {
           if(lines[j] && lines[j].includes('TableName:')) {
              let tblMatch = lines[j].match(/TableName:\s*([^,}\s]+)/);
              if(tblMatch) {
                 let tbl = tblMatch[1].replace(/['"]/g, '').trim();
                 if(!results[tbl]) results[tbl] = { Reads: [], Writes: [] };
                 
                 let type = isRead ? 'Reads' : 'Writes';
                 let entry = file.split('/').pop() + ' -> ' + currentFunc + ' (' + cmd + ')';
                 if(!results[tbl][type].includes(entry)) results[tbl][type].push(entry);
              }
              break;
           }
        }
      }
    }

    // Special case for TransactWriteItems because TableName can be nested multiple times
    if (line.includes('TransactWriteItems')) {
      for(let j=i; j<i+60; j++) {
        if(lines[j] && lines[j].includes('TableName:')) {
          let tblMatch = lines[j].match(/TableName:\s*([^,}\s]+)/);
          if(tblMatch) {
             let tbl = tblMatch[1].replace(/['"]/g, '').trim();
             if(!results[tbl]) results[tbl] = { Reads: [], Writes: [] };
             let entry = file.split('/').pop() + ' -> ' + currentFunc + ' (TransactWriteItems)';
             if(!results[tbl].Writes.includes(entry)) results[tbl].Writes.push(entry);
          }
        }
        if(lines[j] && lines[j].includes('} catch')) break; 
      }
    }
  }
});

fs.writeFileSync('audit.json', JSON.stringify(results, null, 2));
console.log('Saved to audit.json');
