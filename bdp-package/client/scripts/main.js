let isFullPage;
$('.homeLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('home'));
$('.docLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('documentation'));
$('.planListLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('plan-list'));

$('.prepareProjectInfoLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('prepare-project-info'));
$('.executePipelineLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('exeucte-pipeline'));

$('.prepareRefLink').click(async () => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('prepare-references'));
$('.dbPrepLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('db-prepare'));
$('.downloadExampleLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.navigateToProjectPage('download-example'));


$('.toggleFullPageLink').click(async() => {
  if (!BdpAPI || !BdpAPI.initialized) { return; }
  isFullPage = !isFullPage;
  await BdpAPI.toggleFullPage();
  if (isFullPage) {
    $('.toggleFullPageLink').html('<i class="fas fa-compress-alt"></i>');
  } else {
    $('.toggleFullPageLink').html('<i class="fas fa-expand-alt"></i>');
  }
});
$('.refreshLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.refreshPage());
$('.pageListLink').click(async() => BdpAPI && BdpAPI.initialized && await BdpAPI.togglePageList());

const setupTimer = setInterval(() => {
  if (BdpAPI && BdpAPI.initialized) {
    clearInterval(setupTimer);
    (async () => {
      await BdpAPI.toggleRightSideMenu(false);
      isFullPage = await BdpAPI._callBdpApi('isFullPage');
      if (isFullPage) {
        $('.toggleFullPageLink').html('<i class="fas fa-compress-alt"></i>');
      }
      const currentProject = await BdpAPI.getCurrentProjectInfo();
      if (currentProject) {
        $('#currentProjectLink').html(`
          <a href='#' class="nav-link">
            <i class="nav-icon"></i><p>${currentProject.name}<i class="ml-2 fas fa-external-link-alt"></i></p>
          </a>`);
        $('#currentProjectLink').click(async () => {
          await BdpAPI.openProjectLink(currentProject.id);
        });
      } else {
        $('#currentProjectLink').html(`
        <div class="alert alert-danger" role="alert">
          <i class="fas fa-exclamation-triangle"></i><p>Error! <br>No project can be linked.</p>
        </div>`);
      }
    })().catch(console.log);
  }
}, 300);