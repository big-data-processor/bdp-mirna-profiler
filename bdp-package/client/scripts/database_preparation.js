const BdpAPI = new BdpPageAPI();
const initializedDBTbody = document.querySelector('#initializedDBTbody');
const initDbBtn = document.querySelector('#initDbBtn');
let theDBInitResultRecord = null;
let currentPkg = null;
let selectedDBparameters = [];
let dbInitRecords = [];
let importUCSCWatcher;
$('#pageTitle').text('Database Preparation');


const getInputValuesToInitDB = function() {
  const containerName = $('#containerName').val();
  const volumeName = $('#volumeName').val();
  const mysqlPort = $('#mysqlPort').val();
  const rootPasswd = $('#rootPasswd').val();
  const userName = $('#userName').val();
  const userPasswd = $('#userPasswd').val();
  const isRestrictLocal = $('#isRestrictLocal').prop('checked');
  return ['initiate-mysql', containerName, rootPasswd, mysqlPort, userName, userPasswd, volumeName, isRestrictLocal ? 'yes' : 'no'];
}

/**
 * Check if there are results with task key 'initiate-mysql'
 * 
 * UI to initialize database
 * 
 * UI to import data 
 */

$(initDbBtn).click(async function() {
  if (!BdpAPI.initialized || !currentPkg) { return; }
  const inputValues = getInputValuesToInitDB();
  const results = await BdpAPI.listResults();
  dbInitRecords = results.filter(r => r.status === 2 && r.task && r.task.key === 'initiate-mysql');
  let hasSameSetting = false;
  for (let i = 0; i < dbInitRecords.length; i ++) {
    const eachResult = dbInitRecords[i];
    const eachParams = getInitDBparams(eachResult);
    if (inputValues[1] === eachParams[1]) {
      hasSameSetting = 'container';
      continue;
    } else if (inputValues[6] === eachParams[6]) {
      hasSameSetting = 'volume';
      continue;
    } else if (inputValues[3] === eachParams[3]) {
      hasSameSetting = 'port';
      continue;
    }
  }
  if (hasSameSetting) {
    // Error
    console.log(`Has same ${hasSameSetting} setting!`);
    const toastObj = {
      title: `<i class="fas fa-exclamation-triangle mr-2"></i>Conflict settings`,
      autohide: true,
      class: 'bg-warning',
      delay: 2000,
      body: `The ${hasSameSetting} ${hasSameSetting === 'port' ? '' : 'name'} has been used. Please use a different ${hasSameSetting} ${hasSameSetting === 'port' ? '' : 'name'}.`
    };
    $(document).Toasts('create', toastObj);
    return;
  }
  initDbBtn.disabled = true;
  initDbBtn.innerHTML = '<i class="fas fa-circle-notch fa-fw fa-spin mr-2"></i>Creating a new database instance';
  const initDBResult = await BdpAPI.executeTask('initiate-mysql', currentPkg.id, {
    name: `A DB instance named ${inputValues[1]}`,
    prefix: '', suffix: ''
  }, inputValues, []);
  const watcher = BdpAPI.watchResultChange(function(updatedResult) {
    if (updatedResult.data.id !== initDBResult.id) { return; }
    if (updatedResult.data.status === 2) {
      // finished
      listInitializedDBrecords().catch(console.log);
      watcher.stop();
      initDbBtn.disabled = false;
      initDbBtn.innerHTML = 'Create a new database instance';
    } else if (updatedResult.data.status === 3) {
      // errored
      watcher.stop();
      // TODO: Check existing Result Record if containing the same containerName and volumeName
      (async () => {
        await removeMySQLInstance(updatedResult.data); 
        initDbBtn.disabled = false;
        initDbBtn.innerHTML = 'Create a new database instance';
      })().catch(console.log);
    } else if (updatedResult.data.status === 4) {
      watcher.stop();
      initDbBtn.disabled = false;
      initDbBtn.innerHTML = 'Create a new database instance';
    }
  });
});

const getInitDBparams = function(theResult) {
  return theResult.arguments.map(arg => arg.type !== 'list' ? arg.value : (arg.value[0] === 'yes' ? true : false));
};

const displayDatabaseParams = function() {
  
};

