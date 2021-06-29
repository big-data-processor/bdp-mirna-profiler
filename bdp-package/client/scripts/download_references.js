const BdpAPI = new BdpPageAPI();
const taskExeTitle = document.getElementById('taskExeTitle');
const taskExeFooter = document.getElementById('taskExeFooter');
const stdoutPre = document.getElementById('stdoutPre');
const stderrPre = document.getElementById('stderrPre');

let selectedOrg = 'mouse';
let currentResult = null;



// $('#stopBtn').click(async function() {
//   if (currentResult) {
//     await BdpAPI.stopResult(currentResult.id);
//   }
//   $('#stopBtn').attr('disabled', true);
//   $('#stopBtn').html(`Stopping<i class='fas fa-circle-notch fa-fw fa-spin ml-2'></i>`)
//   taskExeFooter.innerHTML = `Please wait until the job is gracefully stopped.`;
// });

const enableOrgSelection = function() {
  isRunning = false;
  $('#stopBtn').attr('disabled', false);
  $('#proceedBtn').attr('disabled', false);
  $('#stopBtn').html(`Stop`);
};
const formulateStatus = function(status) {
  switch (status) {
    case 0:
      return `<i class='fas fa-hourglass-half fa-fw mr-2'></i>job is queued, please wait.`;
    case 1:
      return `<i class='fas fa-circle-notch fa-fw fa-spin mr-2'></i>job is running, please wait.`;
    case 2:
      return `<i class='fas fa-check fa-fw text-success mr-2'></i>job is finished`;
    case 3:
      return `<i class='fas fa-times fa-fw text-danger mr-2'></i>job has failed`;
    case 4:
      return `job is deleting`;
  }
};



