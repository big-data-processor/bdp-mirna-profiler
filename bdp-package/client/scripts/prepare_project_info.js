$('#pageTitle').text('Prepare your analysis plan');
Vue.use(VueMaterial.default);
const stepSampleTemplate = {
  template:'#stepSampleTemplate',
  
  props:['path','libid','name','check-data'],
  data:function(){
    return{
      dataPath : this.path,
      dataLibid : this.libid,
      dataFileName : this.name,
      dataCheck: this.checkData,
      checkDataAllSel: false,
      // selData:[],
      // dataCheck:this.checkData,
      // checkDataAllSel:true,
    }
  },
  watch: {
    dataLibid: function(newValue) {
      if (newValue) {
        newValue = newValue.toString().trim().replace(/ /g, '_').replace(/[^0-9A-Za-z]/g, '_');
      }
      this.dataLibid = newValue;
      this.$emit('data-change', {
        target: 'libid',
        value: this.dataLibid
      });
    },
    dataFileName: function(newValue) {
      if (newValue) {
        newValue = newValue.toString().trim().replace(/ /g, '_').replace(/[^0-9A-Za-z]/g, '_');
      }
      this.dataFileName = newValue;
      this.$emit('data-change', {
        target: 'name',
        value: this.dataFileName
      });
    },
    dataCheck:function(){
      this.$emit('data-change',{
        target:'checkData',
        value:this.dataCheck
      })
    },
    checkData: function(value) {
      this.dataCheck = value;
    }
    // checkDataAllSel:function(){

    // }
  }
}
const step = new Vue({
  el:'#step',
  data:{
    active: 'caseInfo',
    caseInfo: false,
    typeOfSample:false,
    samples: false,
    sampleInfo: false,
    contrasts:false,
    saveFile:false,
    finishForm:false,
    currentProjectInfoRecord: null,
    // 
    bdpLevel:'',
    title:'miRNA-seq Analysis Report',
    libid:'',
    userName:'',
    customer:'',
    selectedDate: Date.now(),
    institute:'',
    phone:'',
    positiveFCutoff: 1,
    negativeFCutoff: -1,
    pValue:0.05,
    referenceGenome:'',
    annotations:'',
    errorSamplesData:false,
    warnPos:false,
    warnNeg:false,
    warnPvalue:false,
    errorData:false,
    errorSampleType:false,
    
    sampleInfoError:false,
    severPath:'',
    beforeSamples:[],
    beforeSampleInfo:[],
    beforeContrasts:[],
    uploadProgress: -1,
    // 
    folderDisappear:'',

    importMode: '', // select | upload | import
    fileListToBeUploaded: null, // File list to be uploaded, when importMode === 'upload'

    current:false,
    setTypedisabled:true,
    
    validDataFiles: [],
    severWebsite:'',
    // folderDesc:'',
    // folderTags: [],
    // checkDataAllSel:false,
    // samplesSel:false,
    sampleinfoType:'single-read',
    projectInfoName:'',
    serveImportDesc:false,
    currentProject: 'Vue Material',
    condition:[],
    // secondary
    selectedSeqFolderObj: null,
    prevSelectedFolderId: '',
    
    sampleBasicInformation:{
      name:'',
      prefix:'',
      suffix:'',
      tags:['Folder','raw-sequences'],
      desc:'',
      format:'',
    },
    severContinue:false,
    samplesDataInput: [
      /*
      {
        path:'123',
        libid:'xc',
        name:'ss',
        checkData:
      },
      */
    ],
    samplesFilter:[],
    samplesSaveSheet:[],
    sampleInfoInput: [
      {
        batch: 1,
      }
    ],
    sampleInfoSaveSheet:[],
    contrastsError:false,
    contrastsModel:[
      // {
      //   selconditionA:'',
      //   selconditionB:'',
      // },
    ],
    contrastsSaveSheet: [],
    addContrasts:'',
    SaveFileName:'',
    styletags:[],
    saveFileDescroption:'',
    savePrefix:'',
    saveSuffix:'',
    sampleCondition:[],
    // isAllSelected: false
    workbookNew:[],
    saveFileError:false,
    exportData:{
      id:'',
      name:'',
      prefix:'',
      suffix:'',
      tags:[],
      desc:'',
      updatedAt:'',
      path:'',
    },
    currentPkg:'',
  },
  components:{
    'sampleListLink': stepSampleTemplate,
    // 'contrastsTemplate':stepContrastsTemplate,
  },
  computed: {
    isAllSelected: function() {
      return this.samplesDataInput.filter(item => item.checkData).length === this.samplesDataInput.length;
    }
  },
  methods: {
    openFileLink: function(fileID) {
      if (BdpAPI && BdpAPI.initialized) {
        BdpAPI.openFileLink(fileID);
      }
    },
    navigateToFilePage: async function(fileID, pageKey) {
      return BdpAPI.initialized && await BdpAPI.navigateToFilePage(fileID, pageKey);
    },
    setDone : function(currentStepName, nextStepName) {
      if(!(this.positiveFCutoff >= 0)){
        this.errorData = true;
        setTimeout(()=>{
          document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
        },1100);
        setTimeout(()=>{
          this.errorData = false
        },2000);
        return
      };
      if(this.negativeFCutoff > 0 || this.negativeFCutoff ==''){
        this.errorData = true;
        setTimeout(()=>{
          document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
        },1100);
        setTimeout(()=>{
        this.errorData = false
        },2000);
        return
      };
      if(this.pValue > 1 || this.pValue<0 || this.pValue ==''){
        this.errorData = true;
        setTimeout(()=>{
          document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
        },1100);
        setTimeout(()=>{
          this.errorData = false
        },2000)
        return
      };

      if (this.prevSelectedFolderId) {
        this.selectFolder().then(() => {
          this[currentStepName] = true;
          if (nextStepName) {
            this.active = nextStepName
          }
        }).catch(console.log);
      } else {
        this[currentStepName] = true;
        if (nextStepName) {
          this.active = nextStepName
        };
      }
    },
    setTypeSample:async function(currentStepName, nextStepName) {
      /*
      if (this.selectedSeqFolderObj) {
        this[currentStepName] = true;
        if (nextStepName) {
          this.active = nextStepName;
        }
        return;
      }
      */
      if (this.importMode === 'import') {
        if (!this.severPath) {
          this.errorSampleType = true;
          setTimeout(()=> this.errorSampleType = false, 2000);
          return;
        }
        const sampleTags = this.sampleBasicInformation.tags;
        if (sampleTags.indexOf('raw-sequences') < 0) {
          sampleTags.unshift('raw-sequences');
        }
        if (sampleTags.indexOf('Folder') < 0) {
          sampleTags.unshift('Folder');
        }
        const severInfomation = await BdpAPI.importFileFromPath(this.severPath,true,{
          name:this.sampleBasicInformation.name,
          prefix:this.sampleBasicInformation.prefix,
          suffix:this.sampleBasicInformation.suffix,
          desc:this.sampleBasicInformation.desc,
          tags: this.sampleBasicInformation.tags,
        });
        this.projectInfoName = this.sampleBasicInformation.prefix + this.sampleBasicInformation.name + this.sampleBasicInformation.suffix;
        this.selectedSeqFolderObj = severInfomation;
      } else if (this.importMode === 'upload') {
        if (!this.fileListToBeUploaded || this.fileListToBeUploaded.length === 0) {
          this.errorSampleType = true;
          setTimeout(()=> this.errorSampleType = false, 2000);
          return;
        }
        const sampleTags = this.sampleBasicInformation.tags;
        if (sampleTags.indexOf('raw-sequences') < 0) {
          sampleTags.unshift('raw-sequences');
        }
        if (sampleTags.indexOf('Folder') < 0) {
          sampleTags.unshift('Folder');
        }
        this.setTypedisabled = true;
        const aNewFolder = await BdpAPI.createFolder(this.sampleBasicInformation.name || 'A folder containing raw sequencing files', this.sampleBasicInformation.desc, this.sampleBasicInformation.prefix, this.sampleBasicInformation.suffix, this.sampleBasicInformation.tags);
        await BdpAPI.uploadFiles(this.fileListToBeUploaded, {folderID: aNewFolder.id, keepFileName: true}, (uploadProgressObj) => {
          this.uploadProgress = uploadProgressObj.progress;
        });
        this.setTypedisabled = false;
        this.projectInfoName = aNewFolder.prefix + aNewFolder.name + aNewFolder.suffix;
        console.log(this.projectInfoName);
        this.selectedSeqFolderObj = aNewFolder;
      }
      this.severContinue=true;
      // 
      if(!this.selectedSeqFolderObj){
        this.errorSampleType = true;
        setTimeout(()=> this.errorSampleType = false, 2000);
        return
      };
      // 
      const globFileProject =await BdpAPI.globFilesInFolder(this.selectedSeqFolderObj.id, ['**.fastq.gz', '**.fq.gz']);
      if(globFileProject === null || globFileProject ==='' || globFileProject === undefined){
        this.errorSampleType=true;
        setTimeout(()=>{
          document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
        },1100);
        setTimeout(()=>{
          this.errorSampleType = false;
        },2000)
        return
        // this.errorSampleType = false
      }
      globFileProject.sort();

      // this.samplesDataInput=[];
      const theNewSampleData = globFileProject.map((filepath, index)=>{
        return{
          path: `./${filepath}`,
          libid: this.samplesDataInput[index] !== undefined ? this.samplesDataInput[index].libid : '',
          name: this.samplesDataInput[index] !== undefined ? this.samplesDataInput[index].name : '',
          checkData: this.samplesDataInput[index] !== undefined ? this.samplesDataInput[index].checkData : this.beforeSamples.length === 0,
        }
      });
      this.samplesDataInput = theNewSampleData;
      // this.$set('samplesDataInput')
      if(this.samplesDataInput.length > 0){
        for(let i=0;this.samplesDataInput.length > i;i++){
          for(let j=0;this.beforeSamples.length > j;j++){
            
            if(this.samplesDataInput[i].path === this.beforeSamples[j].path){
              this.samplesDataInput[i].name = this.beforeSamples[j].name;
              this.samplesDataInput[i].libid = this.beforeSamples[j].LIBID;
              this.samplesDataInput[i].checkData = true;
            }
          }
        }
      }
      this[currentStepName] = true;
      if (nextStepName) {
        this.active = nextStepName;
      }
    },
    setSamplesDone:function(currentStepName, nextStepName){
      this.samplesFilter = this.samplesDataInput.filter(filters => filters.checkData);
      for(let i=0;this.samplesFilter.length>i;i++){
        if(this.samplesFilter[i].name === '' ||this.samplesFilter[i].name === null ||this.samplesFilter[i].name === 'undefined'){
          this.errorSamplesData = true;
          setTimeout(()=>{
            document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
          },1100);
          setTimeout(() => {
            this.errorSamplesData = false
          }, 2000);
          return
        }
        if(this.samplesFilter[i].libid === ''|| this.samplesFilter[i].libid === null ||this.samplesFilter[i].name === 'undefined'){
          setTimeout(()=>{
            document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
          },1100);
          setTimeout(() => {
            this.errorSamplesData = false
          }, 2000);
          return
        }
      }
      const sampleNames = this.samplesFilter.map(d => d.name);
      // this.sampleInfoInput = [];
      const newSampleInfoInput = [];
      const uniqueSampleNames = [...new Set(sampleNames)]; 
      for (let i = 0; i < uniqueSampleNames.length; i ++) {
        newSampleInfoInput[i] = {
          name: uniqueSampleNames[i],
          condition: this.sampleInfoInput[i] ? this.sampleInfoInput[i].condition : (this.condition[0] !== undefined ? this.condition[0] : ''),
          batch: this.sampleInfoInput[i] ? this.sampleInfoInput[i].batch : 1
        };
      }
      console.log(this.sampleInfoInput);
      console.log(newSampleInfoInput);
      if(this.beforeSampleInfo.length > 0){
        let saveCondition=[]
        for(let i=0;this.beforeSampleInfo.length>i ; i++){
          for(let j=0;newSampleInfoInput.length>j ; j++){
            if(newSampleInfoInput[j].name === this.beforeSampleInfo[i].name){
              saveCondition.push(this.beforeSampleInfo[i].condition);
              newSampleInfoInput[j].condition = this.sampleInfoInput[j] && this.sampleInfoInput[j].condition !== undefined ? this.sampleInfoInput[j].condition : this.beforeSampleInfo[i].condition;
              newSampleInfoInput[j].batch = this.sampleInfoInput[j] && this.sampleInfoInput[j].batch ? this.sampleInfoInput[j].batch : this.beforeSampleInfo[i].batch
            }
          }
        }
        this.condition = [...new Set(this.beforeSampleInfo.map(bsi => bsi.condition))];
      }
      this.sampleInfoInput = newSampleInfoInput;
      this[currentStepName] = true;
      if (nextStepName) {
        this.active = nextStepName;
      }
    },
    setSampleInfo:function(currentStepName, nextStepName){
      let saveCondition  = [];
      for(let i=0 ; this.sampleInfoInput.length > i ; i++){
        saveCondition.push(this.sampleInfoInput[i].condition);
      }
      for(let i=0 ; saveCondition.length > i ;i++){
        if(saveCondition[i] === undefined || saveCondition[i] === null || saveCondition[i] === ''){
          this.sampleInfoError = true;
          setTimeout(()=>{
            document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
          },1100);
          setTimeout(() => {
            this.sampleInfoError = false;
          }, 2000);
          return
        }
      }
      this.sampleCondition = [...new Set(saveCondition)];
      console.log(this.sampleCondition);
      // let savebeforeContrasts = [];
      // console.log(this.beforeContrasts.length);
      // for(let j=0 ; this.beforeContrasts.length > j ; j++){
      //   savebeforeContrasts.push(this.beforeContrasts[j][0],this.beforeContrasts[j][1]) 
      // }
      // let newSetbeforeContrasts = [...new Set(savebeforeContrasts)]
      // remove undefined
      // const beforeContrastsFile = newSetbeforeContrasts.filter(n => n)
      const newContrastsModels = [];
      if(this.beforeContrasts.length > 0){
        for (let i=0 ; i < this.sampleCondition.length; i++) {
          for (let j = 0; j < this.sampleCondition.length; j++) {
            for (let k = 0; k < this.beforeContrasts.length; k++) {
              if(this.beforeContrasts[k][0] === this.sampleCondition[i] && this.sampleCondition[j] === this.beforeContrasts[k][1]){
                newContrastsModels.push({
                  selconditionA:this.beforeContrasts[k][0],
                  selconditionB:this.beforeContrasts[k][1],          
                })
              }
            }
          }
        }
      }
      for (let i = 0; i < this.contrastsModel.length; i ++) {
        let exists = false;
        for (let j = 0; j < newContrastsModels.length; j ++) {
          if (this.contrastsModel[i].selconditionA === newContrastsModels[j].selconditionA && this.contrastsModel[i].selconditionB === newContrastsModels[j].selconditionB) {
            exists = true;
            break;
          }
        }
        if (!exists) {
          newContrastsModels.push({
            selconditionA: this.contrastsModel[i].selconditionA,
            selconditionB: this.contrastsModel[i].selconditionB
          });
        }
      }
      console.log(newContrastsModels);
      this.contrastsModel = newContrastsModels;
      if (this.contrastsModel.length === 0) {
        this.contrastsModel.push({selconditionA: this.sampleCondition[0] || '', selconditionB: this.sampleCondition[1] || ''});
      }
      console.log(this.contrastsModel);
      this[currentStepName] = true;
      if (nextStepName) {
        this.active = nextStepName;
      }
    },
    setExcelDone:async function(currentStepName,nextStepName){
      for(let i=0 ; this.contrastsModel.length > i ; i++){
        if(this.contrastsModel[i].selconditionA ==='' || this.contrastsModel[i].selconditionB === ''){
          this.contrastsError = true;
          setTimeout(()=>{
            document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
          },1100);
          setTimeout(()=>this.contrastsError = false,2000)
          return
        }
      }
      // 
      workbookNew = XLSX.utils.book_new();  
      const workbookSheetNameOne = "Case info"; 
      const workbookSheetNameTwo = "Samples";
      const workbookSheetNameThree = "Sample info";
      const workbookSheetNameFour="Contrasts";
      const selectedDate = new Date(this.selectedDate);
      const caseInfoSheet = [
        ['Title',this.title],['Institute',this.institute],
        ['Customer',this.customer],['Bioinformatician',this.userName],
        ['PhoneExt',this.phone],['Date', `${selectedDate.toString()}`],
        ['Positive fold-change cutoff',this.positiveFCutoff],['Negative fold-change cutoff',this.negativeFCutoff],
        ['p-value cuttoffs',this.pValue],['Reference genome',this.referenceGenome],
        ['Annotations',this.annotations],
        ['DataFile ID', this.selectedSeqFolderObj.id],
        ['Sequence Folder Name', this.selectedSeqFolderObj.name],
        ['Sequence Folder Description', this.selectedSeqFolderObj.desc]
      ];
      this.samplesSaveSheet = [];
      this.samplesSaveSheet.push(['LIBID','name','path']);
      this.sampleInfoSaveSheet = [];
      this.sampleInfoSaveSheet.push(['name','condition','type','batch'])
      for(let i=0;this.samplesFilter.length>i;i++){
        this.samplesSaveSheet.push(

          [this.samplesFilter[i].libid,
            this.samplesFilter[i].name,
          this.samplesFilter[i].path])
      }
      
      for(let j=0;this.sampleInfoInput.length>j;j++){
        this.sampleInfoSaveSheet.push(
        [this.sampleInfoInput[j].name,
        this.sampleInfoInput[j].condition,
        this.sampleinfoType,
        this.sampleInfoInput[j].batch])
      }
      this.contrastsSaveSheet = [];
      for(let k=0;this.contrastsModel.length>k;k++){
        this.contrastsSaveSheet.push([this.contrastsModel[k].selconditionA,this.contrastsModel[k].selconditionB]);
      }
      // 
      const wsCaseinfo = XLSX.utils.aoa_to_sheet(caseInfoSheet);
      const wsSamples = XLSX.utils.aoa_to_sheet(this.samplesSaveSheet);
      const wsSampleInfo = XLSX.utils.aoa_to_sheet(this.sampleInfoSaveSheet);
      const wsContrasts = XLSX.utils.aoa_to_sheet(this.contrastsSaveSheet);
      XLSX.utils.book_append_sheet(workbookNew, wsCaseinfo, workbookSheetNameOne);
      XLSX.utils.book_append_sheet(workbookNew, wsSamples, workbookSheetNameTwo);
      XLSX.utils.book_append_sheet(workbookNew, wsSampleInfo, workbookSheetNameThree);
      XLSX.utils.book_append_sheet(workbookNew, wsContrasts, workbookSheetNameFour);
      // const wbout = XLSX.write(workbook, {bookType: "xlsx", bookSST: false, type: "array",});
      // console.log(this.projectInfoName)
      // // saveAs(new Blob([wbout], {type: "application/octet-stream",}), this.projectInfoName + ".xlsx");
      // const newFileObj = await bdpAPI.uploadFileBlob(new Blob([wbout]), this.projectInfoName, {
      //   desc: 'Test',
      //   tags: ['project-info', 'abcdefg'],
      //   format: "xlsx",
      //   prefix: 'prefix_',
      //   suffix: '_suffix',
      // });
      // console.log(newFileObj);
      this[currentStepName] = true;
      if (nextStepName) {
        this.active = nextStepName;
      }
    },
    setSaveFile:async function(currentStepName,nextStepName){
      // saveCurrentData();
      if (!this.SaveFileName) {
        this.saveFileError = true;
        setTimeout(()=>{
          try {
            document.querySelector('.errorData').style.cssText="transition:all 1s; opacity:0;"
          } catch(e) {}
        },1100);
        setTimeout(()=>{
          this.saveFileError = false;
        },2000)
        return}
      // console.log(this.SavefileName,this.SavefileDescript)
      // sheetTabs.progressLine = true
      // console.log(this.prefix,this.suffix)
      if (this.styletags.indexOf('project-info') < 0) {
        this.styletags.unshift('project-info');
      }
      // 
      const wbout = XLSX.write(workbookNew, {bookType: "xlsx", bookSST: false, type: "array",});
      const newFileObj = await BdpAPI.uploadFileBlob(new Blob([wbout]), this.SaveFileName, {
        desc:this.saveFileDescroption,
        tags: this.styletags,
        format: "xlsx",
        prefix: this.savePrefix || '',
        suffix: this.saveSuffix || '',
      });
      this.exportData = newFileObj;
      // if (goToNewFileFlag) {
      //   await bdpAPI.navigateToFilePage(newFileObj.id, 'excel-web-app', currentPkg.id);
      // } else {
      //   this.saveAsForm = false;
      // }
      this.currentProjectInfoRecord = null;
      setTimeout(() => {
        document.querySelector('.uploadFadeIn').style.cssText="transition:all 1s ; opacity:1;";
      }, 200);
      this[currentStepName] = true;
      if (nextStepName) {
        this.active = nextStepName;
      }
    },
    finishDone:async function(currentStepName){
      this.currentPkg = await BdpAPI.getCurrentPackageInfo();
      console.log(this.currentPkg.id,this.exportData.id)
      this[currentStepName] = true;
      await BdpAPI.navigateToFilePage(this.exportData.id, 'formsecondary', this.currentPkg.id);
      // await bdpAPI.navigateToProjectPage('formsecondary', this.currentPkg.id);
      console.log(this.exportData)
    },
    toggleSelectAll:function(){
      const allCheckedData = this.samplesDataInput.map(item => item.checkData);
      if (allCheckedData.filter(c => c ? true : false).length > 0) {
        this.samplesDataInput.forEach(item => item.checkData = false);
      } else {
        this.samplesDataInput.forEach(item => item.checkData = true);
      }
    },
    onConditionRemoved: function(condition) {
      this.sampleInfoInput.forEach((d, i) => {
        if (d.condition === condition) {
          d.condition = '';
        }
      });
      this.contrastsModel = this.contrastsModel.filter(c => !(c.selconditionA === condition || c.selconditionB === condition));
    },
    onConditionInserted: function(condition) {
      let formatted = ''
      if (condition) {
        formatted = condition.toString().replace(/[^0-9A-Za-z]/g, '_');
      }
      const theIndex = this.condition.indexOf(condition);
      this.condition.splice(theIndex, 1, formatted);
      if (this.beforeSampleInfo[0] === undefined) {
        for(let i=0; this.sampleInfoInput.length > i ;i++){
          this.sampleInfoInput[i].condition = this.condition[0] || '';
        }
      }
    },
    addCondition: function() {
      const currentInput = $('#conditionMdChips').val();
      const formatted = currentInput.toString().trim().replace(/[^0-9A-Za-z]/g, '_');
      if (this.condition.indexOf(formatted) < 0 && formatted !== '') {
        this.condition.push(formatted);
      }
    },
    updateSamepleData: function(event, index){
      // console.log(event.value);
      // const theValue = event.value ? event.value.toString().replace(/ /g, '').replace(/[^0-9a-zA-Z\-\_]/g, '_') : '';

      // this.$set(this.samplesDataInput[index], 'samplesDataInput', )
      // Vue.set(this.samplesDataInput[index], event.target, event.value);
      this.samplesDataInput[index][event.target] = event.value;
      
      // console.log(this.samplesDataInput[index][event.target])
    },
    selectFolder: async function(){
      this.setTypedisabled = true;
      this.fileListToBeUploaded = null;
      this.importMode = 'select';
      const files = await BdpAPI.listFiles();
      this.validDataFiles = await files.filter(filterFile=>filterFile.tags.indexOf('raw-sequences')>=0 && filterFile.tags.indexOf('Folder')>=0).reverse();
      this.current = false;
      if (this.prevSelectedFolderId) {
        for (let index = 0; index < this.validDataFiles.length; index ++) {
          const eachDF = this.validDataFiles[index];
          if (eachDF.id === this.prevSelectedFolderId) {
            this.toggleFileSelection(eachDF, index);
            break;
          }
        }
      }
      if(this.projectInfoName !==''){
        this.setTypedisabled=false;
      }
    },
  
    toggleFileSelection: function(selectedFolderObj, index) {
      if (this.current !== false) {
        this.current = false;
        this.takeProject({});
      } else {
        this.current = index;
        this.takeProject(selectedFolderObj);
      }
    },
    updateFileListToBeUploaded: function(newFileList) {
      this.fileListToBeUploaded = newFileList;
      this.setTypedisabled = false;
    },

    takeProject: function(selectedFolderObj){
      this.selectedSeqFolderObj = selectedFolderObj;
      if (selectedFolderObj && selectedFolderObj.id) {
        // his.prevSelectedFolderId = selectedFolderObj.id;
      }
      this.projectInfoName = selectedFolderObj.prefix + selectedFolderObj.name + selectedFolderObj.suffix;
      this.setTypedisabled = false;
    },
    addContrastsConditionBtn:function(){
      this.contrastsModel.push({selconditionA:'',selconditionB:''})
    },
    // sampleConditionSel:function(item){
    //   console.log(item)
    // },
    setReturn : function(returnIndex,index) {
      this[index] = false;
      if(returnIndex){
        this.active = returnIndex
      }
    },
    removeContrastCondition : function(num){
      if(this.contrastsModel.length > 1){
        this.contrastsModel.splice(num,1)
      }
    },
    switchContrastCondition: function(index) {
      const theComparison = this.contrastsModel[index];
      if (!theComparison) { return; }
      const selectB = theComparison.selconditionB;
      theComparison.selconditionB = theComparison.selconditionA;
      theComparison.selconditionA = selectB;
    }
  },
  watch:{
    positiveFCutoff : function(value){
      if (value === '') { 
        this.warnPos = true;
        return;
      }
      const NumValue = Number(value);
      if (NumValue >= 0){
        this.warnPos = false;
      } else {
        this.warnPos = true;
      }
    },
    negativeFCutoff : function(value){
      if (value === '') { 
        this.warnPos = true;
        return;
      }
      const NumVaule = Number(value);
      if (NumVaule < 0){
        this.warnNeg = false;
      } else {
        this.warnNeg = true;
      }
    },
    pValue : function(value){
      if (value === '') { 
        this.warnPos = true;
        return;
      }
      const NumValue = Number(value);
      if (NumValue <= 1 && NumValue >= 0){
        this.warnPvalue = false;
      } else {
        this.warnPvalue = true;
      }
    },
    severPath : function(){
      if(this.severPath === '' || this.severPath === null){
        this.setTypedisabled = true;
      }
      else{
        this.setTypedisabled = false;
      }
    },
    /*
    condition : function(newValue){
      for(let i=0; this.sampleInfoInput.length > i ;i++){
        if(this.beforeSampleInfo[0] === undefined){
          this.sampleInfoInput[i].condition = this.condition[0] || '';
        }
        
      }
    },
    */
  },
});
const BdpAPI = new BdpPageAPI();
(async()=>{
  await BdpAPI.initialize();
  $('#toggleFullPageBtn').click(async function() {
    await BdpAPI.toggleFullPage();
  });
  $('#togglePageListBtn').click(async function() {
    await BdpAPI.togglePageList();
  });
  $('#refreshPageBtn').click(async function() {
    await BdpAPI.refreshPage();
  });
  const theCurrentFile = await BdpAPI.getCurrentFileInfo();
  console.log(theCurrentFile);
  if (theCurrentFile) {
    step.currentProjectInfoRecord = theCurrentFile;
    const excelBlob = await BdpAPI.getFileBlob(theCurrentFile.id);
    // console.log(excelBlob);
    const arrBuff = await BdpPageUtils.readFileBlob(excelBlob, 'binaryString');
    workbook = XLSX.read(arrBuff, {type: "binary"});
    // console.log(workbook.Sheets['Case info']);
    const caseInfo = XLSX.utils.sheet_to_json(workbook.Sheets['Case info']);
    const samplesSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Samples']);
    const SampleInfoSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Sample info']);
    const contrastsSheet = XLSX.utils.sheet_to_json(workbook.Sheets['Contrasts'], {header: 1});
    const basicData = []
    for(let i=0; caseInfo.length>i;i++){
      basicData.push(Object.values(caseInfo[i])[1])
    }
    // console.log(basicData)
    step.institute = basicData[0] || 'MMRC, Chang-Gung University';
    step.customer = basicData[1] || 'Someone';
    // step.userName = basicData[2];
    step.phone = basicData[3];
    // console.log(basicData[4]);
    // console.log(new Date(basicData[4]));
    step.selectedDate = basicData[4] ? Date.parse(basicData[4]) : new Date();
    step.positiveFCutoff = basicData[5] || 2;
    step.negativeFCutoff = basicData[6] || -2;
    step.pValue = basicData[7] || 0.05;
    step.referenceGenome = basicData[8];
    step.annotations = basicData[9];
    step.beforeSamples = samplesSheet;
    step.beforeSampleInfo = SampleInfoSheet;
    step.beforeContrasts = contrastsSheet;
    step.prevSelectedFolderId = basicData[10] || null;
    // console.log(step.beforeContrasts)
  }
  const currentUser =await BdpAPI.getCurrentUserInfo();
  step.userName = currentUser.name;
  step.bdpLevel = currentUser.auths.bdp;
  // const importNewFile = await bdpAPI.importFileFromPath('/lustre_work/stripe_folder/bdp/bdp-data/5f15453a3447b9fc31dd3bbc/5f1546733447b9fc31dd3bc5',true, {tags: ['Folder', 'raw-sequences']});
  // console.log(importNewFile);
  // console.log(step.beforeSamples)
})().catch((err)=>{
  console.log(err)
})