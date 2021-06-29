const Excel = require('exceljs');
const readline = require('readline');
const fs = require('fs');
const fse = require('fs-extra');
const path = require('path');
const cellref = require('cellref');
// const hummus = require('hummus');
const moment = require('moment');
moment.locale('en');
// const stream = require('stream');
const puppeteer = require('puppeteer');
// const PDFDocument = require('pdfkit');
// const SVGtoPDF = require('svg-to-pdfkit');
//const svgkit = require('svgkit');
// const markdownpdf = require("markdown-pdf")

/*
const conversion = require("phantom-html-to-pdf")({
    strategy: "dedicated-process",
	phantomPath: require("phantomjs-prebuilt").path
});
*/
const args = process.argv;
const projectInfoPath = args[2];
const projectFolderPath = args[3];
// const tcgaFolderPath = args[4];
const miRNAtargetPath = args[4];
const multiQCpath = args[5];
const outputFolder = args[6];
// Input folders
// const projectFolderPath = 'E:\\bioinfo_services\\20170710_DrLin\\20170816_results';
// const tcgaFolderPath = 'E:\\bioinfo_services\\20170710_DrLin\\20170816_tcga_results';
// const miRNAtargetPath = 'E:\\bioinfo_services\\20170710_DrLin\\20170825_post_analysis';
// const multiQCpath = 'E:\\bioinfo_services\\20170710_DrLin\\20170816_multiQC';
// const projectInfoPath = 'E:\\bioinfo_services\\20170710_DrLin\\project_info.xlsx';


// Ouptut files
// const outputXlsxFile = 'E:\\bioinfo_services\\20170710_DrLin\\final_report.xlsx';
// const outputPDFfile = 'E:\\bioinfo_services\\20170710_DrLin\\final_report.pdf';
// const outputHTMLFile = 'E:\\bioinfo_services\\20170710_DrLin\\final_report.html';

fse.ensureDirSync(outputFolder);

const outputXlsxFile = path.resolve(outputFolder, 'final_report.xlsx');
const outputPDFfile = path.resolve(outputFolder, 'final_report.pdf');
const outputHTMLFile = path.resolve(outputFolder, 'final_report.html');

const invert = a => a[0].map((col, c) => a.map((row, r) => a[r][c]));
// let rotate = a => a[0].map((col, c) => a.map((row, r) => a[r][c]).reverse())
// Report from
let Title = 'miRNA-seq Analysis Report';
let Institute = 'MMRC, Chang-Gung University';
let Customer = '';
let Bioinformatician = '';
let phoneExt = '';
let reportDate = new Date();
let contrasts = [];
let posFoldCut = 0.58;
let negFoldCut = -0.58;
let pvalueCut = 1;
let ReferenceGenome = `<a href='https://genome-asia.ucsc.edu/cgi-bin/hgGateway?db=hg38'>Genome Reference Consortium Human GRCh38 (GCA_000001405.15)]</a>`;
let Annotations = `<a href='ftp://hgdownload.cse.ucsc.edu/goldenPath/hg38/database/'>GRCh38 from UCSC</a>`;
let writeReportHTML;


const alignmentStats = path.resolve(projectFolderPath, 'alignment_stats.csv');
const normalizedReadCountCSV = path.resolve(miRNAtargetPath, 'normalized_readcounts.csv');
const rlogNormalizedReadCountCSV = path.resolve(miRNAtargetPath, 'rlog_normalized_readcounts.csv');
const miRNAdistGraphFolder = path.resolve(projectFolderPath, './graphs/tags');
const multiQCBaseQuality = path.resolve(multiQCpath, './multiqc_plots/png/mqc_fastqc_per_base_sequence_quality_plot_1.png');
const multiQCBaseQualitySVG = path.resolve(multiQCpath, './multiqc_plots/svg/mqc_fastqc_per_base_sequence_quality_plot_1.svg');

const multiQC_seqLengthDistribution = path.resolve(multiQCpath, './multiqc_plots/png/mqc_fastqc_sequence_length_distribution_plot_1.png');
const multiQC_seqLengthDistributionSVG = path.resolve(multiQCpath, './multiqc_plots/svg/mqc_fastqc_sequence_length_distribution_plot_1.svg');
const multiQCGCcontent = path.resolve(multiQCpath, './multiqc_plots/png/mqc_fastqc_per_sequence_gc_content_plot_Counts.png');
const multiQCGCcontentSVG = path.resolve(multiQCpath, './multiqc_plots/svg/mqc_fastqc_per_sequence_gc_content_plot_Counts.svg');

const sampleClusterFile = path.resolve(miRNAtargetPath, './hierarchical_clustering.png');
const sampleClusterSVG = path.resolve(miRNAtargetPath, './hierarchical_clustering.svg');
const samplePCAFile = path.resolve(miRNAtargetPath, './pca_plot.png');
const samplePCASVG = path.resolve(miRNAtargetPath, './pca_plot.svg');
const topDiffFile = path.resolve(miRNAtargetPath, './top_diff_2d_cluster.png');
const topDiffSVG = path.resolve(miRNAtargetPath, './top_diff_2d_cluster.svg');


const workbook = new Excel.Workbook();
const getFilesFromFolder = function(folderPath) {
    return new Promise((resolve, reject) => {
        fs.readdir(folderPath, (err, files) => {
            if (err) {
                reject(err);
            }else {
                resolve(files);
            }
        });
    });
}

/*
const fromCSV = async function (workbook, csvPath, sheetName) {
    const csvStream = fs.createReadStream(csvPath);
    // const worksheet = workbook.addWorksheet(sheetName);
    const theSheet = await workbook.csv.read(csvStream);
    workbook.addWorksheet(theSheet);
    return theSheet;
}
*/

