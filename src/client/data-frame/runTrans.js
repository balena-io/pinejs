(function() {
  var runTrans;

  runTrans = function(rootElement) {
    var lockResource, obj;
    if ($(".action").size() > 0) {
      obj = [
        {
          name: 'trans'
        }
      ];
      serverRequest('POST', '/data/transaction', {}, obj, function(statusCode, result, headers) {
        return serverRequest("GET", headers.location, {}, null, function(statusCode, trans, headers) {
          var callback, data, lockCount;
          lockCount = 0;
          data = [];
          callback = function(op, cr_uri, o) {
            var i, nextLoopCallback;
            if (o == null) o = {};
            data.push([op, cr_uri, o]);
            if (data.length === lockCount) {
              i = 0;
              nextLoopCallback = function() {
                var dataElement;
                if (i < data.length) {
                  dataElement = data[i];
                  i++;
                  switch (dataElement[0]) {
                    case "del":
                      return serverRequest("DELETE", dataElement[1], {}, null, nextLoopCallback);
                    case "edit":
                      return serverRequest("PUT", dataElement[1], {}, dataElement[2], nextLoopCallback);
                  }
                } else {
                  return serverRequest("POST", trans.ctURI, {}, null, function(statusCode, result, headers) {
                    return location.hash = "#!/data/";
                  });
                }
              };
              return nextLoopCallback();
            }
          };
          $(".action").each(function(index) {
            var _ref;
            if ((_ref = $(this).children("#__actype").val()) === "editterm" || _ref === "editfctp" || _ref === "del") {
              return lockCount++;
            }
          });
          return $(".action").each(function(index) {
            var resourceID, resourceType;
            resourceID = $(this).children("#__id").val();
            resourceType = $(this).children("#__type").val();
            switch ($(this).children("#__actype").val()) {
              case "editfctp":
              case "editterm":
                return lockResource(resourceType, resourceID, trans, function(lockID) {
                  var cr_uri, inputs, o;
                  cr_uri = "/data/lock*filt:lock.id=" + lockID + "/cr";
                  inputs = $(":input:not(:submit)", rootElement);
                  o = $.map(inputs, function(n, i) {
                    var ob;
                    if (n.id.slice(0, 2) !== "__") {
                      ob = {};
                      ob[n.id] = $(n).val();
                      return ob;
                    }
                  });
                  return callback("edit", cr_uri, o);
                });
              case "del":
                return lockResource(resourceType, resourceID, trans, function(lockID) {
                  var cr_uri;
                  cr_uri = "/data/lock*filt:lock.id=" + lockID + "/cr";
                  return callback("del", cr_uri);
                });
              case "addterm":
              case "addfctp":
                break;
            }
          });
        });
      });
    }
    return lockResource = function(resource_type, resource_id, trans, successCallback, failureCallback) {
      return serverRequest("POST", trans.lcURI, {}, [
        {
          name: "lok"
        }
      ], (function(statusCode, result, headers) {
        return serverRequest("GET", headers.location, {}, null, (function(statusCode, lock, headers) {
          var lockID, o;
          lockID = lock.instances[0].id;
          o = [
            {
              transaction_id: trans.id,
              lock_id: lockID
            }
          ];
          return serverRequest("POST", trans.tlcURI, {}, o, (function(statusCode, result, headers) {
            o = [
              {
                lock_id: lockID
              }
            ];
            return serverRequest("POST", trans.xlcURI, {}, o, (function(statusCode, result, headers) {
              o = [
                {
                  resource_id: parseInt(resource_id),
                  resource_type: resource_type,
                  lock_id: lockID
                }
              ];
              return serverRequest("POST", trans.lrcURI, {}, o, (function(statusCode, result, headers) {
                return successCallback(lockID);
              }), failureCallback);
            }), failureCallback);
          }), failureCallback);
        }), failureCallback);
      }), failureCallback);
    };
  };

  if (typeof window !== "undefined" && window !== null) window.runTrans = runTrans;

}).call(this);
