Vue.use(VueMaterial.default);
$('#pageTitle').text('Execute Pipeline');
const sortDataFileByCreatedAt = (a, b) => (new Date(b.createdAt)).valueOf() - (new Date(a.createdAt)).valueOf();

const secondaryProcess = new Vue({
  el:'#formSecondaryProcess',
  data:{
    thePublicProject: null,
    refFromPublicProject: false,
    backToProjectInfo:'noResult',
    active: 'selFileName',
    selFileName:false,
    sequenceFolder:false,
    species: false,
    speciesData:false,
    finishSpeciesForm:false,
    // stepName
    theCurrentFileID:'',
    speciesSelID: 'Mouse',
    packageId:'',
    currentProjectFile:false,
    // import Data
    // v-if
    rawSeqFile:[],
    selectedSeqFolderObj: null,
    selectprojectFile: null,
    theDatabaseNameForMiRBase:'',
    theSpeciesShortNameForMiRBase:'',
    theUCSCGenomeShortName:'',
    theReferenceFolder: '',
    targetScanReferenceFile: '',
    theKEGGPathwayFile: '',
    theGenomeAnnotationFile: '',
    theBiomaRtAnnotationTable: '',
    // tags filter
    quantileValue:1,
    amountValue: 0.01,
    absoluteAmountValue:2,
    activeBtn:'notRemove',
    adapterSequence:'',
    removeRNAspeciesValue:'',
    // remove miRNA value
    excuteTaskPrefix:'',
    excuteTaskSuffix:'',
    excuteTaskName:'',
    excuteTaskDesc:'',
  },
  methods: {
    openFileLink: async (fileID) => BdpAPI.initialized && await BdpAPI.openFileLink(fileID),
    navigateToProjectPage: async (pageKey) => {
      return BdpAPI.initialized && await BdpAPI.navigateToProjectPage(pageKey);
    },
    navigateToFilePage: async (pageKey, fileID) => {
      return BdpAPI.initialized && await BdpAPI.navigateToFilePage(pageKey, fileID);
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
    selFileDone:async function(currentDone,next){
      console.log(this.theCurrentFileID)
      const excelBlob = await BdpAPI.getFileBlob(this.theCurrentFileID);
      const arrBuff = await BdpPageUtils.readFileBlob(excelBlob, 'binaryString');
      // console.log(arrBuff)
      let workbook=XLSX.read(arrBuff, {type: "binary"});
      const caseInfo = XLSX.utils.sheet_to_json(workbook.Sheets['Case info'], {header: 1});
      let foldID;
      if (caseInfo[11]) {
        foldID = caseInfo[11][1];
      }
      if (foldID === undefined) {
          this.backToProjectInfo = 'noResult';
      } else {
        const files = (await BdpAPI.listFiles()).filter(df => df.status === 1);
        const selectFold = files.filter(filterFile=> filterFile.tags.indexOf('raw-sequences')>=0 && filterFile.tags.indexOf('Folder')>=0  && filterFile.id === foldID)[0];
        if (selectFold) {
          this.backToProjectInfo = 'seqFold';
          this.selectedSeqFolderObj = selectFold;
        } else {
          this.backToProjectInfo = 'noResult';
        }  
      }
      // 
      this[currentDone] = true;
      if (next) {
      this.active = next
      }
    },
    selectNeedList: function(currentDone,next){
        this[currentDone] = true;
        if (next) {
          this.active = next;
        }
    },
    speciesDone: async function(currentDone,next) {
      await this.selectSpecies('Mouse');
      this[currentDone] = true
      if (next) {
        this.active = next
      }
    },
    getValidFiles: function(dataFiles) {
      const validFiles = dataFiles.filter(df => df.prefix === this.speciesSelID + '_' && df.suffix === '_miRNA_Reference' && df.status === 1);
      return {
        theReferenceFolder: validFiles.filter(filterFile => filterFile.tags.indexOf('Folder') >= 0 && filterFile.tags.indexOf('genome') >= 0 
          && filterFile.tags.indexOf('indexed') >= 0 && filterFile.tags.indexOf('bwa') >= 0).sort(sortDataFileByCreatedAt)[0],
        targetScanReferenceFile: validFiles.filter(filterFile => filterFile.tags.indexOf('target-scan') >= 0 && filterFile.tags.indexOf('reference') >= 0).sort(sortDataFileByCreatedAt)[0],
        theKEGGPathwayFile: validFiles.filter(filterFile => filterFile.tags.indexOf('kegg-pathway') >= 0).sort(sortDataFileByCreatedAt)[0],
        theGenomeAnnotationFile: validFiles.filter(filterFile => filterFile.tags.indexOf('genome') >= 0 && filterFile.tags.indexOf('annotation') >=0).sort(sortDataFileByCreatedAt)[0],
        theBiomaRtAnnotationTable: validFiles.filter(filterFile => filterFile.tags.indexOf('biomart') >= 0).sort(sortDataFileByCreatedAt)[0]
      }
    },
    resetRefFiles: function() {
      this.theReferenceFolder = '';
      this.targetScanReferenceFile = '';
      this.theKEGGPathwayFile = '';
      this.theGenomeAnnotationFile = '';
      this.theBiomaRtAnnotationTable = '';
    },
    selectSpecies: async function(species) {
      this.resetRefFiles();
      const files = (await BdpAPI.listFiles()).filter(df => df.status < 2);
      this.speciesSelID = species;
      const requiredFiles = this.getValidFiles(files);
      this.theDatabaseNameForMiRBase = 'mirna_22b';
      this.theSpeciesShortNameForMiRBase = this.speciesSelID === 'Mouse' ? 'mmu' : (this.speciesSelID === 'Human' ? 'hsa' : '');
      this.theUCSCGenomeShortName = this.speciesSelID === 'Mouse' ? 'mm10' : (this.speciesSelID === 'Human' ? 'hg38' : '');
      this.refFromPublicProject = false;
      
      if (!requiredFiles.theReferenceFolder || !requiredFiles.targetScanReferenceFile || !requiredFiles.theKEGGPathwayFile || !requiredFiles.theGenomeAnnotationFile || !requiredFiles.theBiomaRtAnnotationTable) {
        await this.getThePublicProject();
        if (!this.thePublicProject) { return; }
        const requiredFilesInPublic = this.getValidFiles(this.thePublicProject.dataFiles);
        if (!requiredFiles.theReferenceFolder && requiredFilesInPublic.theReferenceFolder) {
          this.theReferenceFolder = (await BdpAPI.importFilesToProject(currentProject.id, [requiredFilesInPublic.theReferenceFolder.id]))[0];
        }
        if (!requiredFiles.targetScanReferenceFile && requiredFilesInPublic.targetScanReferenceFile) {
          this.targetScanReferenceFile = (await BdpAPI.importFilesToProject(currentProject.id, [requiredFilesInPublic.targetScanReferenceFile.id]))[0];
        }
        if (!requiredFiles.theKEGGPathwayFile && requiredFilesInPublic.theKEGGPathwayFile) {
          this.theKEGGPathwayFile = (await BdpAPI.importFilesToProject(currentProject.id, [requiredFilesInPublic.theKEGGPathwayFile.id]))[0];
        }
        if (!requiredFiles.theGenomeAnnotationFile && requiredFilesInPublic.theGenomeAnnotationFile) {
          this.theGenomeAnnotationFile = (await BdpAPI.importFilesToProject(currentProject.id, [requiredFilesInPublic.theGenomeAnnotationFile.id]))[0];
        }
        if (!requiredFiles.theBiomaRtAnnotationTable && requiredFilesInPublic.theBiomaRtAnnotationTable) {
          this.theBiomaRtAnnotationTable = (await BdpAPI.importFilesToProject(currentProject.id, [requiredFilesInPublic.theBiomaRtAnnotationTable.id]))[0];
        }
        this.theReferenceFolder = this.theReferenceFolder || requiredFiles.theReferenceFolder || '';
        this.targetScanReferenceFile = this.targetScanReferenceFile || requiredFiles.targetScanReferenceFile || '';
        this.theKEGGPathwayFile = this.theKEGGPathwayFile || requiredFiles.theKEGGPathwayFile || '';
        this.theGenomeAnnotationFile = this.theGenomeAnnotationFile || requiredFiles.theGenomeAnnotationFile || '';
        this.theBiomaRtAnnotationTable = this.theBiomaRtAnnotationTable || requiredFiles.theBiomaRtAnnotationTable || '';
      } else {
        this.theReferenceFolder = requiredFiles.theReferenceFolder || '';
        this.targetScanReferenceFile = requiredFiles.targetScanReferenceFile || '';
        this.theKEGGPathwayFile = requiredFiles.theKEGGPathwayFile || '';
        this.theGenomeAnnotationFile = requiredFiles.theGenomeAnnotationFile || '';
        this.theBiomaRtAnnotationTable = requiredFiles.theBiomaRtAnnotationTable || '';
      }
    },
    setSpeciesData:function(currentDone,next){
        console.log(this.packageId);
        if(this.activeBtn === 'notRemove'){
            this.removeRNAspeciesValue = 0;
        }
        if(this.activeBtn === 'globalMean'){
            this.removeRNAspeciesValue = -1;
        }
        if(this.activeBtn === 'quantile'){
            this.removeRNAspeciesValue = parseFloat(this.amountValue);
        }
        if(this.activeBtn === 'absoluteCutoff'){
            this.removeRNAspeciesValue = parseInt(this.absoluteAmountValue);
        }
        this[currentDone] = true
        if (next) {
        this.active = next
        }
    },
    finishSpeciesDone: async function(){
        const thePackage = await BdpAPI.getCurrentPackageInfo();
        // files = (await BdpAPI.listFiles()).filter(df => df.status === 1);
        const theNewResult = await BdpAPI.executeTask('bcgsc-mirna-workflow', thePackage.id, {
            name: this.excuteTaskName, prefix: this.excuteTaskPrefix, suffix: this.excuteTaskSuffix, desc: this.excuteTaskDesc
        }, [
            this.theCurrentFileID,
            this.selectedSeqFolderObj.id,
            this.theReferenceFolder.id,
            this.theDatabaseNameForMiRBase,
            this.theSpeciesShortNameForMiRBase,
            this.theUCSCGenomeShortName,
            this.targetScanReferenceFile.id,
            this.theKEGGPathwayFile.id,
            this.theGenomeAnnotationFile.id,
            this.theBiomaRtAnnotationTable.id,
            this.removeRNAspeciesValue.toString(),
            null,
            null,
            null,
            null,
            null,
            null,
            null,
            this.adapterSequence || ''
        ], []);
        await BdpAPI.navigateToResultPage(theNewResult.id, 'mirna-profiler-result-display');
    },
    
    setReturn:function(returnIndex,index){
        this[index] = false;
        if(returnIndex){
            this.active = returnIndex
        }
    },
    removeValue:function(val){
        this.activeBtn= val;
    },
    backToMakeAnalysisPlan:async function(){
      const currentPkg = await BdpAPI.getCurrentPackageInfo();
      console.log(this.selectprojectFile);
      if (this.selectprojectFile && this.selectprojectFile.id) {
        await BdpAPI.navigateToFilePage(this.selectprojectFile.id, 'prepare-project-info', currentPkg.id);
      } else {
        await BdpAPI.navigateToProjectPage('prepare-project-info', currentPkg.id);
      }
    },
    selectProjectInfo: async function(projectFile, index) {
      this.currentProjectFile = index;
      this.selectprojectFile = projectFile;
      this.theCurrentFileID = projectFile.id;
      this.selFileDone('selFileName', 'sequenceFolder');
    },
    cancelProjectInfoFile: function(){
      this.currentProjectFile =false;
      this.selectprojectFile = null;
      this.selectedSeqFolderObj = null;
      this['sequenceFolder'] = false;
      this['speciesData'] = false;
      this['finishSpeciesForm'] = false;
    }
  },
  watch:{
    amountValue: function(val){
      floatVal = parseFloat(val);
      if(Number.isNaN(floatVal) || floatVal < 0 || floatVal >= 1) {
        if (val === '0.') {
          this.amountValue = '0.';
        } else {
          this.amountValue = 0.01;
        }
      } else {
        this.amountValue = val;
      }

    },
    absoluteAmountValue:function(val){
      val = parseInt(val);
      if(Number.isNaN(val) || val <= 1){
        this.absoluteAmountValue = 1;
      } else {
        this.absoluteAmountValue = val;
      }
    }
  },
  computed:{
      confirmDataDisabled: function(){
          return !(this.excuteTaskName && this.selectedSeqFolderObj && this.selectprojectFile && this.speciesSelID);
      }
  }   
});
let currentPkg;
let currentProject;
const BdpAPI = new BdpPageAPI();
(async()=>{
  await BdpAPI.initialize();
  const theCurrentFile = await BdpAPI.getCurrentFileInfo();
  currentPkg = await BdpAPI.getCurrentPackageInfo();
  currentProject = await BdpAPI.getCurrentProjectInfo();
  secondaryProcess.packageId = currentPkg.id
  if(theCurrentFile === null){
    secondaryProcess.theCurrentFileID ='';
  }else{
    secondaryProcess.theCurrentFileID = theCurrentFile.id;
    secondaryProcess.file = theCurrentFile
  }
  const files = (await BdpAPI.listFiles()).filter(df => df.status === 1);
  secondaryProcess.rawSeqFile = await files.filter(filterFile=>filterFile.tags.indexOf('project-info')>=0).sort((a,b)=>(new Date(b.createdAt)).valueOf()-(new Date(a.createdAt)).valueOf());
  for (let index = 0; index < secondaryProcess.rawSeqFile.length; index ++) {
    let projectFile = secondaryProcess.rawSeqFile[index];
    if (projectFile.id === secondaryProcess.theCurrentFileID) {
      secondaryProcess.selectProjectInfo(projectFile, index);
      break;
    }
  }
})().catch((err)=>{
    console.log(err)
});
