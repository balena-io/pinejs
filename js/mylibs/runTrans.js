(function() {
  var locker, runTrans;
  runTrans = function() {
    var obj, parent, transuri;
    parent = this;
    transuri = "";
    this.lockCount = 0;
    this.data = [];
    if ($(".action").size() > 0) {
      obj = [
        {
          name: 'trans'
        }
      ];
      serverRequest('POST', '/data/transaction', [], JSON.stringify(obj), function(statusCode, result, headers) {
        parent.transuri = headers.location;
        return serverRequest("GET", parent.transuri, [], '', function(statusCode, trans, headers) {
          parent.trans = trans;
          $(".action").each(function(index) {
            var _ref;
            if ((_ref = $(this).children("#__actype").val()) === "editterm" || _ref === "editfctp" || _ref === "del") {
              return parent.lockCount++;
            }
          });
          return $(".action").each(function(index) {
            var lockr;
            this.trans = parent.trans;
            this.resource_id = $(this).children("#__id").val();
            this.resource_type = $(this).children("#__type").val();
            this.callback = parent.callback;
            this.parent = parent;
            lockr = new locker();
            switch ($(this).children("#__actype").val()) {
              case "editfctp":
              case "editterm":
                return lockr.lockResource(this.resource_type, this.resource_id, this.trans, function(lock_id) {
                  var cr_uri, inputs, o;
                  cr_uri = "/data/lock*filt:lock.id=" + lock_id + "/cr";
                  inputs = $(":input:not(:submit)", parent);
                  o = $.map(inputs, function(n, i) {
                    var ob;
                    if (n.id.slice(0, 2) !== "__") {
                      ob = {};
                      ob[n.id] = $(n).val();
                      return ob;
                    }
                  });
                  return parent.callback("edit", cr_uri, o);
                });
              case "del":
                return lockr.lockResource(this.resource_type, this.resource_id, this.trans, function(lock_id) {
                  var cr_uri;
                  cr_uri = "/data/lock*filt:lock.id=" + lock_id + "/cr";
                  return parent.callback("del", cr_uri, {});
                });
              case "addterm":
              case "addfctp":
                break;
            }
          });
        });
      });
    }
    return this.callback = function(op, cr_uri, o) {
      var dataElement, _i, _len, _ref;
      this.parent.data.push([op, cr_uri, o]);
      if (this.parent.data.length === this.parent.lockCount) {
        _ref = this.parent.data;
        for (_i = 0, _len = _ref.length; _i < _len; _i++) {
          dataElement = _ref[_i];
          switch (dataElement[0]) {
            case "del":
              serverRequest("DELETE", dataElement[1]);
              break;
            case "edit":
              serverRequest("PUT", dataElement[1], [], JSON.stringify(dataElement[2]));
          }
        }
        return serverRequest("POST", this.parent.trans.ctURI, [], "", function(statusCode, result, headers) {
          return location.hash = "#!/data/";
        });
      }
    };
  };
  locker = function() {
    this.lockResource = function(resource_type, resource_id, trans, successCallback, failureCallback) {
      var parent;
      parent = this;
      this.resource_type = resource_type;
      this.resource_id = resource_id;
      this.trans = trans;
      this.successCallback = successCallback;
      this.failureCallback = failureCallback;
      return serverRequest("POST", trans.lcURI, [], JSON.stringify([
        {
          name: "lok"
        }
      ]), (function(statusCode, result, headers) {
        return serverRequest("GET", headers.location, [], "", (function(statusCode, lock, headers) {
          var o;
          parent.lock = lock;
          o = [
            {
              transaction_id: parent.trans.id,
              lock_id: parent.lock.instances[0].id
            }
          ];
          return serverRequest("POST", parent.trans.tlcURI, [], JSON.stringify(o), (function(statusCode, result, headers) {
            o = [
              {
                lock_id: parent.lock.instances[0].id
              }
            ];
            return serverRequest("POST", parent.trans.xlcURI, [], JSON.stringify(o), (function(statusCode, result, headers) {
              o = [
                {
                  resource_id: parseInt(parent.resource_id),
                  resource_type: parent.resource_type,
                  lock_id: parent.lock.instances[0].id
                }
              ];
              return serverRequest("POST", parent.trans.lrcURI, [], JSON.stringify(o), (function(statusCode, result, headers) {
                return successCallback(parent.lock.instances[0].id);
              }), failureCallback);
            }), failureCallback);
          }), failureCallback);
        }), failureCallback);
      }), failureCallback);
    };
    return this;
  };
  if (typeof window !== "undefined" && window !== null) {
    window.runTrans = runTrans;
  }
}).call(this);