const removeMySQLInstance = async function(theResult) {
  const params = getInitDBparams(theResult);
  const deletedResult = await BdpAPI.executeTask('remove-mysql-instance', currentPkg.id, {name: 'Removing MySQL instance', prefix: '', suffix: ''} ,['remove-mysql-instance', params[1], params[6]], {});
  return new Promise((resolve, reject) => {
    const watcher = BdpAPI.watchResultChange(function(updatedResult) {
      if (updatedResult.data.id !== deletedResult.id) { return; }
      if (updatedResult.data.status === 2) {
        // finished
        watcher.stop();
        (async () => {
          await BdpAPI.deleteResult(deletedResult.id);
          await BdpPageUtils.sleep(1);
          await BdpAPI.deleteResult(theResult.id);
          await listInitializedDBrecords();
          resolve();
        })().catch(() => reject());
      } else if (updatedResult.data.status === 3) {
        // errored
        watcher.stop();
        (async () => {
          await BdpAPI.deleteResult(deletedResult.id);
          await BdpPageUtils.sleep(1);
          await BdpAPI.deleteResult(theResult.id);
          await listInitializedDBrecords();
          resolve();
        })().catch(() => reject());
      } else if (updatedResult.data.status === 4) {
        watcher.stop();
        resolve();
      }
    });
  });
};



const displayResultRecord = async function(theResult) {
  $('#selectedDBRecord').html(`
    <dt class="col-sm-4">Name</dt>
    <dd class="col-sm-8">${theResult.name}</dd>
    <dt class="col-sm-4">Description</dt>
    <dd class="col-sm-8">${theResult.desc || '(no description)'}</dd>
  `);
  const selectedDBRecordFooter = document.querySelector('#selectedDBRecordFooter');
  $(selectedDBRecordFooter).empty();
  const gotoBtn = document.createElement('button');
  gotoBtn.innerHTML = `<i class='fas fa-external-link-alt fa-fw'></i>`;
  gotoBtn.className = `btn btn-primary`;
  gotoBtn.onclick = function() {
    BdpAPI.openResultLink(theResult.id);
  };
  selectedDBRecordFooter.appendChild(gotoBtn);
  const removeBtn = document.createElement('button');
  removeBtn.innerHTML = `<i class='fas fa-trash-alt fa-fw'></i>`;
  removeBtn.className = `btn btn-danger float-right`;
  removeBtn.onclick = async function() {
    removeBtn.disabled = true;
    removeBtn.innerHTML = `<i class='fas fa-circle-notch fa-spin fa-fw'></i>`;
    try {
      await removeMySQLInstance(theResult);
      removeBtn.innerHTML = `<i class='fas fa-trash-alt fa-fw'></i>`;
    } catch(e) {
      console.log(e);
    }
  };
  selectedDBRecordFooter.appendChild(removeBtn);
  const params = getInitDBparams(theResult);
  const selectedDBparams = document.querySelector('#selectedDBparams');
  selectedDBparams.innerHTML = `
    <dt class="col-sm-4">Container name</dt>
    <dd class="col-sm-8">${params[1]}</dd>
    <dt class="col-sm-4">Container volume</dt>
    <dd class="col-sm-8">${params[6]}</dd>
    <dt class="col-sm-4">MySQL port</dt>
    <dd class="col-sm-8">${params[3]}</dd>
    <dt class="col-sm-4">MySQL root password</dt>
    <dd class="col-sm-8">${params[2]}</dd>
    <dt class="col-sm-4">MySQL user</dt>
    <dd class="col-sm-8">${params[4]}</dd>
    <dt class="col-sm-4">MySQL password</dt>
    <dd class="col-sm-8">${params[5]}</dd>
    <dt class="col-sm-4">Restricted to local access (127.0.0.1)?</dt>
    <dd class="col-sm-8">${params[7] ? 'yes' : 'no'}</dd>
  `;
  const dataFiles = await BdpAPI.listFiles();
  const results = await BdpAPI.listResults();
  const importMiRBaseResults = results.filter(r => r.status === 2 && r.task && r.task.key === 'import-mirbase-v22' && r.arguments[0].value === params[1] && r.arguments[1].value === params[2] && r.arguments[2].value === params[4] && r.arguments[3].value === params[5]);
  const miRBaseRecordContainerDiv = document.querySelector('#miRBaseRecordContainerDiv');
  const ucscRecordContainerDiv = document.querySelector('#ucscRecordContainerDiv');
  if (importMiRBaseResults.length > 0) {
    miRBaseRecordContainerDiv.innerHTML = `You already have records of importing the miRBase v22 to this MySQL database instance.<br>`;
  } else {
    miRBaseRecordContainerDiv.innerHTML = `You have NOT imported the miRBase v22 to this MySQL database instance.<br>`;
  }
  miRBaseRecordContainerDiv.innerHTML += `<div class='row mt-2'>
    <div class='col-md-6'>
      <div class='row'>
        <dt class="col-sm-4">MySQL Host IP</dt>
        <dd class="col-sm-8">
          <input class='form-control' id='mirbase_mysql_ip' placeholder='Please specify the imported DB name' value="127.0.0.1" /><br>
          <span class='text-muted'>The ip, 127.0.0.1, is the default local host ip.</span>
        </dd>
      </div>
    </div>
  </div>`;
  const importMirBaseBtn = document.createElement('button');
  importMirBaseBtn.className = 'btn btn-primary';
  importMirBaseBtn.innerHTML = importMiRBaseResults.length > 0 ? 'Import Again' : 'Import';
  miRBaseRecordContainerDiv.appendChild(importMirBaseBtn);
  importMirBaseBtn.onclick = async function() {
    importMirBaseBtn.disabled = true;
    importMirBaseBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin fa-fw mr-2"></i>Deleting previous importing records...';
    const results = await BdpAPI.listResults();
    const importMiRBaseResults = results.filter(r => r.status === 2 && r.task && r.task.key === 'import-mirbase-v22' && r.arguments[0].value === params[1] && r.arguments[1].value === params[2] && r.arguments[2].value === params[4] && r.arguments[3].value === params[5]);
    for (let i = 0; i < importMiRBaseResults.length; i ++) {
      await BdpAPI.deleteResult(importMiRBaseResults[i].id);
    }
    importMirBaseBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin fa-fw mr-2"></i>Importing database files, please wait.';
    
    const mirBaseMySQLHost = $('#mirbase_mysql_ip').val();
    const importMirBaseResult = await BdpAPI.executeTask('import-mirbase-v22', currentPkg.id, {name: 'Importing miRBase v22 (mirna_22b)', prefix: '', suffix: '', desc: 'Automatically importing the miRBase v22b via Project Page.'}
      , [params[1], params[2], params[4], params[5], params[3], 'mirna_22b', mirBaseMySQLHost || '127.0.0.1', 'latin1', null], {});
    const watcher = BdpAPI.watchResultChange(function(updatedResult) {
      if (updatedResult.data.id !== importMirBaseResult.id) { return; }
      if (updatedResult.data.status === 2) {
        // finished
        watcher.stop();
        importMirBaseBtn.disabled = false;
        importMirBaseBtn.innerHTML = 'Import Again';
        displayResultRecord(theResult).catch(console.log);
      } else if (updatedResult.data.status === 3) {
        // errored
        watcher.stop();
        (async () => {
          await BdpAPI.deleteResult(importMirBaseResult.id);
        }).catch(console.log);
      } else if (updatedResult.data.status === 4) {
        watcher.stop();
      }
    });
  };
  await updateUCSCGenomeRecords(theResult);
  // listFiles
  // listResults 
};