const fromTextFile = function (workbook, csvPath, delimiter, worksheet, isTransposed, formats) {
    return new Promise((resolve, reject) => {
        let theData = [];
        const rl = readline.createInterface({input: fs.createReadStream(csvPath)});
        rl.on('line', (line) => {
            const data = line.split(delimiter).map((d, index) => {
                if (formats === undefined || (Array.isArray(formats) && formats[index] === 'number')) {
                    return isNaN(parseFloat(d)) ? d : parseFloat(d);
                }else {
                    return d;
                }
            });
            theData.push(data);
        });
        rl.on('close', () => {
            if (isTransposed) {
                theData = invert(theData);
            }
            /*
            if (Array.isArray(theData[0]) && Array.isArray(theData[1])) {
              if (theData[0].length = theData[1].length - 1) {
                theData[0].unshift('');
              }
            }
            */
            theData.forEach((data) => worksheet.addRow(data));
            resolve(theData);
        });
        rl.on('error', (err) => {
            reject(err);
        });
    });
}

const addImage = function(workbook, worksheet, imgPath, position) {
    const ext = path.extname(imgPath).replace(/^\./g, '');
    const imageId = workbook.addImage({
      filename: imgPath,
      extension: ext,
    });
    worksheet.addImage(imageId, position);
}

const addText = function(worksheet, colIndex, rowIndex, text, style) {
    const theCell = worksheet.getCell(cellref('R' + (1*rowIndex+1) + 'C' + (1*colIndex+1)));
    theCell.value = text;
    if (style) {
        if (style.font) {
            theCell.font = style.font;
        }
        if (style.alignment) {
            theCell.alignment = style.alignment;
        }
        if (style.border) {
            theCell.border = style.border;
        }
    }
}

const makeBasicTableStyle = function(worksheet, theData, titleAbove) {
    let tableStartRow = 1;
    if (titleAbove) {
        worksheet.spliceRows(1, 0, [titleAbove]);
        tableStartRow = 2;
    }
    worksheet.getRow(tableStartRow).eachCell((cell) => {
        cell.border = {
            top: {style: 'thick'},
            bottom: {style: 'thin'}
        };
    });
    worksheet.getRow(theData.length + 1 + tableStartRow).eachCell((cell) => {
        cell.border = {
            bottom: {style: 'thick'}
        };
    });
    worksheet.getRow(tableStartRow).width = 40;
    worksheet.getRow(tableStartRow).alignment = { vertical: 'center', horizontal: 'center' };
    worksheet.getColumn(1).font = { name: 'Arial', size: 10, bold: true};
    worksheet.getColumn(1).alignment = { vertical: 'center', horizontal: 'right' };
    worksheet.getColumn(1).width = 40;
    for (let i = 2; i < theData[0].length + 2; i ++) {
        worksheet.getColumn(i).font = { name: 'Arial', size: 8, bold: false};
        worksheet.getColumn(i).alignment = { vertical: 'center', horizontal: 'center' };
        worksheet.getColumn(i).width = 25;
    }
    worksheet.getRow(tableStartRow).font = { name: 'Arial', size: 10, bold: true};
    if (titleAbove) {
        worksheet.getCell('A1').alignment = { vertical: 'center', horizontal: 'left' };
        worksheet.getCell('A1').value = {text: titleAbove, hyperlink: '#\'Index\'!A1'}
        worksheet.views = [
            {state: 'frozen', xSplit: 1, ySplit: 2}
        ];
    }else {
        worksheet.views = [
            {state: 'frozen', xSplit: 1, ySplit: 1}
        ];
    }
}
const mergeCellByIndices = function(worksheet, fromRowIndex, fromColIndex, toRowIndex, toColIndex) {
    const fromA1 = cellref('R' + (1*fromRowIndex + 1) + 'C' + (1*fromColIndex + 1));
    const toA1 = cellref('R' + (1*toRowIndex + 1) + 'C' + (1*toColIndex + 1));
    worksheet.mergeCells(fromA1 + ':' + toA1);
}


