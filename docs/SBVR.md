In Pine, models are described in *SBVR*, which stands for "Semantics of Business Vocabulary and Business Rules". SBVR provides a way to capture specifications in a structured, formal language that is similar to natural languages. This document describes how Pine understands SBVR. You can use the [sbvr lab](http://www.sbvr.co/) as a companion to this document. For a deep dive, check out the [SBVR spec](http://www.omg.org/spec/SBVR/).

Throughout this document the following model, and variations of it, will be used:

```
Term: pilot
Term: plane
Term: airport
Term: IATA code
    Concept Type: Text (Type)

Fact Type: pilot can fly plane
    Necessity: each pilot can fly at least one plane

Fact Type: plane is at airport
    Necessity: each plane is at at most one airport

Fact Type: airport has IATA code
    Necessity: each airport has exactly one IATA code
    Necessity: each IATA code is of exactly one airport

Rule: It is necessary that each IATA code has a Length (Type) that is equal to 3
```

# SBVR in Pine.js

An SBVR model is composed of one or more _vocabularies_, serving as namespaces. Each vocabulary is composed of _terms_, _fact types_, and _rules_, which together define the data model and its constraints. Terms from different vocabularies can be referenced adding the name of the vocabulary, in parenthesis, after the term.

SBVR files are composed of statements, one per line, in the form `<header>: <body>`. Indentation is not significant, and `--` introduces comments that go until the end of the line. SBVR files accepted by Pine.js are case-insensitive and usually have the `.sbvr` extension. `Vocabulary`, `Term`, `Fact Type`, and `Rule` are toplevel declarations that can be followed by _attributes_. See the **Attributes** subsection below.

A vocabulary can be started with:

```
Vocabulary: <vocabulary-name>
```

Every new definition is part of the last declared vocabulary. If no vocabulary has been explicitly declared, a `Default` vocabulary is implicitly assumed. Within vocabularies, terms can be declared:

```
Term: <term-name>
```

where `<term-name>` is the name of the term. Because SBVR focuses on structuring natural languages, terms can have spaces in their names. Terms are _types_: they represent a collection of instances that obey an uniform "interface" defined through fact types and rules.

Given one or more terms, a `Fact Type` introduces a qualifier for a single term (unary), or a relationship between two terms (binary):

```
Fact Type: <term-1> <verb> [term-2 [trailer]]
```

where `[term-2]` is only present for binary fact types, and in those cases an arbitrary `[trailer]` can be added. Verbs can be anything and can also contain spaces. Because there is no way to split a fact type into these components using syntax alone, Pine's interpretation of a fact type depends on _context_. For example, both fact types in the following SBVR will cause an error:

```
Fact Type: pilot can fly
Fact Type: pilot can fly plane
```

Since there are no terms defined, there is no valid parse for either of those. Pine does not understand english, and as far as it is concerned, `<term-1>` could be `pilot can`.

If we state that `pilot` is a term:

```
Term: pilot
Fact Type: pilot can fly
Fact Type: pilot can fly plane
```

This snippet is now valid. Here, both fact types are parsed as _unary_ fact types, meaning that Pine parsed both `can fly` and `can fly plane` as `<verb>`. Unary fact types define boolean-valued qualifiers, and this snippet compiles down to:

```sql
CREATE TABLE IF NOT EXISTS "pilot" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       "can fly" INTEGER DEFAULT 0 NOT NULL
,       "can fly plane" INTEGER DEFAULT 0 NOT NULL
);
```

where `created at` and `id` are common columns for all non-primitive terms (see the **Concept Type** attribute below). Since `can fly` and `can fly plane` are both qualifiers, they become fields in the `pilot` table.

If we introduce a new term, `plane`, `pilot can fly plane` is now parsed as a _binary_ fact type:

```
Term: pilot
Term: plane
Fact Type: pilot can fly
Fact Type: pilot can fly plane
```

The schema becomes:

```sql
CREATE TABLE IF NOT EXISTS "pilot" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       "can fly" INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "plane" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "pilot-can fly-plane" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "pilot" INTEGER NOT NULL
,       "can fly-plane" INTEGER NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       FOREIGN KEY ("pilot") REFERENCES "pilot" ("id")
,       FOREIGN KEY ("can fly-plane") REFERENCES "plane" ("id")
,       UNIQUE("pilot", "can fly-plane")
);
```

As expected, `plane` becomes another table, and `pilot can fly` is still an unary fact type. Binary fact types denote, by default, `n:n` relations. Each `(verb, trailer)` pair defines a different relation and a different join table. It is important to note that SBVRs are not fully declarative, and order matters during parsing:

```
Term: pilot
Fact Type: pilot can fly
Fact Type: pilot can fly plane
Term: plane
```

will generate the following schema:

```sql
CREATE TABLE IF NOT EXISTS "pilot" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       "can fly" INTEGER DEFAULT 0 NOT NULL
,       "can fly plane" INTEGER DEFAULT 0 NOT NULL
);

CREATE TABLE IF NOT EXISTS "plane" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
);
```

Lastly, a `Rule` can be used to introduce a logical constraint:

```
Rule: <constraint>
```

See the **Constraints** subsection below for the accepted grammar. Rules may affect the schema, and Pine may also generate _validation queries_ for rules.

## Attributes

Attributes are statements following `Vocabulary`, `Term`, `Fact Type`, and `Rule` declarations. They always refer to the last toplevel declaration.

### Concept Type

The `Concept Type` attribute defines the underlying type of a `Term` or a `Fact Type` with a `Term Form` (see the **Term Form** attribute). This attribute has two slightly different interpretations depending on whether it refers to a _primitive_ term or not. See [sbvr-types/Type.sbvr](https://github.com/balena-io-modules/sbvr-types/blob/master/Type.sbvr) for a list of the primitive terms.

If the concept type *is not* a primitive term, that concept type implies an `n:1` relationship:

```
Term: pilot
Term: airline pilot
    Concept Type: pilot
```

generates:

```sql
CREATE TABLE IF NOT EXISTS "pilot" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "airline pilot" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       "pilot" INTEGER NOT NULL
,       FOREIGN KEY ("pilot") REFERENCES "pilot" ("id")
);
```

In this case, the `Concept Type` is functionally identical to a fact type with the following necessity:

```
Fact Type: airline pilot has pilot
    Necessity: each airline pilot has exactly one pilot
```

In case the concept type *is* a primitive term, semantics change. Terms with primitive concept types are not valid unless linked, through a `Fact Type`, with a term that *does not* have a primitive `Concept Type`. Terms with primitive concept types cannot be used as the first term in an unary or binary `Fact Type`, and they gain set semantics: two instances of such a term can only be different if their value is different. These differences allow those terms to be inlined as columns.

The following example generates an `airport` table with a `IATA code` text field:

```
Term: airport
Term: IATA code
    Concept Type: Text (Type)

Fact Type: airport has IATA code
    Necessity: each airport has exactly one IATA code
```

### Database Table Name

The `Database Table Name` defines the name of the database table.

### Necessity

Necessities are shortcut for rules that begin with `It is necessary that ...`. In the following example, the `Necessity` and the `Rule` are equivalent:

```
Term: pilot
Term: plane

Fact Type: pilot can fly plane
    Necessity: each pilot can fly at least one plane

Rule: It is necessary that each pilot can fly at least one plane
```

### Note

A `Note` is a simple uninterpreted comment:

```
Term: pilot
    Note: this is an arbitrary comment referring to the term 'pilot'
```

### Synonymous Form

The `Synonymous Form` attribute introduces an alternative syntax for a `Fact Type`. As a special case, binary fact types using the `has` verb in the form:

```
Fact Type: <term-1> has <term-2>
```

will automatically have an `is of` synonymous form:

```
Synonymous Form: <term-2> is of <term-1>
```

Notice that the order of terms is switched in the synonymous form.

### Term Form

For fact types, the `Term Form` attribute introduces a term alias for the fact type. This means we can refer to the fact type anywhere a term is accepted. For example:

```
Term: plane
Term: airport
Term: IATA code
    Concept Type: Text (Type)

Fact Type: airport has IATA code
    Term Form: registered airport

Fact Type: plane can land in registered airport
```

 This attribute treats the `airport has IATA code` join table as the table for the `registered airport` term.

```sql
CREATE TABLE IF NOT EXISTS "plane" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "airport" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
);

CREATE TABLE IF NOT EXISTS "airport-has-IATA code" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "airport" INTEGER NOT NULL
,       "IATA code" TEXT NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       FOREIGN KEY ("airport") REFERENCES "airport" ("id")
,       UNIQUE("airport", "IATA code")
);

CREATE TABLE IF NOT EXISTS "plane-can land in-registered airport" (
        "created at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
,       "plane" INTEGER NOT NULL
,       "can land in-registered airport" INTEGER NOT NULL
,       "id" SERIAL NOT NULL PRIMARY KEY
,       FOREIGN KEY ("plane") REFERENCES "plane" ("id")
,       FOREIGN KEY ("can land in-registered airport") REFERENCES "airport-has-IATA code" ("id")
,       UNIQUE("plane", "can land in-registered airport")
);
```

Note that since `IATA code` has a primitive concept type, it is inlined into the join table.

## Constraints

Constraints are english statements interpreted as statements in modal first order logic. Pine accepts two modalities: _alethic_ and _deontic_. The alethic modality is used to state that something _must_ be true and violations are not expected at all. The deontic modality, on the other hand, states that something _should_ be true, but constraint violations are not fatal and potentially recoverable.

To start an alethic statement use `It is necessary that`, followed by the first order constraint. Deontic statements start with `It is obligatory that` instead. Pine also understands the following variations:

| Variation | Equivalent to |
| --- | --- |
| `It is impossible that` | It is necessary that not |
| `It is not possible that` | It is necessary that not |
| `It is possible that` | It is not necessary that not |
| `It is prohibited that` | It is obligatory that not |
| `It is forbidden that` | It is obligatory that not |
| `It is permitted that` | It is not obligatory that not |

Currently Pine parses all modalities as necessities, and then creates deontic _validation checks_ for constraints that can't be represented by the underlying schema.

First order constraints are composed of four components: _variables_, _quantifiers_, _predicates_ and _logical connectives_. Variables must be introduced through quantifiers, of which there are three classes:

| Class | SBVR |
| --- | --- |
| Universal | `each` |
| Existential | `some`, `a`, `an`, and `no` |
| Counting | `at most n`, `at least n`, `exactly n`, `more than n` |

where `n` is a number. The word `one` is also understood in place of `1`.

Variables are either terms themselves, or a term followed by a number. Term from other vocabularies have that number attached to the closing parenthesis.

Predicates are fact types. That is, predicates assert a property of a term (in case of a unary fact type), or a relation between two terms (in case of a binary fact type). As a special case, predicates on terms with primitive concept types are translated into the underlying comparison operator (see [sbvr-types/Type.sbvr](https://github.com/balena-io-modules/sbvr-types/blob/master/Type.sbvr) for the fact types of each).

In the following example the fact type is constrained in such a way as to denote a `1:1` relation instead of the default `n:n`:

```
Term: airport
Term: IATA code
    Concept Type: Text (Type)

Fact Type: airport has IATA code
    Necessity: each airport has exactly one IATA code
    Necessity: each IATA code is of exactly one airport
```

Within Pine, `that` is a keyword that chains the last term with the following verb. For instance, given:

```
Term: pilot
Term: plane
Term: airport

Fact Type: pilot can fly plane
    Necessity: each pilot can fly at least one plane

Fact Type: plane is at airport
    Necessity: each plane is at at most one airport
```

If we want a rule that states that a pilot can fly an airplane if that specific airplane is at an airport, we can use `that`:

```
Rule: It is necessary that each pilot can fly an airplane that is at an aiport
```

Lastly, logical connectives connect predicates or parts of predicates. Take the following example as a base:

```
Term: foo

Term: bar
    Concept Type: Integer (Type)

Fact Type: foo has bar
    Necessity: each foo has exactly one bar

Rule: It is necessary that each foo has a bar that is equal to 10
```

The `or` connective can be used to expand the list of values `bar` can be equal to:

```
Rule: It is necessary that each foo has a bar that is equal to 10 or 20 or 35
```

The same connective can be used to alternate predicates:

```
Rule: It is necessary that each foo has a bar that is equal to 10 or 20 or is greater than 35
```

The same applies for the `and` connective. Aditionally, `not` can be prepended to verbs:

```
Rule: It is necessary that each foo has a bar that is not equal to 10 or 20 or is greater than 35
```

**TODO: associativity***
