import Datastore from 'nedb';

export const db = new Datastore({
    filename: './db/database.db',
    autoload: true,
});
