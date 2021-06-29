$('#pageTitle').text('List of your analysis plans');
let projectInfoList = [];
let projectInfo2Results = {};
let projectInfo2RawSeqDataFile = {};
let table;
let colNum;
let pipelineResultList;
let currentPkg;
const BdpAPI = new BdpPageAPI();
const getDataFileFromArgValue = (argValue, fileList) => argValue.id ? fileList.filter(df => df.id === argValue.id)[0] : fileList.filter(df => df.path === argValue)[0];
const refreshData = async function() {
  const fileList = await BdpAPI.listFiles();
  const resultList = await BdpAPI.listResults();
  projectInfoList = fileList.filter(file=> file.tags.indexOf('project-info')>=0);
  const rawSeqList = fileList.filter(file=> file.tags.indexOf('raw-sequences') >=0 && file.tags.indexOf('Folder') >= 0);
  projectInfo2Results = {};
  pipelineResultList = resultList.filter(r => r.task.key === 'bcgsc-mirna-workflow');
  for (let i = 0; i < pipelineResultList.length; i ++) {
    const eachResult = pipelineResultList[i];
    const theDataFile = getDataFileFromArgValue(eachResult.arguments[0].value, projectInfoList);
    if (theDataFile) {
      if (!Array.isArray(projectInfo2Results[theDataFile.id])) {
          projectInfo2Results[theDataFile.id] = [];
      }
      projectInfo2Results[theDataFile.id].push(eachResult);
      const rawSeqFolder = getDataFileFromArgValue(eachResult.arguments[1].value, rawSeqList);
      projectInfo2RawSeqDataFile[theDataFile.id] = rawSeqFolder;
    }
  }
  for (let i = 0; i < projectInfoList.length; i ++) {
    const eachAnalysisPlan = projectInfoList[i];
    if (!projectInfo2Results[eachAnalysisPlan.id] || projectInfo2Results[eachAnalysisPlan.id].length === 0) {
      const excelBlob = await BdpAPI.getFileBlob(eachAnalysisPlan.id);
      const arrBuff = await BdpPageUtils.readFileBlob(excelBlob, 'binaryString');
      try {
        const workbook = XLSX.read(arrBuff, {type: "binary"});
        const caseInfo = XLSX.utils.sheet_to_json(workbook.Sheets['Case info'], {header: 1});
        const rawSeqId = caseInfo[11][1];
        const rawSeqFolder = rawSeqList.filter(df => df.id === rawSeqId)[0];
        if (rawSeqFolder) {
          projectInfo2RawSeqDataFile[eachAnalysisPlan.id] = rawSeqFolder;
        }
      } catch(err) {
        projectInfo2RawSeqDataFile[eachAnalysisPlan.id] = null;
      }
    }
  }
  if (pipelineResultList.length === 0) {
    
  }
};
const expandTR = function(){
  const tr = $(this).closest('tr');
  const row = table.row(tr);
  
  // row.child(generateResultListHTML(row.data())).show();
  // row.child(childTable).show();
  // 
  const relatedResults =  projectInfo2Results[row.data().id];
  tr.addClass('shown');
  if (!relatedResults) {return;}
  // child
  const childTable = $('<table class="display m-auto border" width="96%"></table>');
  const expandedTDcontent = $(`<div class="bg-light" style='border-bottom: 2px solid black font-size: 14px;'><i class='fas fa-angle-right mr-2 ml-4'></i>Results generated from this plan:</div>`);
  expandedTDcontent.append(childTable);
  row.child(expandedTDcontent).show();
  childTable.DataTable({
    dom:'<<t>p>',
    info:false,
    data:relatedResults,
    paging: relatedResults.length > 5,
    pagingType:'numbers',
    pageLength: 5,
    order:[2,'desc'],
    columns: [
      { 
        title: 'Result Name',
        className:'resultNameStyle',
        data:function(resultData){
            return `<td data-title ="${resultData.prefix}${resultData.name}${resultData.suffix}">
                        <i class='far fa-folder-open fa-fw mr-2'></i>
                        <u >${resultData.prefix}</u>${resultData.name}<u>${resultData.suffix}</u>
                    </td>`
        }
      },
      { 
        title: 'Status',
        className:'text-center',
        data:function(resultData){
            const statusNum = resultData.status;
            if(statusNum === 0){
                return `<span><i class="fas fa-hourglass-half text-info"></i>
                <span style="display:none">0</span></span>`
            }
            else if(statusNum === 1){
                return `<span><i class="fas fa-circle-notch fa-spin text-primary"></i>
                <span style="display:none">1</span></span>`
            }
            else if(statusNum === 2){
                return `<span><i class="fas fa-check text-success"></i>
                <span style="display:none">2</span></span>`
            }
            else if(statusNum === 3){
                return `<span><i class="fas fa-times text-danger"></i>
                <span style="display:none">3</span></span>`
            }
            else{
                return `<span><i class="fas fa-trash-alt text-warning"></i>
                <span style="display:none">4</span></span>`
            }
        }
      },
      { 
        title: 'Creation Time',
        className:'timeStyle',
        data:function(resultData){
            const timeNum = new Date(resultData.createdAt).valueOf();
            return `<div class="timeTitle d-flex justify-content-center">
                <div class="timeWidth">
                    <span><small>${moment(timeNum).format("h:mm:ss A MMM D, y")}</small></span>
                </div><div>`
        }
      },
      {   
        title: 'Controls',
        className: 'fnStyle text-center',
        orderable: false,
        data: function(resultData){
          return `<td class="btnDisplay">
              <div class="d-flex justify-content-center">
                  <button class="btn btn-outline-primary py-0 px-1 openProjectInfoResultPage btnSize"  data-toggle="tooltip"  
                      title="Open the result record" data-result_value="${resultData.id}">
                      <i class="fas fa-external-link-alt btnImgXS" style="font-size:16px;"></i>
                      <i class="fas fa-external-link-alt btnImgLg" style="font-size:24px;"></i>
                  </button>
                  <button class="btn btn-outline-success py-0 px-1 gotoResultPageLink btnSize ml-1 mr-1" data-toggle="tooltip"  title="View this result page" 
                      data-value="${resultData.id}">
                      <i class="fas fa-poll-h btnImgXS" style="font-size:18px;"></i>
                      <i class="fas fa-poll-h btnImgLg" style="font-size:28px; margin-top:1px;"></i>
                  </button>
                  <button class="btn btn-outline-danger py-0 px-1 btnSize" data-value="${resultData.id}" 
                      data-name="${resultData.prefix}${resultData.name}${resultData.suffix}"
                      data-toggle="modal" title="Remove this result"
                      data-target="#deleteResultModal">
                      <i class="fas fa-trash-alt btnImgXS" style="font-size:18px;padding-top:1px"></i>
                      <i class="fas fa-trash-alt px-1 btnImgLg" style="font-size:26px;"></i>
                  </button>
              </div>
          </td>`
        }
      }
    ]
  });
  expandedTDcontent.parent().addClass('p-0');

};

