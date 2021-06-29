/*
    Name: NGS pipeline for small RNA sequencing
    Author: Chi Yang
    Date: 2017/02/23
    Description: Plot histograms for 39 miRNAs (pair-wised) with ggplo2
    References: ggplot2; multiplot funciton
*/

/*
    Input file:
    #1. A table which contains an url in each row. e.g. '../../data/datasets/E-MTAB-4502/ERA568441.txt'
    0. The input seq file (xxx.fastq.gz)
    1. THe reference genome. e.g. '../../data/referenceGenome/mm10.fa'
*/
/* 
    Processes
    0. Run ../fileDownload/downloadFile_HTTP.js to parse data (a table which contains an url in each row.)
    0.5. if mm10.fa.* files do not exit, index the genome!
    1. Sequence trimming
    2. Alignment with bwa aln
    3. Get SAM file
    4. generate BAM file
*/
const path = require('path');
const fs = require('fs');
const fse = require('fs-extra');
const child_process = require('child_process');

/*
input_seqFile = '/home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/files/Cell_CTRL1_1.fastq.gz';
input_refGenome = '/home/chiyang/miRNASorting/data/referenceGenome/mm10.fa';
output_folder = '/home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/trimmed'
*/
const args = process.argv;
const input_seqFile = args[2];
const input_refGenomeFolder = args[3]; // the folder (the file will use the folder name!)
const output_folder = args[4];
const mirBase = args[5]; // mirna_21a
const ucsc_genome_ref = args[6]; // mm10
const species_shortname = args[7]; // mmu
const adapterSeq = args[8];
// Step 1. 


// const input_refGenome = path.resolve(input_refGenomeFolder, path.basename(input_refGenomeFolder) + '.fa');
// find *.fa

if (!input_seqFile || !input_seqFile.match(/^.*\.fastq\.gz$/g)) {
    console.log('arguments: [input_seqFile (*.fastq.gz)] [input_refGenome] [output_folder]');
    process.exit(1);
}

let input_refGenome;
try {
    let refGenome;
    const files = fs.readdirSync(fs.realpathSync(input_refGenomeFolder));
    for(let i = 0; i < files.length; i ++) {
        const match = files[i].match(/^(.*\.fa)/);
        if (match) {
            refGenome = match[0];
            break;
        }
    };
    input_refGenome = path.resolve(input_refGenomeFolder, refGenome);
}catch(e) {
    console.log(e);
    process.exit(1);
}


try {
    fs.statSync(args[2]);
}catch(e) {
    console.log(e);
    process.exit(1);
}

try{
    fse.ensureDirSync(args[4]);
    console.log(args[4]);
}catch(e) {
    console.log(e);
    process.exit(1);
}




const seqBaseName = path.basename(input_seqFile, '.fastq.gz');
const trimmedFQ = path.resolve(output_folder, seqBaseName + '_trimmed.fq');
const trimmedSai = path.resolve(output_folder, seqBaseName + '_trimmed.sai');
const mappedSAM =  path.resolve(output_folder, seqBaseName + '.sam');
const mappedBAM =  path.resolve(output_folder, seqBaseName + '.bam');
const adapterReport = path.resolve(output_folder, seqBaseName + '_adapter.report');



const pipeline = [
    [
        {name: 'Trim Galore', exec: 'trim_galore', args: ['--dont_gzip', '--fastqc', '-o', output_folder, input_seqFile]}
    ],
    [
        {name: 'bwa', exec: 'bwa', args: ['aln',  '-f' , trimmedSai, input_refGenome, trimmedFQ ]}
    ],
    [
        {name: 'bwa_samse', exec: 'bwa', args: ['samse', '-f', mappedSAM, input_refGenome, trimmedSai, trimmedFQ]}
    ],
    [
        // {name: 'getBam', exec: samtools, args: ['view', '-b', mappedSAM, '-o', mappedBAM]}
        {name: 'getBam', exec: 'samtools', args: ['view', '-b', mappedSAM, '-o', mappedBAM]}
    ],
    [
        // samtools view <abc.bam> | awk '{arr[length($10)]+=1} END {for (i in arr) {print i" "arr[i]}}' | sort -t " " -k1n
        {name: 'adapterReport', exec: 'samtools', args: ['view', mappedBAM, '|', 'awk', 
            '\'{arr[length($10)]+=1} END {for (i in arr) {print i" "arr[i]}}\'', '|', 'sort', '-t', '" "', '-k1n', '>', adapterReport]}
    ],
    [
        {name: 'annotation', exec: 'perl', args: [
            '/home/biodocker/lib/bcgsc-mirna-v0.2.7/code/annotation/chi_annotate.pl',
            '-m', mirBase, '-u', ucsc_genome_ref, '-o', species_shortname, '-s', mappedSAM]}
    ]
];

if (adapterSeq) {
    pipeline[0][0].args.splice(2, 0, '--adapter', adapterSeq);
}

let canRun = true;

pipeline.reduce((pipePromise, currentStep) => {
    return pipePromise.then(() => {
        if (canRun) {
            return Promise.all(
                currentStep.map((process) => {
                    return runProcess(process.exec, process.args, process.name);
                })
            );
        }else {
            process.stderr.write('[' + new Date().toString() + '] Aborted.\n');
            return Promise.reject();
        }
    }).catch((e) => {
        console.log(e);
        process.exit(1);
    });
}, Promise.resolve());







function runProcess(exec, args, processName){
    return new Promise((resolve, reject) => {
        process.stderr.write('[' + new Date().toString() + '] ' + processName + ' Starting.\n');
        process.stderr.write('[command] ' + exec + ' ' + args.join(' ') + '\n');
        const RunningProcess = child_process.spawn(exec, args, {cwd: process.cwd(), shell: true});
        RunningProcess.stderr.on('data', (data) => {
            process.stderr.write(data);
        });
        RunningProcess.stdout.on('data', (data) => {
            process.stdout.write(data);
        });
        RunningProcess.on('error', (err) => {
            process.stderr.write('[' + new Date().toString() + '] ' + processName + ' has errors.\n');
            process.stderr.write(JSON.stringify(err));
            reject(processName + ' failed.');
        });
        RunningProcess.on('exit', () => {
            process.stderr.write('[' + new Date().toString() + '] ' + processName + ' Finished.\n');
            resolve(processName + ' Finished.');
        });
        RunningProcess.on('SIGTERM', () => {
            canRun = false;
            RunningProcess.kill();
        });
        RunningProcess.on('SIGINT', () => {
            canRun = false;
            RunningProcess.kill();
        });
    });
}

