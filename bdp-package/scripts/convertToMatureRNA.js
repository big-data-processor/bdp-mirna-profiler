const fs = require('fs');
const path = require('path');
const readline = require('readline');
const fse = require('fs-extra');
const mysql = require('mysql');

const args = process.argv;
const theTCGAoutFolder = args[2];
const mirna_dbname = args[3];
// const tcgaOutput = 'E:\\bioinfo_services\\20170710_DrLin\\20170816_tcga_results\\expn_matrix_mimat.txt';
// const tcgaOutput2 = 'E:\\bioinfo_services\\20170710_DrLin\\20170816_tcga_results\\expn_matrix_mimat_idTransformed.txt';
const tcgaOutput = path.resolve(theTCGAoutFolder, 'expn_matrix_mimat.txt');
const tcgaOutput2 = path.resolve(theTCGAoutFolder, 'expn_matrix_mimat_idTransformed.txt');
const theDBconnFile = '/package/scripts/bcgsc-mirna-v0.2.7/config/db_connections.cfg';

let mysqlConnect;
const readConfigFile = function() {
    console.log('Read config file...');
    return new Promise((resolve, reject) => {
        let connectInfo = [];
        const rl = readline.createInterface({
            input: fse.createReadStream(theDBconnFile)
        });
        
        rl.on('line', (line) => {
            const data = line.toString();
            if (data.indexOf(mirna_dbname + ' ') == 0 ) {
                connectInfo = data.split(/\s+/);
                rl.close();
            }
        });
        rl.on('error', (e) => {
            reject(e);
        });
        rl.on('close', () => {
            resolve(connectInfo);
        });
    }); 
}
const connectMysql = function (connectInfo) {
    console.log('Connect to mysql ...');
    mysqlConnect  = mysql.createConnection({
        host            : connectInfo[1],
        port            : connectInfo[2],
        user            : connectInfo[3],
        password        : connectInfo[4],
        database        : connectInfo[0],
        multipleStatements: true
    });
    return new Promise((resolve, reject) => {
        mysqlConnect.connect((err) => {
            if (err) {
                reject(err);
            }else {
                resolve();
            }
        });
    });
}

const makeQuery = function (sqlText) {
    return new Promise((resolve, reject) => {
        mysqlConnect.query(sqlText, (err, results) => {
            if (err) {
                reject(err);
            }else {
                resolve(results);
            }
        });
    });
}

const getRNAfromAcc = async function (acc) {
    let result;
    try {
        result = await makeQuery("SELECT `mature_name` FROM `" + mirna_dbname + "`.`mirna_mature` WHERE `mature_acc`='" + acc + "'");
    }catch(e) {
        throw e;
    }
    return result;
}


let affectedLines = 0;
const convertIDs = function() {
    return new Promise((resolve, reject) => {
        const rl = readline.createInterface({
            input: fs.createReadStream(tcgaOutput)
        });
        let lineCount = 0;
        const miRNAs = [];
        const miRBaseAcc = [];
        const lineData = [];
        let colNames;
        rl.on('line', (eachLine) => {
            if (lineCount === 0) {
                lineCount ++;
                colNames = eachLine;
                return;
            }
            lineCount ++;
            const strs = eachLine.split('\t');
            const geneKey = strs[0].match(/^(.*?)\.(.*)$/);
            miRNAs.push(geneKey[1]);
            miRBaseAcc.push(geneKey[2]);
            lineData.push(strs.slice(1).join('\t'));
        }); 
        rl.on('close', () => {
            const onCloseEvent = async function() {
                // const result = await getRNAfromAcc(miRBaseAcc[0]);
                const acc2miRNA = {};
                const queries = miRBaseAcc.map(async (acc) => {
                    return await getRNAfromAcc(acc);
                });
                for (let i = 0; i < queries.length; i ++) {
                    const result = await queries[i];
                    if (result) {
                        acc2miRNA[miRBaseAcc[i]] = result[0].mature_name;
                    }
                }
                console.log('Start to write output ...');
                const outputFS = fs.createWriteStream(tcgaOutput2);
                outputFS.write(colNames + '\n');
                for (let i = 0; i < lineData.length; i ++) {
                    const miRNA_name = acc2miRNA[miRBaseAcc[i]];
                    if (miRNA_name) {
                        // console.log(miRNA_name + '\t' + lineData[i]);
                        affectedLines ++;
                        outputFS.write(miRNA_name + '\t' + lineData[i] + '\n');
                    }else {
                        console.log(miRBaseAcc[i]);
                    }
                }
                outputFS.end();
                mysqlConnect.end();
            }
            onCloseEvent()
            .then(() => {
                resolve();
            })
            .catch((e) => {
                reject(e);
            });
        });
    });
}


const startProcess = async function() {
    const theConnectInfo = await readConfigFile();
    console.log(theConnectInfo);
    await connectMysql(theConnectInfo);
    await convertIDs();
    if (affectedLines === 0) {
        throw 'No mature ids were converted. Please check if you have correctly prepared mirbase.'
    }
    console.log('Finished');
}

startProcess().catch((e) => {
    console.log(e);
    process.exit(1);
});


/*
mysqlConnect.connect((err) => {
    if (err) { console.log(err); return;}
    const getConvertTable = mysqlConnect.query('SELECT * from `mirna_mature`');
    getConvertTable
    .on('error', (err) => {
        console.log(err);
    })
    .on('result', async (row) => {
        try{
            mysqlConnect.pause();
            if (count === 0) {
                const header = Object.keys(row).join(',') + '\n';
                await writeText(fsOut, header);
            }
            const values = Object.values(row);
            await writeText(fsOut, values.join(',') + '\n');
            mysqlConnect.resume();
            count ++;
        }catch(e){
            console.log(e);
        }
    })
    .on('end', () => {
        console.log('Finished');
        mysqlConnect.end((err) => {
            if (err) {
                console.log(err);
            }
            process.exit(0);
        });
    });
});
*/