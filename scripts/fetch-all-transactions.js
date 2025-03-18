import { exec } from 'child_process';

console.log('Starting transaction fetch script...');

exec('tsx scripts/fetch-transactions.ts', (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error}`);
    return;
  }
  if (stderr) {
    console.error(`Script errors: ${stderr}`);
    return;
  }
  console.log(stdout);
});