// parent
const prepareTable = function() {
  if (table) {
    table.destroy();
    $('#projectFile').empty();
  }
  $.fn.dataTable.moment('h:mm:ss A MMM D, y');
  table = $('#projectFile').DataTable({
    dom: '<lfp<t>ip>',
    data: projectInfoList,
    order: [[ 4, 'desc']],
    paging: true,
    "lengthMenu": [[25, 50, -1], [25, 50, "All"]],
    columns: [
      {   
        className: 'details-control text-left'
        , title: 'Plan name'
        , data: function(dataFile) {
          return `<b>
            <i class='far fa-file-alt fa-fw mr-2'></i>
            <span style='cursor: pointer;'>
                <u class='text-muted'>${dataFile.prefix}</u>${dataFile.name}<u class='text-muted'>${dataFile.suffix}</u></b>
            </span>
            <button class="ml-1 btn btn-outline-primary btn-sm openProjectInfoFileLink px-1 py-0" 
                data-file_id='${dataFile.id}'>
            <i class="fas fa-external-link-alt" style="font-size:14px;"></i></button>`
        }
      },
      {   
        className:'text-center seqMediadisappear',
        title: 'Input folder containing sequence files',
        data: function(df) {
          const rawSeqFolder = projectInfo2RawSeqDataFile[df.id];
          if (rawSeqFolder) {
            return `<u>${rawSeqFolder.prefix}</u>${rawSeqFolder.name}<u>${rawSeqFolder.suffix}</u>
                <button class="ml-1 btn btn-outline-primary btn-sm openSeqDataFileLink px-1 py-0" 
                    data-seqfile_id='${rawSeqFolder.id}'>
                    <i class="fas fa-external-link-alt" style="font-size:14px;"></i>
                </button>`;
          } else {
            return `<span class='text-danger'>(not found)</span>`;
          }
        }
      },
      {   
        className:'text-center',
        title: 'Tags',
        data:function(projectInfo){
            let str='';
            for (let i=0; projectInfo.tags.length > i ; i++) {
                const projectInfoTags = projectInfo.tags[i];
                str += `<span class="badge badge-secondary mr-1">${projectInfoTags}</span>`
            }
          return str;
        }
      },
      /*
      {   
        className:'text-center',
        title: "Status",
        data : function(projectInfo){
          const statusNum = projectInfo.status;
          if(statusNum === 0){
              return `<span><i class="fas fa-circle-notch fa-spin text-primary"></i>
              <span style="display:none">0</span></span>`
          }
          else if(statusNum === 1){
              return `<span><i class="fas fa-check text-success"></i>
              <span style="display:none">1</span></span>`
          }
          else if(statusNum === 2){
              return `<span><i class="fas fa-lock text-warning"></i>
              <span style="display:none">2</span></span>`
          }
          else if(statusNum === 3){
              return `<span><i class="fas fa-trash-alt text-warning"></i>
              <span style="display:none">3</span></span>`
          }
          else{
              return `<span><i class="fas fa-times text-danger"></i>
              <span style="display:none">4</span></span>`
          }
        }
      }, */
      {   
        title: "Creation Time",
        className:'timeStyle',
        data: function(projectInfo){
            const timeNum = new Date(projectInfo.createdAt).valueOf();
            return `<div class="timeTitle d-flex justify-content-center">
                <div class="timeWidth">
                    <span><small>${moment(timeNum).format("h:mm:ss A MMM D, y")}</small></span>
                </div><div>`
        }
      },
      {   
        title:'Controls',
        className:'fnStyle text-center',
        orderable:false,
        data:function(data){
          return `<div class="btnDisplay fnStyle justify-content-center">
              <button class="btn btn-outline-info py-1 px-1 setNewProjectInfo btnSize" 
                data-value="${data.id}" data-toggle="tooltip" data-placement="top" title="View this plan">
                <i class="fas fa-eye btnImgXS" style="font-size:17px;"></i>
                <i class="fas fa-eye btnImgLg" style="font-size:28px;margin-left:4px"></i>
              </button>
              <button class="btn btn-outline-primary py-0 px-1 btnSize ml-1 mr-1 setRunProjectInfo"  
                  data-value="${data.id}" data-toggle="tooltip" data-placement="top" title="Execute this plan">
                  <i class="fas fa-play btnImgXS" style="font-size:15px;margin-top:1px"></i>
                  <i class="fas fa-play btnImgLg" style="font-size:26px;margin-top:1px"></i>
              </button>
              <button class="btn btn-outline-danger py-0 px-1 btnSize "  
                  data-name="${data.prefix}${data.name}${data.suffix}" data-value="${data.id}"
                  data-toggle="modal" title="Remove this plan" data-placement="top"  data-target="#deleteProjectFileModal">
                  <i class="fas fa-trash-alt btnImgXS" style="margin-left:-2px"></i>
                  <i class="fas fa-trash-alt btnImgLg" style="font-size:22px;"></i>
              </button>
          </div>`;
        }
      }
    ],
    createdRow: function(row, data, index) {
      if (!projectInfo2RawSeqDataFile[data.id]) {
        $(row).addClass('invalid');
      }
    }
  });
  // bootstrap
  $('td.details-control').append(expandTR);
  $('.dataTables_paginate').click(function(){
    $('td.details-control').append(expandTR);
  });
  $('select').change(function(){
    $('td.details-control').append(expandTR);
  });
  $('.sorting').click(function(){
    $('td.details-control').append(expandTR);
  });
  $('.timeStyle').click(function(){
      $('td.details-control').append(expandTR);
  });
  $('.openProjectInfoResultPage').click(async function(){
      await BdpAPI.openResultLink(this.dataset.result_value)
  });
  $('.setNewProjectInfo').click(async function(){
      await BdpAPI.navigateToFilePage(this.dataset.value, 'prepare-project-info', currentPkg.id);
  })
  $('.setRunProjectInfo').click(async function(){
      await BdpAPI.navigateToFilePage(this.dataset.value, 'exeucte-pipeline', currentPkg.id);
  });
  $('.openProjectInfoFileLink').click(async function() {
      await BdpAPI.openFileLink(this.dataset.file_id);
  });
  $('.openSeqDataFileLink').click(async function() {
      await BdpAPI.openFileLink(this.dataset.seqfile_id);
  });
  $('.gotoResultPageLink').click(async function() {
    await BdpAPI.navigateToResultPage(this.dataset.value, 'mirna-profiler-result-display', currentPkg.id);
  });

};


