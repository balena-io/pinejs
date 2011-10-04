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
            switch ($(this).children("#__actype").val()) {
              case "editterm":
              case "editfctp":
              case "del":
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
                  var cr_uri, inputs, o, ob;
                  cr_uri = "/data/lock*filt:lock.id=" + lock_id + "/cr";
                  inputs = $(":input:not(:submit)", parent);
                  o = $.map(inputs, function(n, i) {}, n.id.slice(0, 2) !== "__" ? (ob = {}, ob[n.id] = $(n).val(), ob) : void 0);
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
                return null;
            }
          });
        });
      });
    }
    return this.callback = function(op, cr_uri, o) {
      var i, _ref;
      this.parent.data.push([op, cr_uri, o]);
      if (this.parent.data.length === this.parent.lockCount) {
        for (i = 0, _ref = this.parent.lockCount; 0 <= _ref ? i < _ref : i > _ref; 0 <= _ref ? i++ : i--) {
          switch (this.parent.data[i][0]) {
            case "del":
              serverRequest("DELETE", this.parent.data[i][1], [], "", function(statusCode, result, headers) {});
              break;
            case "edit":
              serverRequest("PUT", this.parent.data[i][1], [], JSON.stringify(this.parent.data[i][2]));
          }
        }
        return serverRequest("POST", this.parent.trans.ctURI, [], "", function(statusCode, result, headers) {
          return location.hash = "#!/data/";
        });
      }
    };
  };
  locker = function() {
	console.log('x',this)
     this.lockResource = function(resource_type, resource_id, trans, successCallback, failureCallback) {
	console.log('y',this)
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
  };
  window.locker = locker;
}).call(this);