const updateUCSCGenomeRecords = async function(theResult) {
  $(ucscRecordContainerDiv).empty();
  const dataFiles = await BdpAPI.listFiles();
  const results = await BdpAPI.listResults();
  const params = getInitDBparams(theResult);
  /**
   * TODO: 
   */
  const ucscGenomeMySQLFolders = dataFiles.filter(df => df.status === 1 &&  df.tags.indexOf('Folder') >= 0 && df.tags.indexOf('data-to-import') >= 0 && df.tags.indexOf('ucsc-genome-mysql') >= 0).sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
  const importMySQLResults = results.filter(r =>  r.task && r.task.key === 'import-to-mysql-database' &&
    r.arguments[1].value === params[1] &&  // containerName
    r.arguments[2].value === params[2] &&  // root password
    r.arguments[5].value === params[3] &&        // MySQL port
    r.arguments[3].value === params[4] &&  // MySQL user
    r.arguments[4].value === params[5]);   // MySQL passwd
  const preparedReferenceResults = results.filter(r => r.task && r.task.key === 'prepare-reference' && r.status === 2);
  if (importUCSCWatcher && importUCSCWatcher.stop) {
    importUCSCWatcher.stop();
    const ucscImportRecordIDs = importMySQLResults.map(r => r.id);
    importUCSCWatcher = BdpAPI.watchResultChange(updatedResult => {
      if (ucscImportRecordIDs.indexOf(updatedResult.id) < 0) { return; }
      updateUCSCGenomeRecords(theResult).catch(console.log);
    });
  }
  
  for (let i = 0; i < ucscGenomeMySQLFolders.length; i ++) {
    const eachUCSCFolder = ucscGenomeMySQLFolders[i];
    let theImportedResult = null, theDownloadProcResult = null;
    for (let j = 0; j < importMySQLResults.length; j ++) {
      const eachImportedResult = importMySQLResults[j];
      const importedPath = eachImportedResult.arguments[8].value;
      if (importedPath === eachUCSCFolder.path || importedPath.id === eachUCSCFolder.id) {
        theImportedResult = eachImportedResult;
        break;
      }
    }
    for (let j = 0; j < preparedReferenceResults.length; j ++) {
      const eachPrepareResult = preparedReferenceResults[j];
      const importedPath = eachPrepareResult.arguments[7].value;
      if (importedPath === eachUCSCFolder.path || importedPath.id === eachUCSCFolder.id) {
        theDownloadProcResult = eachPrepareResult;
        break;
      }
    }
    if (!theDownloadProcResult) {
      continue;
    }
    const cardContainer = document.createElement('div');
    cardContainer.className = 'col-md-6 col-lg-4';
    cardContainer.innerHTML = `<div class='card' style='font-size: 14px;'>
      <div class="card-header">
        <h3 class="card-title"><button class="btn btn-sm btn-info viewDataFileBtn"><i class='fas fa-external-link-alt fa-fw'></i></button> UCSC genome refernce</h3>
        <div class='card-tools'>
          ${theImportedResult && theImportedResult.status === 4 ? '<span class="badge badge-warning">Deleting</span>' : ''}
          ${theImportedResult && theImportedResult.status === 3 ? '<span class="badge badge-danger">Error</span>' : ''}
          ${theImportedResult && theImportedResult.status === 2 ? '<span class="badge badge-primary">Imported</span>' : ''}
          ${theImportedResult && theImportedResult.status < 2 ? '<span class="badge badge-primary">Importing</span>' : ''}
        </div>
      </div>
      <div class="card-body">
        <dl class="row">
          <dt class="col-sm-4">DataFile Name</dt>
          <dd class="col-sm-8"><u class='text-muted'>${eachUCSCFolder.prefix}</u>${eachUCSCFolder.name}<u class='text-muted'>${eachUCSCFolder.suffix}</u> </dd>
          <dt class="col-sm-4 mt-2">DataFile Description</dt>
          <dd class="col-sm-8 mt-2">${eachUCSCFolder.desc || '(no description)'}</dd>
          <dt class="col-sm-4 mt-2">MySQL Database Name</dt>
          <dd class="col-sm-8 mt-2">
            <input class='form-control mysqlDBname' placeholder='Please specify the imported DB name' value="${eachUCSCFolder.prefix === 'Mouse_' ? 'mm10' : (eachUCSCFolder.prefix === 'Human_' ? 'hg38' : '')}" />
          </dd>
          <dt class="col-sm-4 mt-2">MySQL Host IP</dt>
          <dd class="col-sm-8 mt-2">
            <input class='form-control mysqlDBhost' placeholder='Please specify the imported DB name' value="127.0.0.1" /><br>
            <span class='text-muted'>The ip, 127.0.0.1, is the default localhost ip.</span>
          </dd>
        </dl>
      </div>
      <div class="card-footer">
        ${!theImportedResult ? "<button class='btn btn-sm btn-primary importBtn'><i class='fas fa-file-import fa-fw mr-2'></i>Import</button>" : ''}
        ${theImportedResult && theImportedResult.status < 2 ? "<button class='btn btn-sm btn-primary importBtn' disabled><i class='fas fa-circle-notch fa-spin fa-fw mr-2'></i>Importing</button>" : ''}
        ${theImportedResult && theImportedResult.status === 2 ? "<button class='btn btn-sm btn-primary importBtn'><i class='fas fa-file-import fa-fw mr-2'></i>Import Again</button>" : ''}
        ${theImportedResult && theImportedResult.status > 2 ? "<button class='btn btn-sm btn-danger removeResultBtn'><i class='fas fa-trash-alt fa-fw mr-2'></i>Remove Process</button>" : ''}
        ${theImportedResult ? "<button class='btn btn-sm btn-primary viewResult'><i class='fas fa-eye fa-fw mr-2'></i>View Process</button>" : ''}
      </div>
    </div>`;
    
    $(cardContainer).find('.card-header .viewDataFileBtn').click(async function() {
      BdpAPI.openFileLink(eachUCSCFolder.id);
    });
    $(cardContainer).find('.card-footer .viewResult').click(async function() {
      BdpAPI.openResultLink(theImportedResult.id);
    });
    $(cardContainer).find('.card-footer .removeResultBtn').click(async function() {
      if (theImportedResult && theImportedResult.id && theImportedResult.status > 2 ) {
        await BdpAPI.deleteResult(theImportedResult.id);
        await updateUCSCGenomeRecords(theResult);
      }
    });
    $(cardContainer).find('.card-footer .importBtn').click(async function() {
      // BdpAPI.openFileLink(eachUCSCFolder.id);
      console.log(params);
      const dbname = $(cardContainer).find('input.mysqlDBname').val();
      if (!dbname) {
        $(document).Toasts('create', {
          title: `<i class="fas fa-exclamation-triangle mr-2"></i>Unknown MySQL database name`,
          autohide: true,
          class: 'bg-warning',
          delay: 2000,
          body: `Please specify the MySQL database name for the imported data.`
        });
        return;
      }
      const dbHost = $(cardContainer).find('input.mysqlDBhost').val();
      if (!dbHost) {
        $(document).Toasts('create', {
          title: `<i class="fas fa-exclamation-triangle mr-2"></i>Unknown MySQL host IP`,
          autohide: true,
          class: 'bg-warning',
          delay: 2000,
          body: `Please specify the MySQL IP for the imported data.`
        });
        return;
      }
      const inputs = ['import-to-mysql-database', params[1], params[2], params[4], params[5], params[3], dbname, dbHost, eachUCSCFolder.id, 'latin1'];
      await BdpAPI.executeTask('import-to-mysql-database', currentPkg.id, {
        name: `Import ${eachUCSCFolder.prefix}${eachUCSCFolder.name}${eachUCSCFolder.suffix} to MySQL container ${params[1]}`,
        desc: 'Automatically importing the UCSC MySQL data via Project Page.',
        prefix: eachUCSCFolder.prefix,
        suffix: ''
      }, inputs, []);
      await updateUCSCGenomeRecords(theResult);
    });
    ucscRecordContainerDiv.appendChild(cardContainer);
  }
  if (ucscGenomeMySQLFolders.length === 0) {
    $(ucscRecordContainerDiv).html(`No downloaded references are not found in this project. Please download the references first.`);
  }
}

