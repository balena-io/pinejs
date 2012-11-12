# Breaking dawn

##Intro

The goal here, dear gentlemen, is to use the canvas platform on developing Renew's API. Thus, to cut the long story short, we need to be able to support the following features.

###Datatypes

* String
* Number
* Boolean
* Date
* File (binary)

###Contraints

Constraint            | String | Number | Boolean | Date | File
:------------------- | :----: | :----: | :-----: | :--: | :--: 
Length: min          | x      |        |         |      | x
Length: exact        | x      |        |         |      | x
Length: max          | x      |        |         |      | x
Precision            |        | x      |         |      |  
Value: min           |        | x      |         | x    |  
Value: max           |        | x      |         | x    |
Value: not equals    | x      | x      | x       | x    |  
Value: in (array)    | x      | x      |         | x    |  
Value: not in        | x      | x      |         | x    |  
Value: matches regex | x      |        |         |      |  
Value: contains      | x      |        |         |      |  
Value: not contains  | x      |        |         |      |  

##Storage requirements

A database's storage requirements are determined by the combination of datatypes and their corresponding contraints, i.e.

Datatype + Contraints                      | MySql Type
:----------------------------------------- | :------------------
String of exact length 10                  | CHAR(10)
Number of min value 100, max value 30000   | SMALLINT UNSIGNED
