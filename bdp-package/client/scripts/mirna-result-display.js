const BdpAPI = new BdpPageAPI();
const HotTable = Handsontable.vue.HotTable;
function transpose(matrix) {
  return matrix[0].map((col, i) => matrix.map(row => row[i]));
}

const wait = (ms) => new Promise((resolve) => setTimeout(() => resolve(), ms));
const vueInstance = new Vue({
  el: '#vue-app',
  vuetify: new Vuetify(),
  data: {
    BdpAPI: null,
    pageTitle: 'Result',
    currentPkg: null,
    currentUser: null,
    currentResult: null,
    watcher: null,
    viewControls: {
      multiQCmaximized: false ,
      isDownloadingExcel: false
    },
    hotSettings : {
      data:[[]],
      minCols: 5,
      columnSorting: true,
      colHeaders: true,
      rowHeaders: true,
      stretchH: 'all',
      rowHeights: 23,
      width: "100%",
      autoRowSize: false,
      autoColumnSize: true,
      autoWrapRow: true,
      height: '100%',
      manualRowResize: true,
      manualColumnResize: true,
      manualRowMove: true,
      manualColumnMove: true, 
      contextMenu: true,
      fixedColumnsLeft: 1,
      renderAllRows: false,
      // filters: true,
      dropdownMenu: true,
      // observeChanges: true,
      licenseKey: "non-commercial-and-evaluation",
      mergeCells: true,
      manualColumnFreeze: true
    },
    results: {
      fastqcPaths: [],
      fastqcFolderPath: null,
      projectSummaryReport: {
        data: [],
        columns: []
      },
      topDiffclusterURL: null,
      sampleDist: {
        heatmapGraphURL: null,
        pcaPlotURL: null
      },
      multiQC: {
        meanQalityURL: null,
        fragmentSizeURL: null,
        avgGCcontentURL: null
      },
      tagLengthGraphs: null,
      comparisons: []
    }
  },
  computed: {
    runningTime: function() {
      this.currentResult.timer
    }
  },
  methods: {
    resetResultCache: function() {
      this.results = {
        fastqcPaths: [],
        fastqcFolderPath: null,
        projectSummaryReport: {
          data: [],
          columns: []
        },
        topDiffclusterURL: null,
        sampleDist: {
          heatmapGraphURL: null,
          pcaPlotURL: null
        },
        multiQC: {
          meanQalityURL: null,
          fragmentSizeURL: null,
          avgGCcontentURL: null
        },
        tagLengthGraphs: null,
        comparisons: []
      }
    },
    downloadExcel: async function() {
      const theFinalOutputFolderRecord = this.currentResult.outFiles[3];
      this.viewControls.isDownloadingExcel = true;
      const excelBlob = await this.BdpAPI.getFileBlob(theFinalOutputFolderRecord.id, ['final_report.xlsx']);
      this.viewControls.isDownloadingExcel = false;
      saveAs(excelBlob, "final_report.xlsx");
    },
    openFileLink: async function(fileID) {
      await this.BdpAPI.openFileLink(fileID);
    },
    openResultLink: async function(resultID) {
      await this.BdpAPI.openResultLink(resultID);
    },
    openStaticLink: async function(dataFileID, subPath) {
      await this.BdpAPI.openStaticLink(dataFileID, subPath);
    },
    openStaticLinkByArgValue: async function(argValue, subPath) {
      const theDataFile = await this.getDataFileFromArgValue(argValue);
      if (theDataFile && theDataFile.id) {
        await this.BdpAPI.openStaticLink(theDataFile.id, subPath);
      }
    },
    globFilesInFolder: async function(files, globbyExprs) {
      return this.BdpAPI.globFilesInFolder(files, globbyExprs);
    },
    getDataFileFromArgValue: async function(argValue) {
      if (argValue.id) { return argValue; }
      const theDataFile = (await this.BdpAPI.listFiles()).filter(df => df.path === argValue)[0];
      return theDataFile || null;
    },
    getWorkbookFromArgValue: async function(argValue, subPath) {
      const df = await this.getDataFileFromArgValue(argValue);
      const fileBlob = await this.BdpAPI.getFileBlob(df.id, subPath);
      const dataBuffer = await BdpPageUtils.readFileBlob(fileBlob, 'binaryString');
      return XLSX.read(dataBuffer, {type: "binary"});
    },
    loadMultiQCPlots: async function() {
      const theMultiQCfolder = await this.getDataFileFromArgValue(this.currentResult.arguments[13].value);
      this.results.multiQC.meanQalityURL = URL.createObjectURL(await this.BdpAPI.getFileBlob(theMultiQCfolder.id, './multiqc_plots/svg/mqc_fastqc_per_base_sequence_quality_plot_1.svg'));
      this.results.multiQC.fragmentSizeURL = URL.createObjectURL(await this.BdpAPI.getFileBlob(theMultiQCfolder.id, './multiqc_plots/svg/mqc_fastqc_sequence_length_distribution_plot_1.svg'));
      this.results.multiQC.avgGCcontentURL = URL.createObjectURL(await this.BdpAPI.getFileBlob(theMultiQCfolder.id, './multiqc_plots/svg/mqc_fastqc_per_sequence_gc_content_plot_Counts.svg'));
    },
    loadingSummaryReportCSV: async function() {
      const workbook = await this.getWorkbookFromArgValue(this.currentResult.arguments[11].value, '/alignment_stats.csv');
      let spreadsheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true, header: 1});
      const columns = spreadsheetData.splice(0, 1)[0];
      columns.unshift('Samples');
      let counter = {};
      spreadsheetData.forEach(row => {
        const key = `${row[0]}_${row[1]}`;
        if (!counter[key]) { counter[key] = 1; } else { counter[key] ++; }
        row.unshift(`${key}_${counter[key]}`);
      });
      /*
      spreadsheetData = transpose(spreadsheetData);
      const columns = spreadsheetData.splice(0, 1)[0].map((c, i) => {
        if (i === 0) { return c; }
        return `${c}_${spreadsheetData[0][i]}`;
      });
      // const columns = this.results.projectSummaryReport.columns = spreadsheetData.splice(0, 1)[0];
      const counter = {};
      columns.forEach((c, i) => {
        if (i === 0) { return; }
        if (!counter[c]) {
          counter[c] = 1;
        } else {
          counter[c] ++;
        }
        columns[i] += '_' + counter[c];
      });
      */
      this.results.projectSummaryReport.columns = columns;
      this.results.projectSummaryReport.data = spreadsheetData;
    },
    displaySummaryReport: async function(hotTableId, hotTableContainer, refName, refIndex) {
      const spreadsheetData = this.results.projectSummaryReport.data;
      const columns = this.results.projectSummaryReport.columns;
      let hotInstance;
      refIndex = refIndex || 0;
      if (Array.isArray(this.$refs[refName])) {
        hotInstance = this.$refs[refName][refIndex].hotInstance;
      } else {
        hotInstance = this.$refs[refName].hotInstance;
      }
      if (hotInstance) {
        hotInstance.loadData(spreadsheetData);
        hotInstance.updateSettings({colHeaders: columns});
        hotInstance.refreshDimensions();
        $('#' + hotTableId).off('maximized.lte.cardwidget');
        $('#' + hotTableId).off('minimized.lte.cardwidget');
        $('#' + hotTableId).on('maximized.lte.cardwidget', () => {
          setTimeout(() => {
            hotInstance.updateSettings({height: $('#' + hotTableContainer).parent().height()});
            hotInstance.refreshDimensions();
          }, 300);
        });
        $('#' + hotTableId).on('minimized.lte.cardwidget', () => {
          setTimeout(() => {
            hotInstance.updateSettings({height: $('#' + hotTableContainer).parent().height()});
            hotInstance.refreshDimensions();
          }, 300);
        });
      } else {
        console.log(`No handsontable instance with ref=annotationSummaryTable`);
      }
    },
    plotDataTable: async function(argValue, subPath, tableRef, tableIndex) {
      tableIndex = tableIndex || 0;
      const theProjectFolder = await this.getDataFileFromArgValue(argValue);
      const fileBlob = await this.BdpAPI.getFileBlob(theProjectFolder.id, subPath);
      const dataBuffer = await BdpPageUtils.readFileBlob(fileBlob, 'binaryString');
      const workbook = XLSX.read(dataBuffer, {type: "binary"});
      const spreadsheetData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true, header: 1});
      const columns = spreadsheetData.splice(0, 1)[0];
      await this.updateDataTable(spreadsheetData, columns, tableRef, tableIndex);
    },
    getVueRef: function(refName, refIndex) {
      refIndex = refIndex || 0;
      return Array.isArray(this.$refs[refName]) ? this.$refs[refName][refIndex] : this.$refs[refName];
    },
    updateDataTable: async function(data, columns, tableRef, tabIndex) {
      if (data.length === 0) {
        data = [new Array(columns.length)];
      }
      const theVueRef = this.getVueRef(tableRef, tabIndex);
      const hotInstance = theVueRef.hotInstance;
      if (hotInstance) {
        hotInstance.loadData(data);
        hotInstance.updateSettings({colHeaders: columns});
        hotInstance.refreshDimensions();
        const theCard = $(theVueRef.$el).parents('.card')[0];
        $(theCard).off('maximized.lte.cardwidget');
        $(theCard).off('minimized.lte.cardwidget');
        $(theCard).on('maximized.lte.cardwidget', () => {
          setTimeout(() => {
            hotInstance.updateSettings({height: $(theVueRef.$el).parent().height()});
            hotInstance.refreshDimensions();
          }, 300);
        });
        $(theCard).on('minimized.lte.cardwidget', () => {
          setTimeout(() => {
            hotInstance.updateSettings({height: $(theVueRef.$el).parent().height()});
            hotInstance.refreshDimensions();
          }, 300);
        });
      }
    },
    updateFastQCresult: async function(theChildResult) {
      const theDataFile = await this.getDataFileFromArgValue(theChildResult.arguments[2].value);
      if (theDataFile) {
        // this.results.fastqcFolderId = theDataFile.id;
        this.results.fastqcFolderPath = theDataFile.path;
        this.results.fastqcPaths = (await this.globFilesInFolder(theDataFile.id, ['*_fastqc.html'])).map(path => {
          return {id: theDataFile.id, path: path};
        });
      }
    },
    loadingTagLengthGraph: async function() {
      if (Array.isArray(this.results.tagLengthGraphs)) { return; }
      const theProjectFolder = await this.getDataFileFromArgValue(this.currentResult.arguments[11].value);
      const tagGraphList = (await this.BdpAPI.globFilesInFolder(theProjectFolder.id, ['graphs/tags/*_tags.jpg'])).sort();
      const tagLengthGraphObjs = [];
      for (let i = 0; i < tagGraphList.length; i ++) {
        const eachGraphPath = tagGraphList[i];
        const blobPromise = this.BdpAPI.getFileBlob(theProjectFolder.id, eachGraphPath);
        const sampleNameMatch = eachGraphPath.match(/.*\/(.*)_tags\.jpg$/)[1];
        tagLengthGraphObjs[i] = {
          sampleName: sampleNameMatch,
          path: eachGraphPath,
          graphBlob: null,
          url: ''
        };
        blobPromise.then(blob => {
          tagLengthGraphObjs[i].graphBlob = blob;
          tagLengthGraphObjs[i].url = URL.createObjectURL(blob);
        });
      }
      this.results.tagLengthGraphs = tagLengthGraphObjs;
    },
    updateTagLengthGraph: async function(graphSummaryId) {
      // $('#' + graphSummaryId).CardWidget('collapse');
      $('#' + graphSummaryId).off('expanded.lte.cardwidget');
      let isLoaded = false;
      $('#' + graphSummaryId).on('expanded.lte.cardwidget', async () => {
        if (isLoaded) { return; }
        await this.loadingTagLengthGraph();
        isLoaded = true;
      });
    },
    retrieveBlobURL: async function(folderId, subPath) {
      return URL.createObjectURL(await this.BdpAPI.getFileBlob(folderId, subPath));
    },
    loadingTableData: async function(tableRef, comparisonIndex, suffix) {
      const theComparison = this.results.comparisons[comparisonIndex];
      if (theComparison[tableRef]) { 
        theComparison[tableRef].status = theComparison[tableRef].status === 'collapsed' ? 'expanded' : 'collapsed';
        return;
      }
      const theVueRef = this.getVueRef(tableRef, comparisonIndex);
      const theCard = $(theVueRef.$el).parents('.card')[0];
      $(theCard).append(`<div class="overlay"><i class="fas fa-2x fa-sync-alt fa-spin"></i></div>`);
      const workbook = await this.getWorkbookFromArgValue(theComparison.folderObj, `./${theComparison.group1}_vs_${theComparison.group2}` + suffix);
      const data = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], {raw: true, header: 1});
      console.log(data);
      const columns = data.splice(0, 1)[0];
      console.log(columns);
      switch (tableRef) {
        case 'positiveDeList':
          columns.unshift('miRNA');
        break;
        case 'negativeDeList':
          columns.unshift('miRNA');
        break;
        case 'positiveTargetList':
          data.forEach(d => d.splice(0, 1));
        break;
        case 'negativeTargetList':
          data.forEach(d => d.splice(0, 1));
        break;
        case 'positiveGoList':
          // columns = data.splice(0, 1)[0];
        break;
        case 'negativeGoList':
          // columns = data.splice(0, 1)[0];
        break;
        case 'positiveKEGGList':
          data.forEach((d, i) => {
            const str = ('00000000' + d[0]);
            data[i][0] = str.substr(str.length - 5);
          });
        break;
        case 'negativeKEGGList':
          data.forEach((d, i) => {
            const str = ('00000000' + d[0]);
            data[i][0] = str.substr(str.length - 5);
          });
        break;
      }
      theComparison[tableRef] = {
        length: data.length,
        status: 'expanded'
      };
      await wait(300);
      await this.updateDataTable(data, columns, tableRef, comparisonIndex);
      $(theCard).find('.overlay').remove();
    },
    setCurrentResult: async function(result) {
      this.resetResultCache();
      this.currentResult = result;
      for (let stepIndex = 0; stepIndex < this.currentResult.children.length; stepIndex ++) {
        const childResults = this.currentResult.children[stepIndex];
        for (let taskIndex = 0; taskIndex < childResults.length; taskIndex ++) {
          const childResult = childResults[taskIndex];
          const childTask = childResult.task;
          switch (childTask.key) {
            case 'trim-adapter':
              await this.updateFastQCresult(childResult);
            break;
            case 'annotation-summary':
            if (childResult.status === 2) {
              await this.loadingSummaryReportCSV();
              await this.displaySummaryReport('annotationSummary', 'annotationSummaryContainer', 'annotationSummaryTable');
              if (this.currentResult.status === 2) {
                await this.displaySummaryReport('report_annotationSummary', 'report_annotationSummaryContainer', 'report_annotationSummaryTable');
              }
            }
            break;
            case 'mature-matrix-tcga':
              // await this.plotDataTable(this.currentResult.arguments[12].value, '/expn_matrix_mimat.txt', 'rawCountTable');
              // await this.plotDataTable(this.currentResult.arguments[12].value, '/expn_matrix_mimat_norm.txt', 'normalizedCountTable')
            break;
            case 'graph-summary':
              if (childResult.status !== 2) { return; }
              if (this.currentResult.status === 2) {
                await this.updateTagLengthGraph('report_graphSummary');
              }
              await this.updateTagLengthGraph('graphSummary');
            break;
            case 'multi-qc':
              if (childResult.status !== 2) {return;}
              await this.loadMultiQCPlots();
            break;
            case 'mirna-analysis':
              if (childResult.status !== 2) { return; }
              const theResultFolder = await this.getDataFileFromArgValue(childResult.arguments[8].value);
              this.results.sampleDist.pcaPlotURL = await this.retrieveBlobURL(theResultFolder.id, 'pca_plot.svg');
              this.results.sampleDist.heatmapGraphURL = await this.retrieveBlobURL(theResultFolder.id, 'hierarchical_clustering.svg');
              this.results.topDiffclusterURL = await this.retrieveBlobURL(theResultFolder.id, 'top_diff_2d_cluster.svg');
              const volcanoPlotPaths = await this.BdpAPI.globFilesInFolder(theResultFolder.id, ['*_volcano_plot.svg']);
              this.results.comparisons = [];
              const comparisons = [];
              for (let i = 0; i < volcanoPlotPaths.length; i ++) {
                const p = volcanoPlotPaths[i];
                const matched = p.match(/(.*?)_vs_(.*?)_volcano_plot\.svg/);
                if (matched && matched.length < 3) { continue; }
                const volcanoBlobPromise = this.retrieveBlobURL(theResultFolder.id, p);
                const barPlotBlobPromise = this.retrieveBlobURL(theResultFolder.id, `/${matched[1]}_vs_${matched[2]}_barplot.svg`);
                const eachComparison = {
                  folderObj: theResultFolder,
                  group1: matched[1],
                  group2: matched[2],
                  volcanoPlotUrl: '',
                  barPlotUrl: '',
                  positiveDeList: null,
                  negativeDeList: null,
                  positiveTargetList: null,
                  negativeTargetList: null,
                  positiveGoList: null,
                  negativeGoList: null,
                  positiveKEGGList: null,
                  negativeKEGGList: null
                };
                volcanoBlobPromise.then(volcanoBlobURL => eachComparison.volcanoPlotUrl = volcanoBlobURL);
                barPlotBlobPromise.then(barPlotBlobURL => eachComparison.barPlotUrl = barPlotBlobURL);
                comparisons.push(eachComparison);
              };
              this.results.comparisons = comparisons;
             
              /*
              for (let i = 0; i < comparisons.length; i ++) {
                const eachComparison = comparisons[i];
                
                /*
                const positive_targets_workbook = await this.getWorkbookFromArgValue(theResultFolder, `./${eachComparison.group1}_vs_${eachComparison.group2}_predictedTargets_pos.csv`);
                const positive_targets_data = XLSX.utils.sheet_to_json(positive_targets_workbook.Sheets[positive_targets_workbook.SheetNames[0]], {raw: true, header: 1});
                const positive_targets_columns = positive_targets_data.splice(0, 1)[0];
                
                await this.updateDataTable(positive_targets_data, positive_targets_columns, 'positiveTargetList', i);

                const negative_targets_workbook = await this.getWorkbookFromArgValue(theResultFolder, `./${eachComparison.group1}_vs_${eachComparison.group2}_predictedTargets_neg.csv`);
                const negative_targets_data = XLSX.utils.sheet_to_json(negative_targets_workbook.Sheets[negative_targets_workbook.SheetNames[0]], {raw: true, header: 1});
                const negative_targets_columns = negative_targets_data.splice(0, 1)[0];
                negative_targets_data.forEach(data => data.splice(0, 1))
                await this.updateDataTable(negative_targets_data, negative_targets_columns, 'negativeTargetList', i);
  
                


                const positive_go_workbook = await this.getWorkbookFromArgValue(theResultFolder, `./${eachComparison.group1}_vs_${eachComparison.group2}_go_predictedTargets_pos.txt`);
                const positive_go_data = XLSX.utils.sheet_to_json(positive_go_workbook.Sheets[positive_go_workbook.SheetNames[0]], {raw: true, header: 1});
                // const positive_go_columns = positive_go_data.splice(0, 1)[0];
                // await this.updateDataTable(positive_go_data, positive_go_columns, 'positiveGoList', i);
                /*
                

                const negative_targets_workbook = await this.getWorkbookFromArgValue(theResultFolder, `./${eachComparison.group1}_vs_${eachComparison.group2}_predictedTargets_pos.csv`);
                
              }
*/
              
              
              // const pcaPlot = await this.BdpAPI.globFilesInFolder(theResultFolder.id, [''])
            break;
          }
        }
      }
    },
    watchResultChange: function() {
      this.watcher = BdpAPI.watchResultChange((updatedObj) => {
        const updatedResult = updatedObj.data;
        console.log(updatedResult);
        if (updatedResult.id === this.currentResult.id) {
          this.currentResult = null;
          BdpAPI.getCurrentResultInfo().then(r => this.currentResult = r).catch(console.log);
          setTimeout(() => {
            BdpAPI.getCurrentResultInfo().then(r => this.currentResult = r).catch(console.log);
          }, 3000)
        } else if (updatedResult.parent === this.currentResult.id) {
          BdpAPI.getCurrentResultInfo().then(r => this.currentResult = r).catch(console.log);
          setTimeout(() => {
            BdpAPI.getCurrentResultInfo().then(r => this.currentResult = r).catch(console.log);
          }, 3000);
        }
      });
    },
    refreshWorkflow: async function() {
      this.currentResult = null;
      await wait(30);
      this.currentResult = await BdpAPI.getCurrentResultInfo();

    },
    stopWatchResultChange: function() {

    }
  },
  components: {
    HotTable
  }
});
(async () => {
  
  vueInstance.BdpAPI = BdpAPI;
  await BdpAPI.initialize();
  vueInstance.currentPkg = await BdpAPI.getCurrentPackageInfo();
  vueInstance.currentUser = await BdpAPI.getCurrentUserInfo();
  const currentResult = await BdpAPI.getCurrentResultInfo();
  vueInstance.setCurrentResult(currentResult);
  vueInstance.watchResultChange();
  // const multiqcDataFile = vueInstance.currentResult.arguments[13].value;
  // document.querySelector('#multiqc-iframe').src = `/data/static/${multiqcDataFile.id}/multiqc_report.html`;
  // await BdpAPI.openStaticLink(multiqcDataFile.id, '/multiqc_report.html');
  //await BdpAPI._callBdpApi('openStaticLink', {fileID: multiqcDataFile.id, subPath: '/multiqc_report.html'});
  
})().catch(console.log);

$('.card').on('maximized.lte.cardwidget', function() {

});