const startWriteReportStream = function() {
    writeReportHTML = fs.createWriteStream(outputHTMLFile);
    writeReportHTML.write(`
    <html>
    <head>
        <meta charset="UTF-8">
        <link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/css/bootstrap.min.css" integrity="sha384-/Y6pD6FV/Vv2HJnA6t+vslU6fwYXjCFtcEpHbNJ0lyAFsXTsjBbfaDjzALeQsN6M" crossorigin="anonymous">
        <script src="https://code.jquery.com/jquery-3.2.1.slim.min.js" integrity="sha384-KJ3o2DKtIkvYIK3UENzmM7KCkRr/rE9/Qpg6aAZGJwFDMVNA/GpGFF93hXpG5KkN" crossorigin="anonymous"></script>
        <script src="https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.11.0/umd/popper.min.js" integrity="sha384-b/U6ypiBEHpOf/4+1nzFpr53nxSS+GLCkfwBdFNTxtclqqenISfwAzpKaMNFNmj4" crossorigin="anonymous"></script>
        <script src="https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta/js/bootstrap.min.js" integrity="sha384-h0AbiXch4ZDo7tp9hKZ4TsHbi047NrKGLO3SEJAg45jXxnGIfYzk4Si90RDIqNm1" crossorigin="anonymous"></script>
        <style>
            table {
                border-top: 2px solid black;
                border-bottom: 2px solid black;
            }
            .table thead th {
                border-bottom: 1px solid black !important;
            }
        </style>
    </head>
    <body>
    <div class='text-center'>
        <br><br><br><br>
        <h2 style='margin-top: 100px; width: 100%;'>` + Institute + `</h2><br>
        <h1 class="display-5">` + Title + `</h1>
        <h3 style='margin-top: 250px;'>` + Customer + `</h3><br>
        <h3>Bioinformatician: ` + Bioinformatician + `</h3><br>
        <h3>Tel: ` + phoneExt + `</h3><br><br>
        <h4>Date: ` + moment(new Date(reportDate)).format('L') + `</h4>
    </div>
    <div style="page-break-after: always;"></div>
    
    <h1 id='MaterialAndMethods'>Materials & Methods</h1>
    <h2>Reference genome</h2>
    <ol>
        <li>Sequences: ` + ReferenceGenome + `</li>
        <li>Annotations:
            ` + Annotations + `
        </li>
    </ol>
    <hr>
    <h2>Tools used in this report</h2>
    <ol>
        <li>Adapter trimming and quality control: <a href='https://www.bioinformatics.babraham.ac.uk/projects/trim_galore/'>Trim_Galore v. 0.4.4</a></li>
        <li>Read alignment tool: <a href='http://bio-bwa.sourceforge.net/'>bwa v. 0.7.15</a></li>
        <li>Post-data processing pipeline: <a href='https://github.com/bcgsc/mirna'>bcgsc-miRNA</a></li>
        <li>Differential expression analysis: <a href='https://bioconductor.org/packages/release/bioc/html/DESeq2.html'>DEseq2 v. 1.16.1</a></li>
        <li>GO/Pathway enrichment analysis: <a href='https://bioconductor.org/packages/release/bioc/html/goseq.html'>goseq v. 1.28.0</a></li>
    </ol>
    <div style="page-break-after: always;"></div>
    `);
}


const addHTMLTable = function(outStream, data, colnames) {
    let returnHTML = '<table class="table table-sm table-striped" style="font-size: 0.6rem">';
    if (colnames) {
        returnHTML += '<thead><tr>' + colnames.map((head) => {
            return "<th class='text-center'><b>" + head + "</b></th>"
        }).join('') + '</tr></thead>';
    }
    returnHTML += "<tbody>" + data.map((value) => {
        return "<tr>" + value.map((v, i) => {
            if (i === 0) {
                return '<td class="text-right"><b>' + v + '</b></td>';
            }else {
                return '<td class="text-center">' + v + '</td>';
            }
        }).join('') + "</tr>";
    }).join('') + "</tbody>";
    returnHTML += '</table>';
    outStream.write(returnHTML);
}