(async()=>{
    await BdpAPI.initialize();
    // await bdpAPI.toggleRightSideMenu(false);
    currentPkg = await BdpAPI.getCurrentPackageInfo();
    await refreshData();
    prepareTable();
    // $('#projectFile').on('page.dt',function(){
    //     const info = table.page.info();
    // });
    $('#deleteProjectFileModal').on('show.bs.modal',function (e) {
        const projectInfoFileName = e.relatedTarget.dataset.name;
        $('.projectInfoName').text(projectInfoFileName);
        const projectInfoFileID = e.relatedTarget.dataset.value;
        $('#deleteInput').click(async function(e){
          if(e.target.dataset.confirm){
            const results = projectInfo2Results[projectInfoFileID];
            if (Array.isArray(results)) {
              for (let i = 0; i < results.length; i ++) {
                await BdpAPI.deleteResult(results[i].id);
              }
            }
            const deletedFile = await BdpAPI.deleteFile(projectInfoFileID);
            if (deletedFile && deletedFile.id) {
              await refreshData();
              prepareTable();
            }
          }
        });
    });
    $('#deleteResultModal').on('shown.bs.modal',function (e) {
        console.log(e.relatedTarget);
        console.log(e.relatedTarget.dataset);
        const resultName = e.relatedTarget.dataset.name;
        $('.resultName').text(resultName);
        const resultID = e.relatedTarget.dataset.value;
        $('#deleteResultInput').click(async function(e){
          if(e.target.dataset.confirm){
            const deletedResult = await BdpAPI.deleteResult(resultID);
            console.log(deletedResult);
            if (deletedResult && deletedResult.id) {
              await refreshData();
              prepareTable();
            }
          }
        });
    });
})().catch((err)=>{
    console.log(err)
});