const selectInitDB = async function(trEle, theResult) {
  $('#initializedDBTable').find('.table-primary').removeClass('table-primary');
  $(trEle).addClass('table-primary');
  theDBInitResultRecord = theResult;
  selectedDBparameters = getInitDBparams(theResult);
  await displayResultRecord(theResult);
};


const listInitializedDBrecords = async function() {
  const results = await BdpAPI.listResults();
  dbInitRecords = results.filter(r => r.status === 2 && r.task && r.task.key === 'initiate-mysql');
  $(initializedDBTbody).empty();
  if (dbInitRecords.length <= 0) {
    $('#importZone, #resultZone').hide();
    $('#dbInitTab a[href="#newDBTab"]').tab('show');
    const trEle = document.createElement('tr');
    trEle.className = 'link';
    trEle.innerHTML = `<td colspan=3 class='text-center bg-lightblue disabled color-palette'>You have no initialized databases. Click here to create a new one!</td>`;
    trEle.onclick = function() {
      $('#dbInitTab a[href="#newDBTab"]').tab('show');
    };
    initializedDBTbody.appendChild(trEle);
    return;
  }
  $('#dbInitTab a[href="#viewDBTab"]').tab('show');
  for (let i = 0; i < dbInitRecords.length; i ++) {
    const trEle = document.createElement('tr');
    trEle.className = 'link';
    ['name', 'desc', 'createdAt'].forEach(key => {
      const tdEle =document.createElement('td');
      if (key === 'name') {
        tdEle.innerHTML = `<u class='text-muted'>${dbInitRecords[i].prefix}</u>${dbInitRecords[i].name}<u class='text-muted'>${dbInitRecords[i].suffix}</u>`;
      } else {
        tdEle.innerHTML = `${dbInitRecords[i][key]}`;
      }
      trEle.appendChild(tdEle);
    });
    $(trEle).click(async function() {
      selectInitDB(trEle, dbInitRecords[i]);
    });
    initializedDBTbody.appendChild(trEle);
    // if (selectedDBparameters.length === 0) {
    if (theDBInitResultRecord && theDBInitResultRecord.id === dbInitRecords[i].id) {
      await selectInitDB(trEle, dbInitRecords[i]);
    } else {
      await selectInitDB(trEle, dbInitRecords[i]);
    }
  }
};

$('#dbInitTab a[data-toggle="tab"]').on('shown.bs.tab', function(e) {
  if (e.target.hash === '#newDBTab') {
    $('#importZone, #resultZone').hide();
  } else {
    if (dbInitRecords.length > 0) {
      $('#importZone, #resultZone').show();
    }
  }
});

(async () => {
  await BdpAPI.initialize();
  const currentUser = await BdpAPI.getCurrentUserInfo();
  currentPkg =  await BdpAPI.getCurrentPackageInfo();
  await listInitializedDBrecords();
  
  
})().catch(console.log);