const addImgHTML = function(outStream, src, caption, figNumber, width) {
    if (!width) {
        width = '100%';
    }
    let hasImg = false;
    try {
        fs.statSync(src);
        hasImg = true;
    }catch(e) {
        console.log(e);
    }
    if (hasImg) {
        outStream.write('<div style="width: 100%; text-align: center">'
            + '<img src="file:///' + src + '" width="' + width + '" /><br>'
            + '<div style="text-align: justify;">'
            + '<b>Figure '
            + (figNumber !== undefined ? figNumber : '')
            + '.  </b>' + caption + '</div></div>\n');
    }else {
        outStream.write('<div style="width: 100%; text-align: center">'
            + '<div style="width:' + width + '; height: 250px;text-align: center; border: thin solid black"><h4>Image not available.</h4></div>'
            + '<div style="text-align: justify;">'
            + '<b>Figure '
            + (figNumber !== undefined ? figNumber : '')
            + '.  </b>' + caption + '</div></div>\n');
    }
}
const endPage = function(outStream) {
    outStream.write('<div style="page-break-after: always;"></div>');
}
/*
const getHTML = function(path) {
    return new Promise((resolve, reject) => {
        const readLine = readline.createInterface({
            input: fs.createReadStream(path)
        });
        let data = '';
        readLine.on('line', (line) => {
            data += line;
        });
        readLine.on('close', () => {
            resolve(data);
        });
        readLine.on('error', (e) => {
            reject(e);
        })
    });
}
*/
const start = async function() {
    try {
        // Index page
        const indexSheet = workbook.addWorksheet('Index');
        indexSheet.getColumn(1).width = 200;
        indexSheet.getColumn(1).font =  { name: 'Arial', family: 4, size: 14};
        indexSheet.getCell('A1').value = 'This Excel report contains the following data. (click the followings to view results)';
        indexSheet.getCell('A1').font = { name: 'Arial', family: 4, size: 18};
        indexSheet.getCell('A2').value = { text: '1. Alignment stats', hyperlink: '#\'Alignment stats\'!A1' };
        indexSheet.getCell('A2').font = { name: 'Arial', family: 4, size: 14};
        indexSheet.getCell('A3').value = { text: '2. Percentage of aligned tags at each tag length with annotation', hyperlink: '#\'Distributions of aligned tags\'!A1' };
        indexSheet.getCell('A4').value = { text: '3. MultiQC results', hyperlink: '#\'MultiQC results\'!A1' };
        indexSheet.getCell('A5').value = { text: '    3.1. [Figure] The mean quality value across each base position in the read.', hyperlink: '#\'MultiQC results\'!A1' };
        indexSheet.getCell('A6').value = { text: '    3.2. [Figure] The distribution of fragment sizes (read lengths) found.', hyperlink: '#\'MultiQC results\'!A32' };
        indexSheet.getCell('A7').value = { text: '    3.3. [Figure] The average GC content of reads. Normal random library typically have a roughly normal distribution of GC content.', hyperlink: '#\'MultiQC results\'!A63' };
        indexSheet.getCell('A8').value = { text: '4. Graphs showing sample distance', hyperlink: '#\'Graphs showing sample distance\'!A1' };
        indexSheet.getCell('A9').value = { text: '    4.1. [Figure] Hierarchical clustering results among samples', hyperlink: '#\'Graphs showing sample distance\'!A1' };
        indexSheet.getCell('A10').value ={ text: '    4.2. [Figure] The PCA plot for the samples', hyperlink: '#\'Graphs showing sample distance\'!A44' };
        indexSheet.getCell('A11').value ={ text: '5. Top differential expressions', hyperlink: '#\'Top differential expressions\'!A1' };
        indexSheet.getCell('A12').value ={ text: '6. Normalized read counts', hyperlink: '#\'Normalized read counts\'!A1' };
        indexSheet.getCell('A13').value ={ text: '7. rlog normalized read counts', hyperlink: '#\'rlog normalized read counts\'!A1' };
        // 1. the alignment summary
        const alignedSummarySheet = workbook.addWorksheet('Alignment stats');
        let theData = await fromTextFile(workbook, alignmentStats, ',', alignedSummarySheet, true);
        makeBasicTableStyle(alignedSummarySheet, theData, 'Table 1. The alignment stats.');
        writeReportHTML.write('<h2>Mapping results</h2>');
        writeReportHTML.write('<b>Table 1. </b> The alignment stats.');
        addHTMLTable(writeReportHTML, theData.slice(1), theData[0]);
        endPage(writeReportHTML);
        // 2. the percentage of aligned tags at each tag length with annotations
        const miRNAdistGraphSheet = workbook.addWorksheet('Distributions of aligned tags');
        const miRNAdistGraphFiles = await getFilesFromFolder(miRNAdistGraphFolder);
        for (let i = 0; i < miRNAdistGraphFiles.length; i ++) {
            await addImage(workbook, miRNAdistGraphSheet, path.resolve(miRNAdistGraphFolder, miRNAdistGraphFiles[0]), {
                tl: { col: 0, row: 31*i },
                br: { col: 10, row: 31*(i+1) }
            });
        }
        //3. multiQC
        const multiQC_sheet = workbook.addWorksheet('MultiQC results');
        await addImage(workbook, multiQC_sheet, multiQCBaseQuality, {tl: {col: 0, row: 0}, br: {col: 20, row: 28}});
        mergeCellByIndices(multiQC_sheet, 28, 0, 28, 19);
        addText(multiQC_sheet, 0, 28, 'Figure 1. The mean quality value across each base position in the read.', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });
        await addImage(workbook, multiQC_sheet, multiQC_seqLengthDistribution, {tl: {col: 0, row: 31}, br: {col: 20, row: 59}})
        mergeCellByIndices(multiQC_sheet, 59, 0, 59, 19);
        addText(multiQC_sheet, 0, 59, 'Figure 2. The distribution of fragment sizes (read lengths) found.', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });

        await addImage(workbook, multiQC_sheet, multiQCGCcontent, {tl: {col: 0, row: 62}, br: {col: 20, row: 91}});
        mergeCellByIndices(multiQC_sheet, 91, 0, 91, 19);
        addText(multiQC_sheet, 0, 91, 'Figure 3. The average GC content of reads. Normal random library typically have a roughly normal distribution of GC content.', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });
        writeReportHTML.write('<h2>Fastq Quality check</h2>');
        addImgHTML(writeReportHTML, multiQCBaseQualitySVG, 'The mean quality value across each base position in the read.', 1);
        addImgHTML(writeReportHTML, multiQC_seqLengthDistributionSVG, 'The distribution of fragment sizes (read lengths) found.', 2);
        addImgHTML(writeReportHTML, multiQCGCcontentSVG, 'The average GC content of reads. Normal random library typically have a roughly normal distribution of GC content.', 3);
        endPage(writeReportHTML);
        // 4. sample clustering
        const sampleClusterSheet = workbook.addWorksheet('Graphs showing sample distance');
        await addImage(workbook, sampleClusterSheet, sampleClusterFile, {tl: {col: 0, row: 0}, br: {col: 20, row: 41}});
        mergeCellByIndices(sampleClusterSheet, 41, 0, 41, 19);
        addText(sampleClusterSheet, 0, 41, 'Figure 4. Hierarchical clustering results of the ' + (theData[0].length - 1) + ' samples', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });
        
        await addImage(workbook, sampleClusterSheet, samplePCAFile, {tl: {col: 0, row: 44}, br: {col: 20, row: 87}});
        mergeCellByIndices(sampleClusterSheet, 87, 0, 87, 19);
        addText(sampleClusterSheet, 0, 87, 'Figure 5. PCA results for the ' + (theData[0].length - 1) + ' samples', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });

        writeReportHTML.write('<h2>Sample distances</h2>');
        addImgHTML(writeReportHTML, sampleClusterSVG, 'Hierarchical clustering results of the ' + (theData[0].length - 1) + ' samples', 4, '90%');
        addImgHTML(writeReportHTML, samplePCASVG, 'PCA results for the ' + (theData[0].length - 1) + ' samples', 5, '90%');
        endPage(writeReportHTML);

        //5. Top differential expressions
        const topDiffExprSheet = workbook.addWorksheet('Top differential expressions');
        await addImage(workbook, topDiffExprSheet, topDiffFile, {tl: {col: 0, row: 0}, br: {col: 20, row: 48}});
        mergeCellByIndices(topDiffExprSheet, 48, 0, 48, 19);
        addText(topDiffExprSheet, 0, 48, 'Figure 6. Hierarchical clustering results of the top 80 differentially expressed miRNAs across the ' + (theData[0].length - 1) + ' samples', {
            font: { name: 'Arial', family: 3, size: 14},
            alignment: {vertical: 'top', horizontal: 'center'}
        });
        writeReportHTML.write('<h2>Top differential expressions</h2>');
        addImgHTML(writeReportHTML, topDiffSVG, 'Hierarchical clustering results of the top 80 differentially expressed miRNAs across the ' + (theData[0].length - 1) + ' samples', 6);
        endPage(writeReportHTML);

        //6. Normalized readcounts
        const normalizedReadCountSheet = workbook.addWorksheet('Normalized read counts');
        let normalizedReadCountData = await fromTextFile(workbook, normalizedReadCountCSV, ',', normalizedReadCountSheet, false, 'text');
        normalizedReadCountSheet.getRow(1).splice(1, 0, 'miRNA');
        makeBasicTableStyle(normalizedReadCountSheet, normalizedReadCountData, 'Table 2. The normalized readcounts.');

        // 7. rlog normalized readcounts
        const rlogNormalizedReadCountSheet = workbook.addWorksheet('rlog normalized read counts');
        let rlogNormalizedReadCountData = await fromTextFile(workbook, rlogNormalizedReadCountCSV, ',', rlogNormalizedReadCountSheet, false, 'text');
        rlogNormalizedReadCountSheet.getRow(1).splice(1, 0, 'miRNA');
        makeBasicTableStyle(rlogNormalizedReadCountSheet, rlogNormalizedReadCountData, 'Table 3. The rlog normalized readcounts.');

        // Contrasts reports
        let indexCell = 14;
        let pdfTableIndex = 2;
        let pdfFigIndex = 6;
        let xlsxTableIndex = 8;
        let xlsxFigIndex = 6;
        for (const eachContrast of contrasts) {
            const contrastDisplay = eachContrast[0] + ' vs ' + eachContrast[1];
            const contrastName = eachContrast[0] + '_vs_' + eachContrast[1];
            const contrastSheetName = contrastName.slice(0, 27);
            indexSheet.getCell('A' + indexCell).value = 'Contrast: ' + contrastDisplay;
            indexSheet.getCell('A' + indexCell).font ={ name: 'Arial', bold: true};
            indexSheet.getCell('A' + indexCell).border = {
                top: {style: 'thin'},
                bottom: {style: 'thin'}
            };
            indexCell++;
            xlsxFigIndex ++;
            pdfFigIndex ++;
            indexSheet.getCell('A' + indexCell).value = { text: (xlsxTableIndex) + '. Volcano Plot', hyperlink: '#\'(1) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+1)).value = { text:  (xlsxTableIndex + 1) + '. Positively expressed miRNAs', hyperlink: '#\'(2) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+2)).value = { text:   (xlsxTableIndex + 2) + '. Negatively expressed miRNAs', hyperlink: '#\'(3) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+3)).value = { text:   (xlsxTableIndex + 3) + '. Predicted targets of significantly positive miRNA expressions', hyperlink: '#\'(4) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+4)).value = { text:   (xlsxTableIndex + 4) + '. Predicted targets of significantly negative miRNA expressions', hyperlink: '#\'(5) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+5)).value = { text:   (xlsxTableIndex + 5) + '. GO enrichment of predicted targets of the positively expressed miRNAs', hyperlink: '#\'(6) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+6)).value = { text:   (xlsxTableIndex + 6) + '. KEGG pathway enrichment of predicted targets of the positively expressed miRNAs', hyperlink: '#\'(7) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+7)).value = { text:   (xlsxTableIndex + 7) + '. GO enrichment of predicted targets of the negatively expressed miRNAs', hyperlink: '#\'(8) ' + contrastSheetName + '\'!A1' };
            indexSheet.getCell('A' + (1*indexCell+8)).value = { text:   (xlsxTableIndex + 8) + '. KEGG pathway enrichment of predicted targets of the negatively expressed miRNAs', hyperlink: '#\'(9) ' + contrastSheetName + '\'!A1' };
            indexCell = indexCell + 9;
            xlsxTableIndex = xlsxTableIndex + 9;
            const volcanoPlotPNG = path.resolve(miRNAtargetPath, contrastName + '_volcano_plot.png');
            const DE_miRNA_posFile = path.resolve(miRNAtargetPath, contrastName + '_deList_positive.csv');
            const DE_miRNA_negFile = path.resolve(miRNAtargetPath, contrastName + '_deList_negative.csv');
            const predTarget_posFile = path.resolve(miRNAtargetPath, contrastName + '_predictedTargets_pos.csv');
            const predTarget_negFile = path.resolve(miRNAtargetPath, contrastName + '_predictedTargets_neg.csv');
            const GO_enrich_predTarget_posFile = path.resolve(miRNAtargetPath, contrastName + '_go_predictedTargets_pos.txt');
            const KEGG_enrich_predTarget_posFile = path.resolve(miRNAtargetPath, contrastName + '_kegg_predictedTargets_pos.txt');
            const GO_enrich_predTarget_negFile = path.resolve(miRNAtargetPath, contrastName + '_go_predictedTargets_neg.txt');
            const KEGG_enrich_predTarget_negFile = path.resolve(miRNAtargetPath, contrastName + '_kegg_predictedTargets_neg.txt');


            const volcanoPlotSheet = workbook.addWorksheet('(1) ' + contrastSheetName);
            await addImage(workbook, volcanoPlotSheet, volcanoPlotPNG, {tl: {col: 0, row: 0}, br: {col: 20, row: 40}});
            mergeCellByIndices(volcanoPlotSheet, 40, 0, 40, 19);
            addText(volcanoPlotSheet, 0, 40, 'Figure ' + xlsxFigIndex + '. Volcano plot of ' + contrastDisplay + '.', {
                font: { name: 'Arial', family: 3, size: 14},
                alignment: {vertical: 'top', horizontal: 'center'}
            });
            writeReportHTML.write('<h2>Differentially expressed miRNAs<br> (' + contrastDisplay + ') </h2>');
            addImgHTML(writeReportHTML, volcanoPlotPNG, 'Figure. Volcano Plot (' + contrastDisplay + ')', pdfFigIndex);
            endPage(writeReportHTML);



            const posExprRNASheet = workbook.addWorksheet('(2) ' + contrastSheetName);
            const dePosData = await fromTextFile(workbook, DE_miRNA_posFile, ',', posExprRNASheet, false);
            posExprRNASheet.getRow(1).splice(1, 0, 'miRNA');
            makeBasicTableStyle(posExprRNASheet, dePosData, 'Table ' + (xlsxTableIndex - 7) + '. ' + 'Positively expressed miRNAs (' + contrastDisplay + ')');
            for (let i = 2; i < dePosData[0].length + 2; i ++) {
                if (i < 6) {
                    posExprRNASheet.getColumn(i).numFmt = '#.000#';
                }else {
                    posExprRNASheet.getColumn(i).numFmt = '0.00E+00';
                }
            }

            writeReportHTML.write('<h2>Differentially expressed miRNAs (' + contrastDisplay + ') </h2>');
            // todos: Also show the contrast!!
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 positively expressed miRNAs (' + contrastDisplay + ').');
            theData = dePosData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i < 4 && !isNaN(v)) {
                        return v.toFixed(4);
                    }else if(!isNaN(v)) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            dePosData[0].unshift('miRNA');
            addHTMLTable(writeReportHTML, theData, dePosData[0]);
            endPage(writeReportHTML);

            // 5. Negatively expressed miRNA
            const negExprRNASheet = workbook.addWorksheet('(3) ' + contrastSheetName);
            const deNegData = await fromTextFile(workbook, DE_miRNA_negFile, ',', negExprRNASheet, false);
            negExprRNASheet.getRow(1).splice(1, 0, 'miRNA');
            makeBasicTableStyle(negExprRNASheet, deNegData, 'Table ' + (xlsxTableIndex - 6) + '. Negatively expressed miRNAs (' + contrastDisplay + ')');
            for (let i = 2; i < deNegData[0].length + 2; i ++) {
                if (i < 6) {
                    negExprRNASheet.getColumn(i).numFmt = '#.000#';
                }else {
                    negExprRNASheet.getColumn(i).numFmt = '0.00E+00';
                }
            }


            // todos: Also show the contrast!!
            pdfTableIndex ++;
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 negatively expressed miRNAs (' + contrastDisplay + ').');
            theData = deNegData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i < 4 && !isNaN(v)) {
                        return v.toFixed(4);
                    }else if(!isNaN(v)) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            deNegData[0].unshift('miRNA');
            addHTMLTable(writeReportHTML, theData, deNegData[0]);
            endPage(writeReportHTML);


            // 6. predicted targets of positively expressed miRNAs
            const posTargetSheet = workbook.addWorksheet('(4) ' + contrastSheetName);
            const predTarget_posData = await fromTextFile(workbook, predTarget_posFile, ',', posTargetSheet, false);
            posTargetSheet.getRow(1).splice(1, 0, 'tobeDeleted');
            posTargetSheet.spliceColumns(1,1);
            makeBasicTableStyle(posTargetSheet, predTarget_posData, 'Table ' + (xlsxTableIndex - 5) + '. Predicted targets of significantly positive miRNA expressions (' + contrastDisplay + ').');

            // 7. predicted targets of positively expressed miRNAs
            const negTargetSheet = workbook.addWorksheet('(5) ' + contrastSheetName);
            const predTarget_negData = await fromTextFile(workbook, predTarget_negFile, ',', negTargetSheet, false);
            negTargetSheet.getRow(1).splice(1, 0, 'tobeDeleted');
            negTargetSheet.spliceColumns(1,1);
            makeBasicTableStyle(negTargetSheet, predTarget_negData, 'Table ' + (xlsxTableIndex - 4) + '. Predicted targets of significantly negative miRNA expressions (' + contrastDisplay + ').');


            // 8. [pos] enrichment of predicted targets
            const posGOSheet = workbook.addWorksheet('(6) ' + contrastSheetName);
            const posGOData = await fromTextFile(workbook, GO_enrich_predTarget_posFile, '\t', posGOSheet, false);
            makeBasicTableStyle(posGOSheet, posGOData, 'Table ' + (xlsxTableIndex - 3) + '. GO enrichments of predicted targets of the positively expressed miRNAs (' + contrastDisplay + ').');
            posGOSheet.getColumn(6).width = 80;
            posGOSheet.getColumn(2).numFmt = '0.00E+00';
            posGOSheet.getColumn(2).width = 30;
            posGOSheet.getColumn(3).numFmt = '0.00E+00';
            posGOSheet.getColumn(3).width = 30;
            const posKEGGSheet = workbook.addWorksheet('(7) ' + contrastSheetName);
            const posKEGGData = await fromTextFile(workbook, KEGG_enrich_predTarget_posFile, '\t', posKEGGSheet, false, [, 'number', 'number']);
            makeBasicTableStyle(posKEGGSheet, posKEGGData, 'Table ' + (xlsxTableIndex - 2) + '. KEGG pathway enrichments of predicted targets of the positively expressed miRNAs (' + contrastDisplay + ').');
            posKEGGSheet.getColumn(6).width = 80;
            posKEGGSheet.getColumn(2).numFmt = '0.00E+00';
            posKEGGSheet.getColumn(2).width = 30;
            posKEGGSheet.getColumn(3).numFmt = '0.00E+00';
            posKEGGSheet.getColumn(3).width = 30;


            writeReportHTML.write('<h2>Functional analysis</h2>');
            // todos: Also show the contrast!!
            pdfTableIndex++;
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 Gene Ontology terms from predicted targets of the positively expressed miRNAs (' + contrastDisplay + ').');
            theData = posGOData.slice(1);
            theData.sort((a, b) => {
                return a[1] - b[1] ;
            });
            theData = theData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i === 1) {
                        return v.toExponential(3);
                    }else if (i === 2) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            addHTMLTable(writeReportHTML, theData, ['category', 'over represented p-value', 'under represented p-value', 'number DE in cat', 'number in cat', 'term', 'ontology']);
            endPage(writeReportHTML);

            pdfTableIndex++;
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 enriched pathways from predicted targets of the positively expressed miRNAs (' + contrastDisplay + ').');
            theData = posKEGGData.slice(1);
            theData.sort((a, b) => {
                return a[1] - b[1] ;
            });
            theData = theData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i === 1) {
                        return v.toExponential(3);
                    }else if (i === 2) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            addHTMLTable(writeReportHTML, theData, ['category', 'over represented p-value', 'under represented p-value', 'number DE in cat', 'number in cat', 'description']);
            endPage(writeReportHTML);


            // 10. [neg] enrichment of predicted targets
            const negGOSheet = workbook.addWorksheet('(8) ' + contrastSheetName);
            const negGOData = await fromTextFile(workbook, GO_enrich_predTarget_negFile, '\t', negGOSheet, false);
            makeBasicTableStyle(negGOSheet, negGOData, 'Table ' + (xlsxTableIndex - 1) + '. GO enrichments of predicted targets of the negatively expressed miRNAs (' + contrastDisplay + ').');
            negGOSheet.getColumn(6).width = 80;
            negGOSheet.getColumn(2).numFmt = '0.00E+00';
            negGOSheet.getColumn(2).width = 30;
            negGOSheet.getColumn(3).numFmt = '0.00E+00';
            negGOSheet.getColumn(3).width = 30;
            const negKEGGSheet = workbook.addWorksheet('(9) ' + contrastSheetName);
            const negKEGGData = await fromTextFile(workbook, KEGG_enrich_predTarget_negFile, '\t', negKEGGSheet, false, [, 'number', 'number']);
            makeBasicTableStyle(negKEGGSheet, negKEGGData, 'Table ' + (xlsxTableIndex) + '. KEGG pathway enrichments of predicted targets of the negativley expressed miRNAs');
            negKEGGSheet.getColumn(6).width = 80;
            negKEGGSheet.getColumn(2).numFmt = '0.00E+00';
            negKEGGSheet.getColumn(2).width = 30;
            negKEGGSheet.getColumn(3).numFmt = '0.00E+00';
            negKEGGSheet.getColumn(3).width = 30;
            
            pdfTableIndex++;
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 Gene Ontology terms from predicted targets of the negatively expressed miRNAs (' + contrastDisplay + ').');
            theData = negGOData.slice(1);
            theData.sort((a, b) => {
                return a[1] - b[1] ;
            });
            theData = theData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i === 1) {
                        return v.toExponential(3);
                    }else if (i === 2) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            addHTMLTable(writeReportHTML, theData, ['category', 'over represented p-value', 'under represented p-value', 'number DE in cat', 'number in cat', 'term', 'ontology']);
            endPage(writeReportHTML);

            pdfTableIndex++;
            writeReportHTML.write('<b>Table ' + pdfTableIndex + '. </b> Top 40 enriched pathways from predicted targets of the negatively expressed miRNAs (' + contrastDisplay + ').');
            theData = negKEGGData.slice(1);
            theData.sort((a, b) => {
                return a[1] - b[1] ;
            });
            theData = theData.slice(1, 41);
            theData = theData.map((row) => {
                return row.map((v, i) => {
                    if (i === 1) {
                        return v.toExponential(3);
                    }else if (i === 2) {
                        return v.toExponential(3);
                    }
                    return v;
                });
            });
            addHTMLTable(writeReportHTML, theData, ['category', 'over represented p-value', 'under represented p-value', 'number DE in cat', 'number in cat', 'description']);
            endPage(writeReportHTML);

            await workbook.xlsx.writeFile(outputXlsxFile);
        }
    }catch(e) {
        throw e;
    }
}