const vueInstance = new Vue({
  el: '#vue-app',
  data: {
    thePublicProject: null,
    currentPkgInfo: {},
    preparedReferences: [],
    isReferenceExported: {},
    selectedOrg: 'mouse',
    orgRefPublished: {
      mouse: false,
      human: false
    },
    isRunning: false,
    downloadStdout: '',
    downloadStderr: '',
    theCurrentResult: null,
    stdoutText: '',
    stderrText: '',
    taskExeFooter: '',
    isStopping: false
  },
  methods: {
    initialize: async function() {
      await this.setCurrentPackageInfo();
      await this.refresh();
    },
    openResultLink: function(resultID) {
      if (resultID) {
        BdpAPI.openResultLink(resultID);
      }
    },
    openFileLink: function(fileID) {
      BdpAPI.openFileLink(fileID);
    },
    openProjectLink: function(projectID) {
      BdpAPI.openProjectLink(projectID);
    },
    setCurrentPackageInfo: async function() {
      this.currentPkgInfo = await BdpAPI.getCurrentPackageInfo();
    },
    selectOrg: function(org) {
      if (this.isRunning) { return; } 
      this.selectedOrg = org;
    },
    stopResult: async function() {
      if (this.theCurrentResult) {
        await BdpAPI.stopResult(this.theCurrentResult.id);
      }
      this.isStopping = true;
      // $('#stopBtn').html(`Stopping<i class='fas fa-circle-notch fa-fw fa-spin ml-2'></i>`)
      this.taskExeFooter = `Please wait until the job is gracefully stopped.`;
    },
    getThePublicProject: async function() {
      let projectList = await BdpAPI.listProjects(500, 0, 'public');
      let thePublicProject = projectList.records.filter(p => p.name === 'Reference files for the miRNA profiler package')[0];
      if (!thePublicProject) {
        for (let i = 1; i < projectList.totalPage; i ++) {
          projectList = await BdpAPI.listProjects(500, i, 'public');
          thePublicProject = projectList.records.filter(p => p.name === 'Reference files for the miRNA profiler package')[0];
          if (thePublicProject) { break; }
        }
      }
      if (thePublicProject) {
        thePublicProject = await BdpAPI.getProjectInfo(thePublicProject.id);
      } else {
        thePublicProject = null;
      }
      this.thePublicProject = thePublicProject;
    },
    checkReference: function(referenceFiles) {
      const validTags = [['biomart'], ['genome', 'annotation'], ['target-scan', 'reference'], ['Folder', 'genome', 'indexed', 'bwa'], ['kegg-pathway']];
      for (let j = 0; j < validTags.length; j ++) {
        const requiredTags = validTags[j];
        let referenceExists = false;
        for (let i = 0; i < referenceFiles.length; i ++) {
          const eachDF = referenceFiles[i];
          const theTags = [...new Set(eachDF.tags)];
          const matchedTagLength = theTags.map(tag => requiredTags.indexOf(tag) >= 0 ? 1 : 0).filter(t => t === 1).length;
          if (matchedTagLength === requiredTags.length) {
            referenceExists = true;
            continue;
          }
        }
        if (!referenceExists) { return false; }
      }
      return true;
    },
    checkReferencePublished: async function() {
      if (!this.thePublicProject || !this.thePublicProject.dataFiles) { return; }
      const dataFiles = this.thePublicProject.dataFiles;
      console.log(dataFiles);
      const validReferences = dataFiles.filter(df => df.suffix === '_miRNA_Reference' && df.status === 1);
      const humanReferences = validReferences.filter(df => df.prefix === 'Human_');
      const mouseReferences = validReferences.filter(df => df.prefix === 'Mouse_');
      console.log(mouseReferences);
      this.orgRefPublished = {
        mouse: this.checkReference(mouseReferences),
        human: this.checkReference(humanReferences)
      };
      console.log(this.orgRefPublished);
    },
    refresh: async function() {
      await this.updateResults();
      await this.getThePublicProject();
      let dataFiles = [];
      if (this.thePublicProject) {
        dataFiles = this.thePublicProject.dataFiles.filter(df => df.status < 2 && !df.parent && !df.hidden);
      }
      const isReferenceExported = {};
      this.preparedReferences.forEach((eachResult) => {
        let existed = 0;
        let prepared = 0;
        for (let i = 8; i < 13; i ++) {
          const argValue = eachResult.arguments[i].value;
          for (let j = 0; j < dataFiles.length; j ++) {
            const theDataFile = dataFiles[j];
            if (argValue.prefix === theDataFile.prefix && argValue.suffix === theDataFile.suffix && argValue.name === theDataFile.name) {
              if (theDataFile.status === 0) {
                prepared ++;
              } else {
                existed ++;
              }
              continue;
            }
          }
          if (!existed) {
            // console.log(argValue.prefix + argValue.name + argValue.suffix);
          }
        }
        isReferenceExported[eachResult.id] = existed + prepared === 5 ? (prepared === 0 ? 2 : 1) : 0;
      });
      this.isReferenceExported = isReferenceExported;
      await this.checkReferencePublished();
    },
    exportToPublicProject: async function(r) {
      await this.getThePublicProject();
      if (!this.thePublicProject) {
        this.thePublicProject = await BdpAPI.createProject('Reference files for the miRNA profiler package', `This project is used to store reference files for the miRNA profiler. 
            Please do NOT change the project name! We used the project name 'Reference files for the miRNA profiler package to store required reference files.`, [], true);
      } else {
        this.thePublicProject = await BdpAPI.getProjectInfo(this.thePublicProject.id);
      }
      const dataFiles = this.thePublicProject.dataFiles.filter(df => df.status = 1 && !df.parent && !df.hidden);
      const importedIDs = [];
      for (let i = 8; i < 13; i ++) {
        const argValue = r.arguments[i].value;
        let existed = false;
        for (let j = 0; j < dataFiles.length; j ++) {
          const theDataFile = dataFiles[j];
          if (argValue.prefix === theDataFile.prefix && argValue.suffix === theDataFile.suffix && argValue.name === theDataFile.name) {
            existed = true;
            continue;
          }
        }
        if (!existed) {
          importedIDs.push(argValue.id);
        }
      }
      console.log(importedIDs);
      if (importedIDs.length > 0) {
        await BdpAPI.importFilesToProject(this.thePublicProject.id, importedIDs, true);
      }
      this.isReferenceExported = Object.assign(this.isReferenceExported, { [r.id]: 1});
      await this.refresh();
    },
    updateResults: async function() {
      const results = await BdpAPI.listResults();
      this.preparedReferences = results.filter(r => r.task && r.task.key === 'prepare-reference').reverse();
    },
    updateJobStatus: function(status) {
      switch (status) {
        case 0: // queued
          taskExeFooter.innerHTML = formulateStatus(0);
        break;
        case 1: // running
          taskExeFooter.innerHTML = formulateStatus(1);
          $('#stopBtn').attr('disabled', false);
        break;
        case 2:
          taskExeFooter.innerHTML = formulateStatus(2);
          enableOrgSelection();
          $('#stopBtn').attr('disabled', true);
        break;
        case 3:
          taskExeFooter.innerHTML = formulateStatus(3);
          enableOrgSelection();
          $('#stopBtn').attr('disabled', true);
          // $('#taskExeMsgDiv').hide(100);
          // $('#selectContainer').CardWidget('expand');
        break;
        case 4:
          taskExeFooter.innerHTML = formulateStatus(4);
          enableOrgSelection();
          $('#stopBtn').attr('disabled', false);
        break;
      }
    },
    watchResultChangeHandler: function(updatedResult) {
      const currentResult = this.theCurrentResult;
      if (!currentResult) { return; }
      if (updatedResult.data.id !== currentResult.id) { return; }
      if (this.isStopping && updatedResult.data.status !== 2) {
        this.isStopping = false;
      }
      this.updateJobStatus(updatedResult.data.status);
    },
    watchResultMsgChangeHandler: function(resultOutput) {
      const currentResult = this.theCurrentResult;
      if (!currentResult) { return; }
      if (resultOutput.data.resultId !== currentResult.id) { return; }
      console.log(resultOutput);
      if (resultOutput.type === 'stdOut') {
        this.stdoutText = resultOutput.data.content;
      } else if (resultOutput.type === 'stdErr') {
        this.stderrText = resultOutput.data.content;
      }
    },
    downloadRef: async function() {
      if (this.isRunning) { return; }
      if (!this.currentPkgInfo) { return; }
      this.isRunning = true;
      let inputs = [], resultPrefix = '', resultSuffix = '_miRNA_Reference';
      if (this.selectedOrg === 'mouse') {
        inputs = ['null', 'mmu', 'mm10', '25', 'ENSEMBL_MART_ENSEMBL', 'mmusculus_gene_ensembl', 'apr2020.archive.ensembl.org', null, null, null, null, null, null];
        resultPrefix = 'Mouse';
      } else if (this.selectedOrg === 'human') {
        inputs = ['null', 'hsa', 'hg38', '35', 'ENSEMBL_MART_ENSEMBL', 'hsapiens_gene_ensembl', 'apr2020.archive.ensembl.org', null, null, null, null, null, null];
        resultPrefix = 'Human';
      } else {
        return;
      }
      this.stdoutText = '';
      this.stderrText = '';
      this.taskExeFooter = `Preparing reference files for the <b>${resultPrefix}</b> organism.`;
      this.theCurrentResult = await BdpAPI.executeTask('prepare-reference', this.currentPkgInfo.id, {
        name: 'Prepared Reference Files',
        desc: 'Executed via Project Page',
        prefix: resultPrefix + '_',
        suffix: resultSuffix
      }, inputs, []);
      for (let i = 0; i < this.theCurrentResult.outFiles.length; i ++) {
        const eachDF = this.theCurrentResult.outFiles[i];
        if (eachDF.tags.indexOf(selectedOrg) < 0) {
          eachDF.tags.push(selectedOrg);
        }
        await BdpAPI.updateFileInfo(eachDF.id, {tags: eachDF.tags});
      }
      console.log(this.theCurrentResult.arguments);
      setTimeout(() => {
        $('#selectContainer').CardWidget('collapse');
        $('#taskExeMsgDiv').delay(400).show(350);
      });
    }
  }
});

(async () => {
  await BdpAPI.initialize();
  await vueInstance.initialize();
  // const currentUser = await BdpAPI.getCurrentUserInfo();
  BdpAPI.watchResultMsgChange(resultOutput => vueInstance.watchResultMsgChangeHandler(resultOutput));
  BdpAPI.watchResultChange(updatedResult => vueInstance.watchResultMsgChangeHandler(updatedResult));
  // const projectResults = results.filter(r => r.suffix === '_miRNA_Reference');
  setInterval(() => {
    vueInstance.refresh().catch(console.log);
  }, 7000);
})().catch(console.log);