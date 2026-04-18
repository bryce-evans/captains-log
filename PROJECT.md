# Project Definition

## Motivation

a mobile app for making creating records of events very quickly with hands free. Using voice and claude, we can answer quesitons. This is useful for taking record of fish catches while on a boat, or selling items at an art show. Records can have an optional photo(s) attached, but the most important thing is using voice to create records. and voice to answer questions about past records


## Goals

hands free creation of records
allow attaching photos to events
have a defined schema of all possible items to record
allow for switching between schemas
show the user a live view of items remaining in the record, and as they talk, check them off so they see which ones are remaining
in the schema, mark items as important. put them at the top and double check at the end to confirm with the user it is okay if they are empty.
have a set of certain fields be special to be auto-filled in, such as current time, current gps location, current weather at location
store records on device and have coie to answer questions such as "last time I recorded X?" or "biggest fish I caught?" "how many perch did I catch?"
optional cloud backup, but this is past MVP for a later stage of the poject.
optional login and billing for subscription, at a later stage past mvp
a nice ui that has a way to view all records and view data in a book-like ui


## Success Criteria

user can define a new schema, edit an existing schema, select important comments
user can create a record with voice. the main point of the app is to add a record. We have a set active schema, and a big button to create records. all fields show ina  list, and as the user speaks, live translation answers the fields and they get filled in. filled ones go to the bottom of the list, and remaining ones sit at the top. 
user can view their records in albums
auto fields like weather, lat long, time of day can be set 
schemas are mostly text but can be numbers like temp. these are validated so we can't set them to invalid data. or a warning shows if we dont. because of how answers need to wrok, we can't save data that is invalid to the schema (we can't store "ABC" as the "temperature." it will mess up Q&A feature
user can go to query mode and ask questions about their records


## Priorities

MVP should just be select from two existing scheumas that are predefined
use voice to add records. allow anything to be blank. say "done" to be done.
view records
enter query mode to ask questions. claude should make SQL commands to the db to answer them
eerything is local, no login, billing, or cloud required for mvp


## Resources Allowed

_TODO_


## Resources Off Limits

_TODO_


## Final Result

_TODO_