// Input information for final report pdf


const getProjectInfo = async function() {
    const workbook2 = new Excel.Workbook();
    await workbook2.xlsx.readFile(projectInfoPath);
    const basicInfo = workbook2.getWorksheet('Case info');
    Title = basicInfo.getCell('B1').value;
    Institute = basicInfo.getCell('B2').value;
    Customer = basicInfo.getCell('B3').value;
    Bioinformatician = basicInfo.getCell('B4').value;
    phoneExt = basicInfo.getCell('B5').value;
    reportDate = basicInfo.getCell('B6').value ? new Date(basicInfo.getCell('B6').value) : reportDate;
    posFoldCut = basicInfo.getCell('B7').value || posFoldCut;
    negFoldCut = basicInfo.getCell('B8').value || negFoldCut;
    pvalueCut = basicInfo.getCell('B9').value || pvalueCut;
    ReferenceGenome = basicInfo.getCell('B10').value || ReferenceGenome;
    Annotations = basicInfo.getCell('B11').value || Annotations;
    const contrastSheet = workbook2.getWorksheet('Contrasts');
    contrastSheet.eachRow((row) => {
        contrasts.push([row.values[1], row.values[2]]);
    });
}

getProjectInfo()
.then(() => {
    startWriteReportStream();
    return start()
})
.then(() => {
    console.log('done');
}).catch((err) => {
    console.log(err);
}).then(async () => {
    writeReportHTML.end('</body></html>');
    // Using Chrome
    const browser = await puppeteer.launch({args: ['--no-sandbox', '--disable-setuid-sandbox']});
    const page = await browser.newPage();
    await page.goto('file:///' + outputHTMLFile);
    await page.pdf({path: outputPDFfile, format: 'A4', printBackground: true, displayHeaderFooter: false, margin: {top: 40, bottom: 40, left: 40, right: 40}});
    browser.close();
    /*
    const reportHTML = await getHTML(outputHTMLFile);
    conversion({
        html: reportHTML,
        allowLocalFilesAccess: true,
        fitToPage: true,
        viewportSize: {
            width: 595,
            height: 842
        },
        format: {
            quality: 100
        }
    }, (err, pdf) => {
        if (err) {
            console.log(err);
        }
        var output = fs.createWriteStream(outputPDFfile)
        console.log(pdf.logs);
        console.log(pdf.numberOfPages);
          // since pdf.stream is a node.js stream you can use it
          // to save the pdf to a file (like in this example) or to
          // respond an http request.
        pdf.stream.pipe(output);
    });
    */
}).catch((e) => {
    console.log(e);
});


