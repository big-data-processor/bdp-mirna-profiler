const fs = require('fs');
const readline = require('readline');
const args = process.argv;
const flags = args[2] === 'Yes' ? 'a' : 'w';
process.stdout.write('Setting the db_connections.cfg ...\n');

if (args[3] && args[4] && args[5] && args[6]) {
    const ws = fs.createWriteStream('/config/configs/db_connections.cfg', {flags: flags});
    ws.on('close', () => {
        const rl = readline.createInterface({
        input: fs.createReadStream('/config/configs/db_connections.cfg')
        });
        process.stdout.write("The db_connections.cfg is showing as follows.\n");
        process.stdout.write("=============================================\n");
        rl.on('line', (line) => {
            process.stdout.write(line + '\n');
        });
        rl.on('close', () => {
            process.stdout.write("===================================\n");
        });
    });
    ws.write(args[3] + ' ' + args[4] + ' ' + args[5] + ' ' + args[6] + '\n');
    ws.end();
}

if (args[7] && args[8] && args[9] && args[10]) {
    const ws = fs.createWriteStream('/config/configs/db_connections.cfg', {flags: flags});
    ws.on('close', () => {
        const rl = readline.createInterface({
        input: fs.createReadStream('/config/configs/db_connections.cfg')
        });
        process.stdout.write("The db_connections.cfg is showing as follows.\n");
        process.stdout.write("=============================================\n");
        rl.on('line', (line) => {
            process.stdout.write(line + '\n');
        });
        rl.on('close', () => {
            process.stdout.write("===================================\n");
        });
    });
    ws.write(args[7] + ' ' + args[8] + ' ' + args[9] + ' ' + args[10] + '\n');
    ws.end();
}




