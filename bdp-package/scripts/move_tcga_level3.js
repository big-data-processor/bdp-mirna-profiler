const path = require('path');
// const fs = require('fs');
const fse = require('fs-extra');
const child_process = require('child_process');
// const klaw = require('klaw');
// const through2 = require('through2')
// const tcga_expression_matrix_mimat = '/home/chiyang/miRNASorting/scripts/smallRNA_NGS_pipeline/mirna-master/v0.2.7/code/custom_output/tcga/expression_matrix_mimat.pl';
const args = process.argv;
const input_projectFolder = args[2];
const input_level3Folder = args[3];

// const adf = '/home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/trimmed2/project/mm10_mirna21a.adf';
// const input_projectFolder = '/home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/trimmed2/project';
// const input_level3Folder = '/home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/trimmed2/project/level3';
/*
				/usr/bin/perl  -m  -p /home/chiyang/miRNASorting/data/datasets/E-MTAB-4502/trimmed2/project/level3
*/

var isoformFiles = [] // files, directories, symlinks, etc
try{
    fse.ensureDirSync(input_level3Folder);
}catch(e) {
    console.log(e);
    process.exit(1);
}

let ensureSymlink = function(itemPath) {
    const relativePath = path.relative(input_projectFolder, itemPath);
    const folderLevels = relativePath.split('/');
    const newName = folderLevels[1].match(/(.*?)\_features/)[1] + '.isoform.quantification.txt';
    return new Promise((resolve, reject) => {
        // fse.ensureSymlink(item.path, path.resolve(input_level3Folder, newName), (err) => {
        fse.copy(itemPath, path.resolve(input_level3Folder, newName), (err) => {
            if (err) {
                console.log(err);
                reject(err);
            }else {
                resolve(itemPath);
            }
        });
    });
};

const findProcess = child_process.spawn('find', [input_projectFolder, '|', 'grep', 'tcga/isoforms.txt$'], {shell: true});
let stdout = '';
findProcess.stdout.on('readable', () => {
    const data = findProcess.stdout.read();
    if (data) {
        stdout += data;
    }
});


findProcess.on('exit', () => {
    isoformFiles = stdout.split('\n').filter((path) => {
        return path ? true : false;
    });
    console.log(isoformFiles);
    console.log('[' + new Date().toString() + '] Extract all *_features/tcga/isoforms.txt');
    console.log('Total ' + isoformFiles.length + ' isoform files were found.');
    isoformFiles.reduce((filePromise, currentItem) => {
        return ensureSymlink(currentItem);
    }, Promise.resolve()).then(() => {
        console.log('[' + new Date().toString() + '] Files were copied and extract the expression matrix.');
    }).catch((e) => {
        console.log(e);
        process.exit(1);
    });
});

/*
const walkEvent = walkdir(input_projectFolder, {follow_symlinks: true, track_inodes: true});
walkEvent.on('path', (itemPath) => {
    // if (stat.isFile()) {
        const relativePath = path.relative(input_projectFolder, itemPath);
        if (relativePath.split('/').length === 4) {
            if(relativePath.match(/isoforms\.txt$/)) {
                console.log(itemPath);
                isoformFiles.push(itemPath);
            }
        }else {
            // console.log('not level 4 folder: ' + relativePath);
        }
    // }
});

walkEvent.on('error', (itemPath, error) => {
    console.log(itemPath);
    console.log(error);
    process.exit(1);
});

walkEvent.on('end', () => {
    console.log('[' + new Date().toString() + '] Extract all *_features/tcga/isoforms.txt');
    console.log('Total ' + isoformFiles.length + ' isoform files were found.');
    isoformFiles.reduce((filePromise, currentItem) => {
        return ensureSymlink(currentItem);
    }, Promise.resolve()).then(() => {
        console.log('[' + new Date().toString() + '] Files were copied and extract the expression matrix.');
    }).catch((e) => {
        console.log(e);
        process.exit(1);
    });
});
*/