/*
const pageWidth = 595;
const pageHeight = 842;


const pdfWriter = hummus.createWriter(outputPDFfile);



const fontObject = pdfWriter.getFontForFile('C:\\Windows\\Fonts\\msjh.ttc');
const boldFontObject = pdfWriter.getFontForFile('C:\\Windows\\Fonts\\msjhbd.ttc');
const textOptions = [
    {font:fontObject,size: 18,colorspace:'gray',color:0x00}
    , {font:fontObject,size: 24,colorspace:'gray',color:0x00}
    , {font:fontObject,size: 14,colorspace:'gray',color:0x00}
];

const getTextObj = function(text, size, isBold) {
    const textOption = {font: fontObject, size: size, colorspace: 'gray', color: 0x00};
    if (isBold) {
        textOption.font = boldFontObject;
    }
    return {
        dim: textOption.font.calculateTextDimensions(text, size),
        textOption: textOption
    };
}


const createCoverPage = function(pdfWriter) {
    const page = pdfWriter.createPage(0,0,pageWidth,pageHeight);
    const ctx = pdfWriter.startPageContentContext(page);
    let text = 'Chang Gung Bioinformatics Service Platform';

    let textObj = getTextObj(text, 18, false);
    let theY = (pageHeight*2/3) + textObj.dim.height;
    ctx.writeText(text, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);

    text = 'miRNA-seq Analysis Report';
    textObj = getTextObj(text, 24, true);
    theY = theY - textObj.dim.height*2;
    ctx.writeText(text, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);

    textObj = getTextObj(Customer, 14, false);
    theY = pageHeight/3 + textObj.dim.height;
    ctx.writeText(Customer, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);

    text = 'Bioinformatician: ' +　Bioinformatician;
    textObj = getTextObj(text, 14, false);
    theY = theY - textObj.dim.height*2;
    ctx.writeText(text, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);

    text = 'Tel: ' + phoneExt;
    textObj = getTextObj(text, 14, false);
    theY = theY - textObj.dim.height*2
    ctx.writeText(text, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);

    text = 'Date: ' + moment().format('L');
    textObj = getTextObj(text, 14, false);
    theY = theY - textObj.dim.height*2
    ctx.writeText(text, (pageWidth - textObj.dim.width)/2, theY, textObj.textOption);
    pdfWriter.writePage(page);
}

const createTableContent = function(pdfWriter) {
    const page = pdfWriter.createPage(0,0,pageWidth,pageHeight);
    const ctx = pdfWriter.startPageContentContext(page);
    let text = 'Table of contents';
    let textObj = getTextObj(text, 24, true);
    let theY = (pageHeight - 60);
    ctx.writeText(text, 60, theY, textObj.textOption);

    const texts = ['Materials & Methods', 'Reference genome', 'Tools used in this report', 'Quality check', 'Mapping Results'];
    textObj = getTextObj(text, 14, false);
    ctx.writeText(text, 80, theY)

    pdfWriter.writePage(page);
}

createCoverPage(pdfWriter);
createTableContent(pdfWriter);
pdfWriter.end();
/*
fromCSV(workbook, alignmentStats, 'test').then(() => {
    console.log(workbook);
}).catch((err) => {
    console.log(err);
});
*/
/*
const readSVG = function(svgFile) {
    return new Promise((resolve, reject) => {
        let data = '';
        let start = false;
        const rl = readline.createInterface({
            input: fs.createReadStream(svgFile)
        });
        rl.on('line', (line) => {
            if (start || line.match(/^<svg/)) {
                data += line;
                start = true;
            }
        });
        rl.on('error', (err) => {
            reject(err);
        });
        rl.on('close', () => {
            resolve(data);
        });
    });
};

const pdfDoc = new PDFDocument({ autoFirstPage: false});
pdfDoc.pipe(fs.createWriteStream(outputPDFfile));
pdfDoc.info.Title = 'miRNA-seq analysis report';
pdfDoc.info.Author = 'Chi Yang';
const createCoverPage = async function(doc) {
    doc.addPage({size: 'A4'});
    const svgString = await readSVG(multiQCBaseQualitySVG);
    SVGtoPDF(doc, svgString, 10, 10, {
        width: pageWidth-20, preserveAspectRatio: 'xMinYMin meet', useCSS: true
    });
    // doc.text('Hello world!');
};
createCoverPage(pdfDoc).then(() => {
    pdfDoc.end();
}).catch((err) => {
    console.log(err);
});
*/

// const outputMdStream = fs.createWriteStream(ouptutMdFile);




