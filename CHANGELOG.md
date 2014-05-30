v0.2.29

* Update ometa-js to ~1.3.0 and use the new line by line highlight option, which removes the need for the custom codemirror change and also updates to work with the latest codemirror (including a switch to the newer hinting module).
* Update codemirror to v4.2.0 and load it from bower now that a custom change is no longer needed.
* Use a SQL hinter for the database import/export tab.
* Improve generic error messages returned for foreign/unique key violations in cases where detailed info cannot be obtained.

v0.2.28

* Add support for a TRANSACTION_TIMEOUT_MS env var, that specifies how long before a transaction is automatically closed (via a rollback).
* Use error codes to detect the error type for postgresql, this makes the checking much more resilient.
* Updated bluebird to ~1.2.4

v0.2.27

* sbvrUtils.executeModel and sbvrUtils.executeModels now expect a model object, rather than vocabulary name/sbvr text.
* Improved constraint failure checks for WebSQL.
* 500 errors are now used correctly, rather than incorrect 50x variants.
* PUT requests are now correctly rolled back on a rule violation
* Database errors (that are not related to constraints) now return a 500 and no longer leak the error to the client.
* Logging levels can now be configured on a per-model basis.
* Session model requests now only log errors.
