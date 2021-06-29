const BdpAPI = new BdpPageAPI();
$('#pageTitle').text('Download exemple datasets from ArrayExpress');
const vueInstance = new Vue({
  el: '#vue-instance',
  data: {
    downloadedFolders: [],
    folderID2Result: {},
    currentPkg: null,
    downloadingResult: null
  },
  methods: {
    openFileLink: function(fileID) {
      return BdpAPI.initialized && BdpAPI.openFileLink(fileID);
    },
    openResultLink: function(resultID) {
      return BdpAPI.initialized && BdpAPI.openResultLink(resultID);
    },
    removeDownloadExamples: async function(fileID) {
      const correspondingResult = this.folderID2Result[fileID];
      console.log(correspondingResult);
      if (correspondingResult) {
        await BdpAPI.deleteResult(correspondingResult.id);
        await this.updateDownloadRecords();
      }
    },
    downloadExample: async function() {
      if (!this.currentPkg) { return; }
      this.isDownloading = true;
      this.downloadingResult = await BdpAPI.executeTask('download-examples', this.currentPkg.id, {name: 'Downloading small RNA-sequencing data.', desc: 'Automatically downloading via the customized Project Page.', prefix: '', suffix: ''}, ['download-examples', null], [{
        name: 'An example folder containing small RNA-seq data'
      }]);
      await this.updateDownloadRecords();
    },
    updateDownloadRecords: async function() {
      const results = await BdpAPI.listResults();
      const dataFiles = await BdpAPI.listFiles();
      const rawSeqFolders = dataFiles.filter(df => df.tags.indexOf('Folder') >= 0 && df.tags.indexOf('raw-sequences') >= 0).reverse();
      const downloadExampleResults = results.filter(r => r.task && r.task.key === 'download-examples');
      this.downloadedFolders.length = 0;
      this.folderID2Result = {};
      for (let i = 0; i < rawSeqFolders.length; i ++) {
        const eachRawSeqFolder = rawSeqFolders[i];
        for (let j = 0; j < downloadExampleResults.length; j ++) {
          const eachDownloadResult = downloadExampleResults[j];
          if (eachDownloadResult.arguments[1].value === eachRawSeqFolder.path || eachDownloadResult.arguments[1].value.path === eachRawSeqFolder.path) {
            this.folderID2Result[eachRawSeqFolder.id] = eachDownloadResult;
            this.downloadedFolders.push(eachRawSeqFolder);
          }
          if(this.downloadingResult && this.downloadingResult.id === eachDownloadResult.id) {
            if (eachDownloadResult.status >= 2) {
              this.downloadingResult = null;
            } else {
              this.downloadingResult = eachDownloadResult;
            }

          }
        }
      }
    }
  }
});


(async () => {
  await BdpAPI.initialize();
  vueInstance.currentPkg = await BdpAPI.getCurrentPackageInfo();
  await vueInstance.updateDownloadRecords();
  BdpAPI.watchResultChange((updatedResult) => {
    const downloadingResult = vueInstance.downloadingResult;
    if (!downloadingResult) { return; }
    if (updatedResult.data.id !== downloadingResult.id) { return; }
    vueInstance.updateDownloadRecords().catch(console.log);
  });
})().catch(console.log);