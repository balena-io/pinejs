# User System

## Permissions format
Permissions currently work by having a name that define what they are allowed to access.
The formats are as follows:
* resource.{action} - Grants the permission for {action} on all resources.
* {vocabulary}.{action} - Grants the permission for {action} on all resources of {vocabulary}.
* {vocabulary}.{resource}.{action} - Grants the permission for {action} on the {resource} of {vocabulary}.
