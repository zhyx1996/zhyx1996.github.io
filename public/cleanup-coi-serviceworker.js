// Remove the old root-scoped COOP/COEP worker. It was previously loaded by
// gomoku.html and can keep controlling every page on this GitHub Pages origin
// after the script tag is removed, blocking cross-origin iframe resources.
(function () {
  if (!('serviceWorker' in navigator)) return;
  var reloadKey = 'coi-serviceworker-cleanup-v1';
  if (sessionStorage.getItem(reloadKey)) return;

  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    var stale = registrations.filter(function (registration) {
      var workers = [registration.active, registration.waiting, registration.installing];
      return workers.some(function (worker) {
        return worker && /coi-serviceworker(?:\.min)?\.js/i.test(worker.scriptURL);
      });
    });
    if (!stale.length) return;

    return Promise.all(stale.map(function (registration) {
      return registration.unregister();
    })).then(function () {
      sessionStorage.setItem(reloadKey, '1');
      window.location.reload();
    });
  }).catch(function () {
    // A private browsing policy may deny registration inspection; leave page intact.
  });
}());
