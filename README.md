# Breaking dawn

##Intro

The goal here, dear gentlemen, is to use the canvas platform on developing Renew's API. Thus, withour further delays, we need to be able to support the following features.

###Datatypes

* String
* Number
* Boolean
* Date
* File (binary)

###Contrains

Constrain            | String | Number | Boolean | Date | File
:------------------- | :----: | :----: | :-----: | :--: | :--: 
Length: min          | X      |        |         |      | X
Length: exact        | X      |        |         |      | X
Length: max          | X      |        |         |      | X
Precision            |        | X      |         |      |  
Value: min           |        | X      |         | X    |  
Value: max           |        | X      |         | X    |
Value: equals        | X      | X      |         | X    |  
Value: not equals    | X      | X      |         | X    |  
Value: in (array)    | X      | X      |         | X    |  
Value: not in        | X      | X      |         | X    |  
Value: matches regex | X      |        |         |      |  
Value: contains      | X      |        |         |      |  
Value: not contains  | X      |        |         |      |  

###Storage requirements

A database's storage requirements are determined by the combination of datatypes and their corresponding contrains.

Datatype + Contrains                       | MySql Type
:----------------------------------------- | :------------------
String of exact length 10                  | CHAR(10)
Number of min value 100, max value 30000   | SMALLINT UNSIGNED
