v0.2.27

* sbvrUtils.executeModel and sbvrUtils.executeModels now expect a model object, rather than vocabulary name/sbvr text.
* Improved constraint failure checks for WebSQL.
* 500 errors are now used correctly, rather than incorrect 50x variants.
* PUT requests are now correctly rolled back on a rule violation
* Database errors (that are not related to constraints) now return a 500 and no longer leak the error to the client.
* Logging levels can now be configured on a per-model basis.
* Session model requests now only log errors.
