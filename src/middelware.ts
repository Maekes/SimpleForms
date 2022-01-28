import fs from 'fs';
import basicAuth from 'express-basic-auth';
import { db } from './database';
import * as Templates from './templates';
import yaml from 'js-yaml';
import moment from 'moment-timezone';

export const checkLimits = (req, res, next) => {
    let formname = req.params.formname;
    let data = res.locals.formdata;
    db.count({ formname }, (err, count) => {
        if (err) {
            res.render('form-error', {
                error: `Es ist leider ein Fehler aufgetreten. Bitte versuchen Sie es später nochmal. \n ${
                    !process.env.NODE_ENV ? err.message : ''
                }`,
            });
        } else {
            moment().tz('Europe/Berlin');

            if (
                count >= data?.accessible?.limit ||
                moment(data?.accessible?.to, 'DD.MM.YYYY HH:mm').isBefore() ||
                moment(data?.accessible?.from, 'DD.MM.YYYY HH:mm').isAfter()
            ) {
                res.render('form-error', {
                    data,
                    error: data.accessible.message,
                });
            } else {
                next();
            }
        }
    });
};

export const checkIfExists = async (req, res, next) => {
    res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.set('Expires', '0');
    res.set('Pragma', 'no-cache');
    // Get document, or throw exception on error
    try {
        const formname = req.params.formname;
        let data = yaml.load(
            fs.readFileSync(`./config/${formname}.yaml`, 'utf8')
        );
        res.locals.formname = formname;

        // Replace Templates
        data.fields.forEach((field, index) => {
            if (field.template) {
                if (!Array.isArray(Templates[field.template])) {
                    data.fields[index] = Object.assign(
                        {},
                        Templates[field.template],
                        data.fields[index]
                    );
                    delete data.fields[index]['template'];
                } else {
                    data.fields[index] = Templates[field.template].map(
                        (template) => {
                            return Object.assign(
                                {},
                                template,
                                data.fields[index]
                            );
                        }
                    );
                }
            }
        });
        data.fields = data.fields.flat();
        res.locals.formdata = data;
        next();
    } catch (error) {
        res.render('form-error', {
            error: `Das Formular konnte leider nicht gefunden werden. \n ${
                !process.env.NODE_ENV ? error : ''
            }`,
        });
    }
};

export const auth = (req, res, next) => {
    const auth = {
        login: res.locals.formdata.username,
        password: res.locals.formdata.password,
    };

    // parse login and password from headers
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [login, password] = Buffer.from(b64auth, 'base64')
        .toString()
        .split(':');

    // Verify login and password are set and correct
    if (
        (!auth.login && !auth.password) ||
        (basicAuth.safeCompare(login, auth.login) &&
            basicAuth.safeCompare(password, auth.password))
    ) {
        // Access granted...
        return next();
    }

    // Access denied...
    res.set('WWW-Authenticate', `Basic realm="${res.locals.formname}"`); // change this
    res.status(401).send('Bitte einloggen.'); // custom message

    // -----------------------------------------------------------------------
};

// Make shure that only Data from the Configuration gets stored in the Database
export const filterForDatabase = (req, res, next) => {
    let dataForDatabase = {
        formname: null,
        timestamp: Date.now(),
    };

    res.locals.formdata.fields.map((field) => {
        // Change format if input was date
        if (field.type == 'date' && req.body[field.name]) {
            let numbers = req.body[field.name].split('-');
            if (numbers.length == 3)
                req.body[
                    field.name
                ] = `${numbers[2]}.${numbers[1]}.${numbers[0]}`;
        }
        dataForDatabase[field.name] = req.body[field.name] || '';
    });
    dataForDatabase.formname = req.params.formname;
    res.locals.dataForDatabase = dataForDatabase;
    next();
};

export const handleVariables = (req, res, next) => {
    findVariableAndReplace(res.locals.formdata, res.locals.dataForDatabase);
    next();
};

export const findVariableAndReplace = (obj, dataForDatabase) => {
    for (const [key, value] of Object.entries(obj)) {
        if (
            typeof value === 'object' &&
            (value !== null || undefined) &&
            key !== 'fields'
        ) {
            findVariableAndReplace(value, dataForDatabase);
        } else if (typeof value === 'string') {
            replace(obj, key, dataForDatabase);
        }
    }
};

// Replace Variable with the appropriate Value from dataForDatabase.
// If no Value for the Variable was found,
// the Variable will be replaced with en empty String.
const replace = (obj, key, dataForDatabase) => {
    let regex = /\$\{.*?\}/g; // f.e. ${EMail}
    [...obj[key].matchAll(regex)].forEach((variableTemplate) => {
        var variable = variableTemplate[0].substring(
            2,
            variableTemplate[0].length - 1
        );
        obj[key] = obj[key].replace(
            variableTemplate,
            dataForDatabase[variable] || ''
        );
    });
};
